/**
 * Matchmaking Weights Configuration
 * 
 * Defines the importance (weight) of each matching criterion.
 * Weights should sum to 100 for easy percentage interpretation.
 */

import type { MatchCriterion, EnergyCertClass } from "./types";

// ============================================
// CRITERION WEIGHTS (total = 100)
// ============================================

/**
 * Weight configuration for each matching criterion
 * Higher weight = more important in final score
 */
export const MATCH_WEIGHTS: Record<MatchCriterion, number> = {
  // Primary criteria (68%)
  budget: 25,           // Most important - property must be affordable
  location: 20,         // Area/city preference
  transaction_type: 15, // Buy vs Rent alignment
  property_type: 8,     // Apartment, House, etc.
  
  // Secondary criteria (17%)
  bedrooms: 8,          // Room count requirement
  size: 7,              // Square meters
  amenities: 5,         // Features like pool, gym, etc.
  
  // Tertiary criteria (15%)
  condition: 3,         // Property condition
  furnished: 2,         // Furnished status
  floor: 2,             // Floor level preference
  elevator: 1,          // Elevator availability
  pet_friendly: 1,      // Pet policy
  heating: 0.5,         // Heating type
  energy_class: 0.3,    // Energy efficiency
  parking: 0.2,         // Parking availability
};

// Validate weights sum to ~100
const totalWeight = Object.values(MATCH_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(totalWeight - 100) > 0.1) {
  console.warn(`[Matchmaking] Weights sum to ${totalWeight}, expected 100`);
}

// ============================================
// SCORING THRESHOLDS
// ============================================

/**
 * Thresholds for categorizing match quality
 */
export const MATCH_THRESHOLDS = {
  EXCELLENT: 85,  // 85%+ = Excellent match
  GOOD: 70,       // 70-84% = Good match
  FAIR: 50,       // 50-69% = Fair match
  POOR: 25,       // 25-49% = Poor match
  // Below 25% = Very poor match
} as const;

/**
 * Default minimum score to consider a match "viable"
 */
export const DEFAULT_MIN_MATCH_SCORE = 40;

/**
 * Default limit for match results
 */
export const DEFAULT_MATCH_LIMIT = 20;

// ============================================
// BUDGET SCORING CONFIGURATION
// ============================================

/**
 * Budget scoring configuration
 * Uses graduated scoring based on how far price is from budget range
 */
export const BUDGET_SCORING = {
  // Perfect score when price is within budget range
  WITHIN_RANGE: 100,
  
  // Percentage over budget where score becomes 0
  MAX_OVER_PERCENT: 30, // 30% over budget = 0 score
  
  // Percentage under budget where score starts to drop
  // (too cheap might indicate issues)
  UNDER_BUDGET_PENALTY_START: 50, // Start penalizing at 50% under
  
  // Minimum score for being under budget
  MIN_UNDER_BUDGET_SCORE: 70,
} as const;

// ============================================
// LOCATION SCORING CONFIGURATION
// ============================================

/**
 * Location matching configuration
 */
export const LOCATION_SCORING = {
  // Exact area match
  EXACT_MATCH: 100,
  
  // Same city, different area
  SAME_CITY: 75,
  
  // Same state/region, different city
  SAME_STATE: 40,
  
  // No location preference set = neutral score
  NO_PREFERENCE: 80,
} as const;

// ============================================
// SIZE SCORING CONFIGURATION
// ============================================

/**
 * Size (sqm) scoring configuration
 */
export const SIZE_SCORING = {
  // Perfect score when within range
  WITHIN_RANGE: 100,
  
  // Percentage outside range where score becomes 0
  MAX_DEVIATION_PERCENT: 40,
  
  // Score when no preference is set
  NO_PREFERENCE: 80,
} as const;

// ============================================
// BEDROOMS SCORING CONFIGURATION
// ============================================

/**
 * Bedrooms scoring configuration
 */
export const BEDROOMS_SCORING = {
  // Perfect score when within range
  EXACT_MATCH: 100,
  
  // Score per bedroom difference
  SCORE_PER_BEDROOM_DIFF: 25, // Lose 25 points per bedroom off
  
  // Minimum score for bedroom mismatch
  MIN_SCORE: 0,
  
  // Score when no preference set
  NO_PREFERENCE: 80,
} as const;

// ============================================
// FLOOR SCORING CONFIGURATION
// ============================================

/**
 * Floor level scoring configuration
 */
export const FLOOR_SCORING = {
  // Within preferred range
  WITHIN_RANGE: 100,
  
  // Score per floor difference from range
  SCORE_PER_FLOOR_DIFF: 15,
  
  // Ground floor when specifically required
  GROUND_FLOOR_REQUIRED_MATCH: 100,
  GROUND_FLOOR_REQUIRED_MISMATCH: 0,
  
  // No preference
  NO_PREFERENCE: 80,
} as const;

// ============================================
// AMENITIES SCORING CONFIGURATION
// ============================================

/**
 * Amenities scoring configuration
 */
export const AMENITIES_SCORING = {
  // Required amenities weight (out of 100)
  REQUIRED_WEIGHT: 70,
  
  // Preferred amenities weight (out of 100)
  PREFERRED_WEIGHT: 30,
  
  // Score when all required amenities present
  ALL_REQUIRED_MET: 100,
  
  // Score when no amenities preference
  NO_PREFERENCE: 80,
} as const;

// ============================================
// ENERGY CLASS RANKING
// ============================================

/**
 * Energy class ranking (higher = better)
 * Used to determine if property meets minimum requirement
 */
export const ENERGY_CLASS_RANK: Record<EnergyCertClass, number> = {
  A_PLUS: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 4,
  G: 3,
  H: 2,
  IN_PROGRESS: 1,
};

// ============================================
// TRANSACTION TYPE MAPPING
// ============================================

/**
 * Maps client intent to compatible property transaction types
 */
export const INTENT_TO_TRANSACTION: Record<string, string[]> = {
  BUY: ["SALE"],
  SELL: ["SALE"],
  RENT: ["RENTAL", "SHORT_TERM"],
  LEASE: ["RENTAL"],
  INVEST: ["SALE", "RENTAL"], // Investors interested in both
};

// ============================================
// PROPERTY TYPE MAPPING
// ============================================

/**
 * Maps client purpose to compatible property types
 */
export const PURPOSE_TO_PROPERTY_TYPE: Record<string, string[]> = {
  RESIDENTIAL: [
    "RESIDENTIAL", "APARTMENT", "HOUSE", "MAISONETTE", "VACATION", "RENTAL"
  ],
  COMMERCIAL: [
    "COMMERCIAL", "WAREHOUSE", "INDUSTRIAL", "OTHER"
  ],
  LAND: [
    "LAND", "PLOT", "FARM"
  ],
  PARKING: [
    "PARKING"
  ],
  OTHER: [
    "OTHER", "WAREHOUSE", "INDUSTRIAL"
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the weight for a specific criterion
 */
export function getWeight(criterion: MatchCriterion): number {
  return MATCH_WEIGHTS[criterion] ?? 0;
}

/**
 * Get match quality label based on score
 */
export function getMatchQuality(score: number): "excellent" | "good" | "fair" | "poor" | "very_poor" {
  if (score >= MATCH_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= MATCH_THRESHOLDS.GOOD) return "good";
  if (score >= MATCH_THRESHOLDS.FAIR) return "fair";
  if (score >= MATCH_THRESHOLDS.POOR) return "poor";
  return "very_poor";
}

/**
 * Check if energy class meets minimum requirement
 */
export function meetsEnergyRequirement(
  propertyClass: EnergyCertClass | null | undefined,
  requiredClass: EnergyCertClass | null | undefined
): boolean {
  if (!requiredClass) return true; // No requirement
  if (!propertyClass) return false; // No data, can't verify
  
  return ENERGY_CLASS_RANK[propertyClass] >= ENERGY_CLASS_RANK[requiredClass];
}
