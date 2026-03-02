/**
 * lib/encryption.ts
 *
 * AES-256-GCM symmetric encryption for field-level database encryption.
 * Requires SECRETS_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * - iv: 16 bytes → 32 hex chars
 * - authTag: 16 bytes → 32 hex chars
 * - ciphertext: variable length hex
 *
 * Usage:
 *   encrypt("hello")  // → "a1b2...32chars:c3d4...32chars:e5f6..."
 *   decrypt("a1b2...") // → "hello"
 *   isEncrypted("a1b2...") // → true
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 16;
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
 * Returns empty string as-is.
 * Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext: string): string {
  if (plaintext === "") return plaintext;

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

/**
 * Returns true if the value looks like an encrypted string produced by encrypt().
 * Checks: 3 colon-separated parts, iv = 32 hex chars, authTag = 32 hex chars.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  return parts[0].length === 32 && parts[1].length === 32;
}

// ─── Per-org DEK variants ───────────────────────────────────────────────────
// These accept an explicit key Buffer (the org DEK) instead of the global env var.

/**
 * Encrypt a plaintext string using an explicit AES-256-GCM key buffer (org DEK).
 * Returns empty string as-is.
 * Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptWithKey(plaintext: string, key: Buffer): string {
  if (plaintext === "") return plaintext;

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
  } catch {
    // Auth tag mismatch — data was encrypted with master key (pre-migration). Fall back.
    return decrypt(encrypted);
  }
}
