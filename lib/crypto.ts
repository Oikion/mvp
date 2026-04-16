/**
 * lib/crypto.ts
 *
 * Browser-safe Web Crypto API helpers for passphrase-based field encryption.
 *
 * Key hierarchy:
 *   passphrase ──PBKDF2──► KEK (AES-KW 256)
 *   KEK ──unwrap──► OMK (AES-GCM 256, the actual encryption key)
 *   OMK ──encrypt/decrypt──► individual field values
 *
 * All functions are async and safe to call in both browser and Node 20+ environments
 * (Node 20 ships a global `crypto` matching the W3C SubtleCrypto API).
 *
 * Ciphertext format (string):  base64url(iv) + "." + base64url(ciphertext)
 * Encrypted marker prefix:     "enc:v1:"
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const ENC_PREFIX = "enc:v1:";
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const SALT_LENGTH = 16; // bytes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function b64uEncode(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf)).map(b => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64uDecode(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}

// ─── Salt helpers ────────────────────────────────────────────────────────────

/**
 * Generate a random 16-byte salt and return as base64 string for storage.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return btoa(Array.from(salt, (b) => String.fromCodePoint(b)).join(""));
}

/**
 * Convert a base64-encoded salt string back to a Uint8Array for use in PBKDF2.
 */
export function base64ToSalt(b64: string): Uint8Array {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}

// ─── KEK derivation ──────────────────────────────────────────────────────────

/**
 * Derive a Key Encryption Key (KEK) from a passphrase using PBKDF2.
 * The KEK is used to wrap/unwrap the OMK — it never encrypts data directly.
 */
export async function deriveKEK(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

// ─── Key wrapping ────────────────────────────────────────────────────────────

/**
 * Wrap a CryptoKey with the KEK using AES-KW.
 * Returns the wrapped key as a base64 string suitable for server-side storage.
 */
export async function wrapKey(omk: CryptoKey, kek: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey("raw", omk, kek, "AES-KW");
  return btoa(Array.from(new Uint8Array(wrapped), (b) => String.fromCodePoint(b)).join(""));
}

/**
 * Unwrap an AES-KW-wrapped key using the KEK.
 * The `wrappedKey` parameter is the base64 string produced by `wrapKey`.
 */
export async function unwrapKey(wrappedKeyB64: string, kek: CryptoKey): Promise<CryptoKey> {
  const binary = atob(wrappedKeyB64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.unwrapKey(
    "raw",
    buf,
    kek,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a fresh 256-bit AES-GCM key (the OMK).
 */
export async function generateOMK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

// ─── Field encryption ────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with the OMK.
 * Returns a prefixed, self-describing ciphertext string.
 * Format: "enc:v1:<base64url(iv)>.<base64url(ciphertext)>"
 */
export async function encryptField(plaintext: string, omk: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, omk, enc.encode(plaintext));
  return `${ENC_PREFIX}${b64uEncode(iv.buffer as ArrayBuffer)}.${b64uEncode(ct)}`;
}

/**
 * Decrypt a ciphertext string encrypted by `encryptField`.
 * Throws if the format is unexpected or decryption fails.
 */
export async function decryptField(ciphertext: string, omk: CryptoKey): Promise<string> {
  if (!ciphertext.startsWith(ENC_PREFIX)) {
    throw new Error("[crypto] Not a valid encrypted field value");
  }
  const payload = ciphertext.slice(ENC_PREFIX.length);
  const dotIdx = payload.indexOf(".");
  if (dotIdx === -1) throw new Error("[crypto] Malformed ciphertext: missing separator");

  const iv = b64uDecode(payload.slice(0, dotIdx));
  const ct = b64uDecode(payload.slice(dotIdx + 1));

  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, omk, ct);
  return new TextDecoder().decode(plainBuf);
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

/**
 * Encrypt any JSON-serializable value with the OMK.
 */
export async function encryptJSON<T>(value: T, omk: CryptoKey): Promise<string> {
  return encryptField(JSON.stringify(value), omk);
}

/**
 * Decrypt a JSON value encrypted by `encryptJSON`.
 */
export async function decryptJSON<T>(ciphertext: string, omk: CryptoKey): Promise<T> {
  const json = await decryptField(ciphertext, omk);
  return JSON.parse(json) as T;
}

// ─── Detection ───────────────────────────────────────────────────────────────

/**
 * Returns true if the value looks like a field encrypted by this module.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(ENC_PREFIX);
}
