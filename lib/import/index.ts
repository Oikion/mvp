// Client import
export {
  clientImportSchema,
  clientImportFieldDefinitions,
  ClientTypeEnum,
  ClientStatusEnum,
  PersonTypeEnum,
  ClientIntentEnum,
  PropertyPurposeEnum,
  TimelineEnum,
  FinancingTypeEnum,
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
  PortalVisibilityEnum,
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








