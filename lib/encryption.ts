/**
 * lib/encryption.ts
 *
 * AES-256-GCM symmetric encryption for field-level database encryption.
 * Requires SECRETS_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * - iv: 12 bytes → 24 hex chars (NIST recommended; legacy data may have 16 bytes → 32 hex)
 * - authTag: 16 bytes → 32 hex chars
 * - ciphertext: variable length hex
 *
 * Usage:
 *   encrypt("hello")  // → "a1b2...32chars:c3d4...32chars:e5f6..."
 *   decrypt("a1b2...") // → "hello"
 *   isEncrypted("a1b2...") // → true
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
// M-1: Standardized to 12 bytes per NIST SP 800-38D recommendation for AES-GCM.
// 96-bit IVs are used directly as the counter block (no GHASH pre-processing).
// Old ciphertext with 16-byte IVs (32 hex chars) remains decryptable — isEncrypted()
// accepts both 24-char (12-byte) and 32-char (16-byte) IV hex strings.
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "[encryption] SECRETS_ENCRYPTION_KEY is not set. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      `[encryption] SECRETS_ENCRYPTION_KEY must be 64 hex chars (32 bytes), got ${hex.length}`
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * M-2: Empty strings are now encrypted (previously returned as-is, leaking metadata).
 * Use null for "field not set" — encrypted "" means "intentionally empty."
 * Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext: string): string {

  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value encrypted by encrypt().
 * If the value is not in encrypted format, returns it as-is with a console warning.
 */
export function decrypt(encrypted: string): string {
  if (!isEncrypted(encrypted)) {
    if (encrypted !== "") {
      console.warn("[encryption] decrypt() called on non-encrypted value, returning as-is");
    }
    return encrypted;
  }

  const key = getKey();
  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = Buffer.from(parts[2], "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// M-4: Hex character validation regex (compiled once, reused per call)
const HEX_RE = /^[0-9a-f]+$/;

/**
 * Returns true if the value looks like an encrypted string produced by encrypt().
 * Checks: 3 colon-separated parts, iv = valid hex of 24 or 32 chars, authTag = 32 hex chars.
 *
 * M-1: Accepts both 12-byte (24 hex) and 16-byte (32 hex) IVs for backward compatibility.
 * M-4: Validates hex characters on iv and authTag to prevent false-positives on plaintext
 *       that coincidentally matches the length heuristic.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const ivLen = parts[0].length;
  // 24 hex = 12-byte IV (new), 32 hex = 16-byte IV (legacy)
  if (ivLen !== 24 && ivLen !== 32) return false;
  if (parts[1].length !== 32) return false;
  return HEX_RE.test(parts[0]) && HEX_RE.test(parts[1]);
}

// ─── Per-org DEK variants ───────────────────────────────────────────────────
// These accept an explicit key Buffer (the org DEK) instead of the global env var.

/**
 * Encrypt a plaintext string using an explicit AES-256-GCM key buffer (org DEK).
 * M-2: Empty strings are now encrypted (see encrypt() comment).
 * Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptWithKey(plaintext: string, key: Buffer): string {

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value encrypted by encryptWithKey().
 * If AES-GCM authentication fails (wrong key), falls back to the master-key decrypt().
 * This fallback handles data encrypted before the per-org DEK migration.
 */
export function decryptWithKey(encrypted: string, key: Buffer): string {
  if (!isEncrypted(encrypted)) {
    if (encrypted !== "") {
      console.warn("[encryption] decryptWithKey() called on non-encrypted value, returning as-is");
    }
    return encrypted;
  }

  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = Buffer.from(parts[2], "hex");

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    // Auth tag mismatch — data was likely encrypted with the master key (pre-DEK migration).
    if (process.env.DISABLE_MASTER_KEY_FALLBACK === "true") {
      throw err;
    }
    console.warn("[encryption] DEK decryption failed, falling back to master key", {
      error: err instanceof Error ? err.message : String(err),
    });
    return decrypt(encrypted);
  }
}

/**
 * Attempt decryption with a prioritized list of DEK candidates, then fall back to master key.
 *
 * Key order: active DEK first, then previous versions (newest → oldest), then master key.
 * The first key that produces a valid AES-GCM authentication tag wins.
 *
 * This handles:
 *   - Data encrypted with a previous DEK version (after key rotation)
 *   - Data encrypted with the master key (pre-DEK migration)
 *   - Data encrypted with a DEK from a different SECRETS_ENCRYPTION_KEY environment
 *     (last resort: master key fallback still tries current env key)
 *
 * @param encrypted  Ciphertext in "iv:authTag:ct" hex format
 * @param keys       Candidate DEKs to try, in priority order (active first)
 */
export function decryptWithKeys(encrypted: string, keys: Buffer[]): string {
  if (!isEncrypted(encrypted)) {
    if (encrypted !== "") {
      console.warn("[encryption] decryptWithKeys() called on non-encrypted value, returning as-is");
    }
    return encrypted;
  }

  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = Buffer.from(parts[2], "hex");

  for (const key of keys) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    } catch {
      // Auth tag mismatch — try next key
    }
  }

  // All DEK candidates exhausted — fall back to master key (handles pre-DEK migration data)
  if (process.env.DISABLE_MASTER_KEY_FALLBACK === "true") {
    throw new Error("[encryption] decryptWithKeys: all DEK candidates failed and master key fallback is disabled");
  }
  return decrypt(encrypted);
}
