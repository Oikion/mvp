// Client import
export {
  clientImportSchema,
  clientImportFieldDefinitions,
  ClientTypeEnum,
  ClientStatusEnum,
  PersonTypeEnum,
  LeadSourceEnum,
  type ClientImportData,
  type ClientImportFieldKey,
} from "./client-import-schema";

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

// Mandate import
export {
  mandateImportSchema,
  mandateImportFieldDefinitions,
  MandateStatusEnum,
  MandateUrgencyEnum,
  type MandateImportData,
  type MandateImportFieldKey,
} from "./mandate-import-schema";

// Import engine
export {
  executeImport,
  type ImportEntityConfig,
  type ImportResult as EngineImportResult,
  type ImportError,
} from "./engine";

// Entity configs
export { clientImportConfig } from "./client-import-config";
export { propertyImportConfig } from "./property-import-config";
export { mandateImportConfig } from "./mandate-import-config";

// Mandate enum normalizer additions
export {
  normalizeMandateEnums,
  splitArrayField,
  mandateEnumMappings,
} from "./enum-normalizer";




