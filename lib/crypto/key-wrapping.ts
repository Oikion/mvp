/**
 * Key Wrapping Functions for E2EE
 * 
 * Handles generation, wrapping, and unwrapping of the Organization Master Key (OMK).
 * The OMK is wrapped (encrypted) with each user's Key Encryption Key (KEK).
 */

import { KEY_LENGTH, IV_LENGTH } from "./constants";

/**
 * Generate a new Organization Master Key (OMK)
 * 
 * @returns A new AES-256-GCM key for encrypting organization data
 */
export async function generateOMK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    true, // Extractable - needed for wrapping
    ["encrypt", "decrypt"]
  );
}

/**
 * Export OMK to raw bytes (for wrapping)
 */
export async function exportOMK(omk: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", omk);
}

/**
 * Import raw bytes back to OMK
 */
export async function importOMK(rawKey: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    true, // Extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Wrap (encrypt) the OMK with the user's KEK
 * 
 * Uses AES-GCM for wrapping because:
 * 1. It provides authenticated encryption (integrity + confidentiality)
 * 2. It's more flexible than AES-KW (works with any key size)
 * 
 * @param omk - Organization Master Key to wrap
 * @param kek - Key Encryption Key derived from user's passphrase
 * @returns Base64-encoded wrapped key (IV + ciphertext + auth tag)
 */
export async function wrapKey(
  omk: CryptoKey,
  kek: CryptoKey
): Promise<string> {
  // Export OMK to raw bytes
  const rawOMK = await exportOMK(omk);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt the OMK with the KEK
  const wrappedKey = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    kek,
    rawOMK
  );

  // Combine IV + wrapped key for storage
  const combined = new Uint8Array(iv.length + wrappedKey.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrappedKey), iv.length);

  // Encode as base64 for storage
  return btoa(String.fromCharCode(...Array.from(combined)));
}

/**
 * Unwrap (decrypt) the OMK using the user's KEK
 * 
 * @param wrappedKeyBase64 - Base64-encoded wrapped key from storage
 * @param kek - Key Encryption Key derived from user's passphrase
 * @returns The decrypted Organization Master Key
 * @throws Error if decryption fails (wrong passphrase)
 */
export async function unwrapKey(
  wrappedKeyBase64: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  // Decode from base64
  const combined = Uint8Array.from(atob(wrappedKeyBase64), (c) =>
    c.charCodeAt(0)
  );

  // Extract IV and wrapped key
  const iv = combined.slice(0, IV_LENGTH);
  const wrappedKey = combined.slice(IV_LENGTH);

  // Decrypt the OMK
  const rawOMK = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    kek,
    wrappedKey
  );

  // Import back to CryptoKey
  return importOMK(rawOMK);
}

/**
 * Verify that a passphrase can successfully unwrap the key
 * Used for passphrase validation without exposing the key
 * 
 * @param wrappedKeyBase64 - Base64-encoded wrapped key
 * @param kek - Key Encryption Key to test
 * @returns true if unwrapping succeeds, false otherwise
 */
export async function verifyPassphrase(
  wrappedKeyBase64: string,
  kek: CryptoKey
): Promise<boolean> {
  try {
    await unwrapKey(wrappedKeyBase64, kek);
    return true;
  } catch {
    return false;
  }
}
