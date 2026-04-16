// Contact import
export {
  contactImportSchema,
  contactImportFieldDefinitions,
  ContactCategoryEnum,
  ContactStatusEnum,
  PersonTypeEnum,
  LeadSourceEnum,
  type ContactImportData,
  type ContactImportFieldKey,
} from "./contact-import-schema";

// Property import
export {
  propertyImportSchema,
  propertyImportFieldDefinitions,
  PropertyTypeEnum,
  PropertyStatusEnum,
  TransactionTypeEnum,
  HeatingTypeEnum,
  EnergyCertClassEnum,
  PropertyConditionEnum,
  FurnishedStatusEnum,
  PriceTypeEnum,
  ItemVisibilityEnum,
  AddressPrivacyLevelEnum,
  LegalizationStatusEnum,
  type PropertyImportData,
  type PropertyImportFieldKey,
} from "./property-import-schema";

// Fuzzy matcher for auto-mapping
export {
  normalizeString,
  levenshteinDistance,
  calculateSimilarity,
  containsKeyTerms,
  scoreToConfidence,
  findBestMatch,
  autoMatchColumns,
  matchResultsToMapping,
  getMatchStatistics,
  type MatchConfidence,
  type MatchResult,
  type FieldDefinitionWithAliases,
} from "./fuzzy-matcher";

// Enum normalizer for handling translations and variations
export {
  normalizeEnumValue,
  normalizePropertyEnums,
  normalizeClientEnums,
  propertyEnumMappings,
  clientEnumMappings,
} from "./enum-normalizer";

// Request import
export {
  requestImportSchema,
  requestImportFieldDefinitions,
  RequestStatusEnum,
  RequestUrgencyEnum,
  type RequestImportData,
  type RequestImportFieldKey,
} from "./request-import-schema";

// Entity configs
export { contactImportConfig } from "./contact-import-config";
export { propertyImportConfig } from "./property-import-config";
export { requestImportConfig } from "./request-import-config";

// Mandate enum normalizer additions
export {
  normalizeMandateEnums,
  splitArrayField,
  mandateEnumMappings,
} from "./enum-normalizer";

// Unified import system
export {
  UNIFIED_FIELD_DEFINITIONS,
  REQUEST_FIELD_KEYS,
  CONTACT_TRIGGER_KEYS,
  PROPERTY_TRIGGER_KEYS,
  PREFIX_STRIP_MAP,
  stripEntityPrefix,
  type UnifiedFieldDefinition,
} from "./unified-field-definitions";

export {
  generateMandateTitle,
  generateClientName,
} from "./name-generator";

// Unified import engine
export {
  executeBatchImport,
  /** @deprecated Use executeBatchImport instead */
  executeUnifiedImport,
  type BatchImportResult,
  type UnifiedImportResult,
} from "./unified-engine";

// Validation engine
export {
  validateImportData,
  type ValidatedRow,
  type ValidationError,
  type EntitySummary,
  type ValidationResult,
} from "./validation-engine";

// Transliteration helpers
export {
  transliterateGreekToLatin,
  containsGreek,
} from "./transliteration";
