/**
 * @deprecated System II (Client-Side Passphrase E2EE) — SCHEDULED FOR RETIREMENT
 *
 * This module is superseded by System III (lib/e2ee/) which implements the Signal Protocol
 * with proper forward secrecy. Do NOT build new features on top of this module.
 *
 * Retirement plan: see docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md
 * Tracking: see docs/security/application-security.md finding L-3
 *
 * Original description:
 * E2EE Crypto Library — per-org OMK (Organization Master Key) wrapped by per-user KEK.
 */

// Constants
export {
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
  IV_LENGTH,
  KEY_LENGTH,
  AUTH_TAG_LENGTH,
  KEY_WRAP_ALGORITHM,
  ENCRYPTED_PREFIX,
} from "./constants";

// Key Derivation
export {
  generateSalt,
  deriveKEK,
  validatePassphrase,
  saltToBase64,
  base64ToSalt,
} from "./key-derivation";

// Key Wrapping
export {
  generateOMK,
  exportOMK,
  importOMK,
  wrapKey,
  unwrapKey,
  verifyPassphrase,
} from "./key-wrapping";

// Field Encryption
export {
  encryptField,
  decryptField,
  encryptJSON,
  decryptJSON,
  isEncrypted,
  encryptFields,
  decryptFields,
  encryptBatch,
  decryptBatch,
} from "./encryption";

// Model-specific Field Handlers
export {
  encryptClientFields,
  decryptClientFields,
  encryptClientContactFields,
  decryptClientContactFields,
  encryptPropertyFields,
  decryptPropertyFields,
  encryptPropertyContactFields,
  decryptPropertyContactFields,
  encryptCalendarEventFields,
  decryptCalendarEventFields,
  encryptMessageFields,
  decryptMessageFields,
  encryptDealFields,
  decryptDealFields,
  encryptCommentFields,
  decryptCommentFields,
  encryptClientsBatch,
  decryptClientsBatch,
  encryptPropertiesBatch,
  decryptPropertiesBatch,
  hasEncryptedFields,
  getEncryptedFieldNames,
} from "./field-handlers";
