"use client";

const ECDH_PARAMS = { name: "ECDH", namedCurve: "P-256" } as const;
const AES_GCM = "AES-GCM" as const;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;

// ─── Random ────────────────────────────────

export function generateRandomBytes(length: number): ArrayBuffer {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf.buffer;
}

// ─── ECDH Key Pairs ────────────────────────

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveBits"]);
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
}

// ─── AES-256-GCM ──────────────────────────

export async function aesGcmEncrypt(
  plaintext: ArrayBuffer,
  rawKey: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  const iv = generateRandomBytes(IV_BYTES);
  const key = await crypto.subtle.importKey("raw", rawKey, AES_GCM, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: AES_GCM, iv }, key, plaintext);
  return { ciphertext, iv };
}

export async function aesGcmDecrypt(
  ciphertext: ArrayBuffer,
  rawKey: ArrayBuffer,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", rawKey, AES_GCM, false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: AES_GCM, iv }, key, ciphertext);
}

// ─── HKDF ──────────────────────────────────

export async function hkdfDerive(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: ArrayBuffer,
  length: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
}

// ─── HMAC-SHA256 ───────────────────────────

export async function hmacSign(
  rawKey: ArrayBuffer,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, data);
}

// ─── SHA-256 ───────────────────────────────

export async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

// ─── Key Export / Import ───────────────────

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", key);
  return bufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("spki", raw, ECDH_PARAMS, true, []);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(raw);
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("pkcs8", raw, ECDH_PARAMS, true, ["deriveBits"]);
}

// ─── PIN + Pepper Key Derivation ───────────

export async function deriveKEKFromPIN(
  pin: string,
  salt: ArrayBuffer,
  pepper: ArrayBuffer
): Promise<CryptoKey> {
  const pinBytes = new TextEncoder().encode(pin);
  const combinedSalt = concatBuffers(salt, pepper);
  const baseKey = await crypto.subtle.importKey("raw", pinBytes, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: combinedSalt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: AES_GCM, length: 256 },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

export async function wrapPrivateKey(
  privateKey: CryptoKey,
  pin: string,
  pepper: ArrayBuffer
): Promise<{ wrappedKey: string; salt: string }> {
  const salt = generateRandomBytes(16);
  const kek = await deriveKEKFromPIN(pin, salt, pepper);
  const iv = generateRandomBytes(IV_BYTES);
  const wrapped = await crypto.subtle.wrapKey("pkcs8", privateKey, kek, { name: AES_GCM, iv });
  // Prepend IV to wrapped key for storage
  const combined = concatBuffers(iv, wrapped);
  return { wrappedKey: bufferToBase64(combined), salt: bufferToBase64(salt) };
}

export async function unwrapPrivateKey(
  wrappedKeyBase64: string,
  pin: string,
  pepper: ArrayBuffer,
  saltBase64: string
): Promise<CryptoKey> {
  const combined = base64ToBuffer(wrappedKeyBase64);
  const iv = combined.slice(0, IV_BYTES);
  const wrappedKey = combined.slice(IV_BYTES);
  const salt = base64ToBuffer(saltBase64);
  const kek = await deriveKEKFromPIN(pin, salt, pepper);
  return crypto.subtle.unwrapKey(
    "pkcs8", wrappedKey, kek,
    { name: AES_GCM, iv },
    ECDH_PARAMS,
    true,
    ["deriveBits"]
  );
}

// ─── Buffer Utilities ──────────────────────

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}
