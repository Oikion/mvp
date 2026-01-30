/**
 * Matchmaking Module
 * 
 * Client-Property matching engine for real estate CRM
 * 
 * @example
 * ```typescript
 * import { calculateMatchScore, findMatchingProperties, MATCH_THRESHOLDS } from '@/lib/matchmaking';
 * 
 * // Calculate match between a client and property
 * const result = calculateMatchScore(client, property);
 * console.log(`Match: ${result.overallScore}%`);
 * 
 * // Find top matching properties for a client
 * const matches = findMatchingProperties(client, properties, 50, 10);
 * ```
 */

// Types
export type {
  // Core types
  ClientForMatching,
  PropertyForMatching,
  ClientPropertyPreferences,
  
  // Result types
  MatchResult,
  CriterionScore,
  MatchCriterion,
  MatchResultWithClient,
  MatchResultWithProperty,
  
  // Analytics types
  MatchAnalytics,
  MatchDistribution,
  ClientSummary,
  PropertySummary,
  PropertyWithMatchStats,
  
  // Options
  MatchFilters,
  MatchOptions,
  
  // Enums
  ClientIntent,
  PropertyPurpose,
  TransactionType,
  PropertyType,
  PropertyCondition,
  FurnishedStatus,
  HeatingType,
  EnergyCertClass,
  PropertyStatus,
  ClientStatus,
} from "./types";

// Calculator functions
export {
  calculateMatchScore,
  calculateBatchMatches,
  findMatchingProperties,
  findMatchingClients,
} from "./calculator";

// Weights and configuration
export {
  MATCH_WEIGHTS,
  MATCH_THRESHOLDS,
  DEFAULT_MIN_MATCH_SCORE,
  DEFAULT_MATCH_LIMIT,
  BUDGET_SCORING,
  LOCATION_SCORING,
  SIZE_SCORING,
  BEDROOMS_SCORING,
  FLOOR_SCORING,
  AMENITIES_SCORING,
  ENERGY_CLASS_RANK,
  INTENT_TO_TRANSACTION,
  PURPOSE_TO_PROPERTY_TYPE,
  getWeight,
  getMatchQuality,
  meetsEnergyRequirement,
} from "./weights";

// Normalizers
export {
  toNumber,
  parseFloor,
  extractPreferences,
  getBedroomRange,
  getBathroomRange,
  getSizeRange,
  getFloorRange,
  getPropertyLocations,
  parseAreasOfInterest,
  extractPropertyAmenities,
  normalizeAmenityKey,
  parseAmenityPreferences,
  getPropertySizeSqm,
  getBudgetRange,
  isPriceInBudget,
  normalizeLocation,
  normalizeFurnished,
  normalizeHeating,
  normalizeCondition,
  normalizeEnergyClass,
  STANDARD_AMENITIES,
} from "./normalizers";
