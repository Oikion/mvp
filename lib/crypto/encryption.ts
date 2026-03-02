/**
 * Field Encryption Functions for E2EE
 * 
 * Provides encrypt/decrypt functions for individual fields and JSON objects.
 * Uses AES-256-GCM with random IVs for each encryption operation.
 */

import { IV_LENGTH, ENCRYPTED_PREFIX } from "./constants";

/**
 * Encrypt a string field
 * 
 * @param plaintext - The string to encrypt
 * @param omk - Organization Master Key
 * @returns Base64-encoded ciphertext with prefix
 */
export async function encryptField(
  plaintext: string,
  omk: CryptoKey
): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  // Encode plaintext as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    omk,
    data
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return with prefix for identification
  return ENCRYPTED_PREFIX + btoa(String.fromCharCode(...Array.from(combined)));
}

/**
 * Decrypt a string field
 * 
 * @param ciphertext - Base64-encoded ciphertext with prefix
 * @param omk - Organization Master Key
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails
 */
export async function decryptField(
  ciphertext: string,
  omk: CryptoKey
): Promise<string> {
  if (!ciphertext) {
    return ciphertext;
  }

  // Check for encryption prefix
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is (backward compatibility)
    return ciphertext;
  }

  // Remove prefix
  const base64Data = ciphertext.slice(ENCRYPTED_PREFIX.length);

  // Decode from base64
  const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    omk,
    encryptedData
  );

  // Decode from UTF-8
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt a JSON object
 * 
 * @param obj - Object to encrypt
 * @param omk - Organization Master Key
 * @returns Base64-encoded encrypted JSON string
 */
export async function encryptJSON(
  obj: unknown,
  omk: CryptoKey
): Promise<string> {
  if (obj === null || obj === undefined) {
    return obj as unknown as string;
  }

  const jsonString = JSON.stringify(obj);
  return encryptField(jsonString, omk);
}

/**
 * Decrypt a JSON object
 * 
 * @param ciphertext - Encrypted JSON string
 * @param omk - Organization Master Key
 * @returns Decrypted object
 */
export async function decryptJSON<T = unknown>(
  ciphertext: string,
  omk: CryptoKey
): Promise<T> {
  if (!ciphertext) {
    return ciphertext as unknown as T;
  }

  const jsonString = await decryptField(ciphertext, omk);
  return JSON.parse(jsonString) as T;
}

/**
 * Check if a field value is encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt multiple fields in an object
 * 
 * @param obj - Object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @param omk - Organization Master Key
 * @returns New object with specified fields encrypted
 */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  omk: CryptoKey
): Promise<T> {
  const result = { ...obj };

  for (const field of fields) {
    const value = obj[field];
    if (typeof value === "string" && value) {
      result[field] = (await encryptField(value, omk)) as T[keyof T];
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 * 
 * @param obj - Object containing encrypted fields
 * @param fields - Array of field names to decrypt
 * @param omk - Organization Master Key
 * @returns New object with specified fields decrypted
 */
export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  omk: CryptoKey
): Promise<T> {
  const result = { ...obj };

  for (const field of fields) {
    const value = obj[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field] = (await decryptField(value, omk)) as T[keyof T];
    }
  }

  return result;
}

/**
 * Batch encrypt an array of objects
 * 
 * @param objects - Array of objects to encrypt
 * @param fields - Fields to encrypt in each object
 * @param omk - Organization Master Key
 * @returns Array of objects with encrypted fields
 */
export async function encryptBatch<T extends Record<string, unknown>>(
  objects: T[],
  fields: (keyof T)[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(objects.map((obj) => encryptFields(obj, fields, omk)));
}

/**
 * Batch decrypt an array of objects
 * 
 * @param objects - Array of objects with encrypted fields
 * @param fields - Fields to decrypt in each object
 * @param omk - Organization Master Key
 * @returns Array of objects with decrypted fields
 */
export async function decryptBatch<T extends Record<string, unknown>>(
  objects: T[],
  fields: (keyof T)[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(objects.map((obj) => decryptFields(obj, fields, omk)));
}
