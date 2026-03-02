/**
 * E2EE Cryptographic Constants
 * 
 * These values follow NIST and OWASP recommendations for secure encryption.
 */

// PBKDF2 Key Derivation
export const PBKDF2_ITERATIONS = 100_000; // OWASP recommends 100k+ for PBKDF2-SHA256
export const SALT_LENGTH = 16; // 128 bits

// AES-GCM Encryption
export const IV_LENGTH = 12; // 96 bits (recommended for AES-GCM)
export const KEY_LENGTH = 256; // AES-256
export const AUTH_TAG_LENGTH = 128; // 128 bits (default for AES-GCM)

// Key wrapping algorithm
export const KEY_WRAP_ALGORITHM = "AES-GCM"; // Using AES-GCM for key wrapping (more flexible than AES-KW)

// Encoding
export const ENCRYPTED_PREFIX = "e2ee:v1:"; // Prefix to identify encrypted fields
