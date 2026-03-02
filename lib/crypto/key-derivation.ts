/**
 * Key Derivation Functions for E2EE
 * 
 * Uses PBKDF2 with SHA-256 to derive Key Encryption Keys (KEK) from user passphrases.
 * The KEK is used to wrap/unwrap the Organization Master Key (OMK).
 */

import { PBKDF2_ITERATIONS, SALT_LENGTH, KEY_LENGTH } from "./constants";

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive a Key Encryption Key (KEK) from a passphrase using PBKDF2
 * 
 * @param passphrase - User's passphrase
 * @param salt - Random salt (must be stored alongside wrapped key)
 * @returns CryptoKey suitable for wrapping/unwrapping the OMK
 */
export async function deriveKEK(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Encode passphrase as UTF-8
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // Import passphrase as raw key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive the KEK using PBKDF2-SHA256
  const kek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    false, // Not extractable - can only be used for crypto operations
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"] as KeyUsage[]
  );

  return kek;
}

/**
 * Validate passphrase strength
 * 
 * @param passphrase - Passphrase to validate
 * @returns Object with isValid and error message if invalid
 */
export function validatePassphrase(passphrase: string): {
  isValid: boolean;
  error?: string;
} {
  if (!passphrase || passphrase.length < 12) {
    return {
      isValid: false,
      error: "Passphrase must be at least 12 characters long",
    };
  }

  // Check for at least one uppercase, one lowercase, one number
  const hasUppercase = /[A-Z]/.test(passphrase);
  const hasLowercase = /[a-z]/.test(passphrase);
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^A-Za-z0-9]/.test(passphrase);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return {
      isValid: false,
      error: "Passphrase must contain uppercase, lowercase, and numbers",
    };
  }

  // Recommend special characters but don't require
  const strength = {
    isValid: true,
    hasSpecial,
    length: passphrase.length,
  };

  return strength;
}

/**
 * Convert salt to base64 for storage
 */
export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(salt)));
}

/**
 * Convert base64 back to salt
 */
export function base64ToSalt(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
