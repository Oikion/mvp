/**
 * E2EE Crypto Library
 * 
 * Provides end-to-end encryption capabilities for tenant data.
 * 
 * Key Hierarchy:
 * - Organization Master Key (OMK): Per-organization, encrypts all org data
 * - Key Encryption Key (KEK): Per-user, derived from passphrase, wraps OMK
 * - Wrapped Key: OMK encrypted with user's KEK, stored in DB
 * 
 * Usage:
 * 1. Admin sets up encryption: generateOMK() + deriveKEK() + wrapKey()
 * 2. Admin grants access: unwrapKey() + deriveKEK() + wrapKey() for new user
 * 3. User unlocks: deriveKEK() + unwrapKey() to get OMK
 * 4. Encrypt/decrypt: encryptField() / decryptField() with OMK
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
