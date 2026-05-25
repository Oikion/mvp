"use client";

/**
 * lib/e2ee/recovery.ts
 *
 * Client-side helpers for E2EE organization recovery code setup and verification.
 *
 * Recovery flow overview:
 *   1. Admin generates a random Organization Recovery Key (ORK).
 *   2. ORK is wrapped with admin's PIN-derived KEK (AES-KW) → stored on server.
 *   3. 8 single-use recovery codes are generated. Each code independently wraps
 *      the ORK via PBKDF2(code, perCodeSalt) → AES-KW. Stored on server.
 *   4. To recover: user supplies a code → server finds matching record by SHA-256
 *      hash → returns wrappedOrk + salt → client PBKDF2-derives KEK → unwraps ORK.
 *
 * Security note on codeHash:
 *   We store SHA-256(code) as a lookup index so the server can find the right
 *   RecoveryCode row without iterating all rows. SHA-256 alone is NOT a password
 *   hash (no salt, very fast). The real security guarantee is that an attacker who
 *   steals codeHash still cannot recover the ORK without also breaking the AES-KW
 *   wrapping, which is keyed from PBKDF2(code, salt, 600k iterations). The SHA-256
 *   is only a search key — never used as an encryption key.
 */

import {
  generateRandomBytes,
  bufferToBase64,
  base64ToBuffer,
  PBKDF2_ITERATIONS,
} from "./primitives";

// ─── ORK Generation ───────────────────────────

/**
 * Generate a random 32-byte Organization Recovery Key (ORK).
 * The ORK is the root key for the organization; it is never stored in plaintext —
 * only AES-KW-wrapped copies (one per recovery code, one for the admin) are persisted.
 */
export async function generateOrgRecoveryKey(): Promise<Uint8Array> {
  const raw = generateRandomBytes(32);
  return new Uint8Array(raw);
}

// ─── Recovery Code Generation ────────────────

/**
 * Format a 20-byte buffer as a human-readable recovery code.
 * Produces 8 groups of 5 base64url characters separated by dashes, e.g.:
 *   "abcde-fghij-klmno-pqrst-uvwxy-z0123-45678-9ABCD"
 *
 * Base64url alphabet (A-Z, a-z, 0-9, -, _) maps cleanly to 20 bytes = 160 bits.
 * Groups of 5 chars (30 bits per group) make codes easy to transcribe by hand.
 */
function formatCode(bytes: Uint8Array): string {
  // Convert to base64url
  const raw = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Split into groups of 5
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += 5) {
    groups.push(raw.slice(i, i + 5));
  }
  return groups.join("-");
}

/**
 * Generate `count` random recovery codes as URL-safe base64 strings.
 * Each code is 20 random bytes (~160 bits of entropy) displayed in 5-char groups.
 *
 * Default: 8 codes (matches the schema's 8-code design).
 */
export async function generateRecoveryCodes(count: number = 8): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = new Uint8Array(generateRandomBytes(20));
    codes.push(formatCode(raw));
  }
  return codes;
}

// ─── Per-Code PBKDF2 KEK Derivation ──────────

/**
 * Derive an AES-KW-256 KEK from a recovery code using PBKDF2.
 * Uses 600k iterations (matching PIN derivation strength in primitives.ts).
 *
 * Note: Recovery codes have ~160 bits of entropy so PBKDF2 here is an extra
 * hardening layer rather than a brute-force barrier — still worth doing to
 * maintain the same key-derivation discipline as PIN unlock.
 */
async function deriveKEKFromCode(
  code: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const codeBytes = new TextEncoder().encode(code);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    codeBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

// ─── SHA-256 Code Hash (server lookup index) ──

/**
 * Compute SHA-256(code) as a hex string.
 * Used as an efficient server-side lookup index so the server can find the
 * matching RecoveryCode row without scanning all rows or doing bcrypt per row.
 *
 * IMPORTANT: This is NOT a password hash — it is an unsalted search key.
 * Security comes from the PBKDF2-wrapped ORK, not from this hash.
 */
async function sha256Hex(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── ORK Wrapping Helpers ─────────────────────

/**
 * Import a raw 32-byte ORK as an AES-KW-extractable key so it can be
 * wrapped with wrapKey("raw", ...).
 */
async function importOrkAsKey(ork: Uint8Array): Promise<CryptoKey> {
  // Cast to ArrayBuffer to satisfy strict SubtleCrypto BufferSource overloads.
  // ork is always produced by generateRandomBytes() (which returns ArrayBuffer)
  // or new Uint8Array(ArrayBuffer), so the underlying buffer is a plain ArrayBuffer.
  return crypto.subtle.importKey(
    "raw",
    ork.buffer as ArrayBuffer,
    { name: "AES-KW", length: 256 },
    true,          // extractable — needed so AES-KW can wrap it
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * Wrap the ORK with a KEK derived from a recovery code via PBKDF2.
 *
 * Returns:
 *   - salt:      base64-encoded per-code PBKDF2 salt (store on server)
 *   - wrappedOrk: base64-encoded AES-KW wrapped ORK (store on server)
 *   - codeHash:  SHA-256 hex of the plaintext code (server lookup index)
 */
export async function wrapOrkWithCode(
  ork: Uint8Array,
  code: string
): Promise<{ salt: string; wrappedOrk: string; codeHash: string }> {
  const saltBuf = generateRandomBytes(16);
  const kek = await deriveKEKFromCode(code, saltBuf);
  const orkKey = await importOrkAsKey(ork);

  const wrappedBuf = await crypto.subtle.wrapKey("raw", orkKey, kek, "AES-KW");

  return {
    salt: bufferToBase64(saltBuf),
    wrappedOrk: bufferToBase64(wrappedBuf),
    codeHash: await sha256Hex(code),
  };
}

/**
 * Wrap the ORK with the admin's existing PIN-derived KEK (CryptoKey, AES-KW).
 * The admin's wrapped copy allows the admin to unwrap the ORK at any time
 * using their PIN (without spending a recovery code).
 *
 * Returns:
 *   - wrappedOrk: base64-encoded AES-KW wrapped ORK
 *
 * Note: The admin's KEK salt is already stored in UserIdentityKey.salt on the server;
 * the caller must pass the corresponding `salt` separately to POST /api/e2ee/recovery/setup.
 */
export async function wrapOrkWithKek(
  ork: Uint8Array,
  kek: CryptoKey
): Promise<{ wrappedOrk: string }> {
  const orkKey = await importOrkAsKey(ork);
  const wrappedBuf = await crypto.subtle.wrapKey("raw", orkKey, kek, "AES-KW");
  return { wrappedOrk: bufferToBase64(wrappedBuf) };
}

// ─── ORK Recovery (verify path) ──────────────

/**
 * Recover the ORK from a recovery code and the stored salt + wrappedOrk.
 *
 * Returns the raw ORK bytes on success, or null if the code is invalid
 * (wrong key material → AES-KW unwrapKey will throw; we catch and return null).
 *
 * The returned ORK can then be used to unwrap per-entity DEKs for the org.
 */
export async function unwrapOrkWithCode(
  code: string,
  salt: string,
  wrappedOrk: string
): Promise<Uint8Array | null> {
  try {
    const saltBuf = base64ToBuffer(salt);
    const kek = await deriveKEKFromCode(code, saltBuf);

    const wrappedBuf = base64ToBuffer(wrappedOrk);
    const orkKey = await crypto.subtle.unwrapKey(
      "raw",
      wrappedBuf,
      kek,
      "AES-KW",
      { name: "AES-KW", length: 256 },
      true,
      ["wrapKey", "unwrapKey"]
    );

    const raw = await crypto.subtle.exportKey("raw", orkKey);
    return new Uint8Array(raw);
  } catch {
    // Wrong code → AES-KW authentication tag mismatch → DOMException
    return null;
  }
}
