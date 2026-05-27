/**
 * Matchmaking Calculator
 *
 * Core matching algorithm that calculates compatibility scores
 * between clients and properties based on weighted criteria.
 */

import type {
  ClientForMatching,
  PropertyForMatching,
  PropertyForMatchingV2,
  RequestForMatching,
  MatchResult,
  MatchResultV2,
  CriterionScore,
  MatchCriterion,
  MatchCriterionV2,
  ClientPropertyPreferences,
} from "./types";

import {
  BUDGET_SCORING,
  LOCATION_SCORING,
  SIZE_SCORING,
  BEDROOMS_SCORING,
  FLOOR_SCORING,
  AMENITIES_SCORING,
  INTENT_TO_TRANSACTION,
  PURPOSE_TO_PROPERTY_TYPE,
  ENERGY_CLASS_RANK,
  meetsEnergyRequirement,
  getWeight,
  getWeightV2,
} from "./weights";

import {
  parseFloor,
  extractPreferences,
  getBedroomRange,
  getSizeRange,
  getFloorRange,
  getPropertyLocations,
  parseAreasOfInterest,
  extractPropertyAmenities,
  parseAmenityPreferences,
  getPropertySizeSqm,
  getBudgetRange,
  normalizeHeating,
  normalizeCondition,
  parseConstructionYear,
  normalizeAmenityKey,
  normalizeLocation,
  toNumber,
} from "./normalizers";

import { checkDisqualifiers } from "./disqualifiers";
import { haversineDistanceKm, scoreByRadius } from "./geo";
import { getGoldenVisaThreshold } from "./constants/golden-visa";

// ============================================
// MAIN CALCULATOR
// ============================================

/**
 * Calculate match score between a client and property
 */
export function calculateMatchScore(
  client: ClientForMatching,
  property: PropertyForMatching
): MatchResult {
  const prefs = extractPreferences(client);
  const breakdown: CriterionScore[] = [];
  
  // Calculate each criterion
  breakdown.push(scoreBudget(client, property));
  breakdown.push(scoreLocation(client, property));
  breakdown.push(scoreTransactionType(client, property));
  breakdown.push(scorePropertyType(client, property));
  breakdown.push(scoreBedrooms(prefs, property));
  breakdown.push(scoreSize(prefs, property));
  breakdown.push(scoreAmenities(prefs, property));
  breakdown.push(scoreCondition(prefs, property));
  breakdown.push(scoreFurnished(prefs, property));
  breakdown.push(scoreFloor(prefs, property));
  breakdown.push(scoreElevator(prefs, property));
  breakdown.push(scorePetFriendly(prefs, property));
  breakdown.push(scoreHeating(prefs, property));
  breakdown.push(scoreEnergyClass(prefs, property));
  breakdown.push(scoreParking(prefs, property));
  
  // Calculate overall score
  const overallScore = breakdown.reduce((sum, s) => sum + s.weightedScore, 0);
  const matchedCriteria = breakdown.filter(s => s.score > 0).length;
  
  return {
    clientId: client.id,
    propertyId: property.id,
    overallScore: Math.round(overallScore * 100) / 100,
    breakdown,
    matchedCriteria,
    totalCriteria: breakdown.length,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate match scores for multiple client-property pairs
 */
export function calculateBatchMatches(
  clients: ClientForMatching[],
  properties: PropertyForMatching[]
): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (const client of clients) {
    for (const property of properties) {
      results.push(calculateMatchScore(client, property));
    }
  }
  
  return results;
}

/**
 * Find best matching properties for a client
 */
export function findMatchingProperties(
  client: ClientForMatching,
  properties: PropertyForMatching[],
  minScore: number = 0,
  limit?: number
): MatchResult[] {
  const results = properties
    .map(property => calculateMatchScore(client, property))
    .filter(result => result.overallScore >= minScore)
    .sort((a, b) => b.overallScore - a.overallScore);
  
  return limit ? results.slice(0, limit) : results;
}

/**
 * Find best matching clients for a property
 */
export function findMatchingClients(
  property: PropertyForMatching,
  clients: ClientForMatching[],
  minScore: number = 0,
  limit?: number
): MatchResult[] {
  const results = clients
    .map(client => calculateMatchScore(client, property))
    .filter(result => result.overallScore >= minScore)
    .sort((a, b) => b.overallScore - a.overallScore);
  
  return limit ? results.slice(0, limit) : results;
}

// ============================================
// INDIVIDUAL CRITERION SCORERS
// ============================================

/**
 * Score budget match
 * Perfect score when price is within client's budget range
 * Graduated scoring for prices slightly outside range
 */
function scoreBudget(
  client: ClientForMatching,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "budget";
  const weight = getWeight(criterion);
  const price = property.price;
  const { min: budgetMin, max: budgetMax } = getBudgetRange(client);
  
  // No price data
  if (price === null || price === undefined) {
    return createScore(criterion, weight, 50, "Property has no price listed");
  }
  
  // No budget constraints from client
  if (budgetMin === null && budgetMax === null) {
    return createScore(criterion, weight, BUDGET_SCORING.WITHIN_RANGE, "No budget constraints");
  }
  
  // Within range
  if (
    (budgetMin === null || price >= budgetMin) &&
    (budgetMax === null || price <= budgetMax)
  ) {
    return createScore(criterion, weight, BUDGET_SCORING.WITHIN_RANGE, "Price within budget", true);
  }
  
  // Over budget
  if (budgetMax !== null && price > budgetMax) {
    const overPercent = ((price - budgetMax) / budgetMax) * 100;
    
    if (overPercent >= BUDGET_SCORING.MAX_OVER_PERCENT) {
      return createScore(criterion, weight, 0, `${Math.round(overPercent)}% over budget`);
    }
    
    // Graduated score: 100 at budget, 0 at MAX_OVER_PERCENT
    const score = Math.max(0, 100 - (overPercent / BUDGET_SCORING.MAX_OVER_PERCENT) * 100);
    return createScore(criterion, weight, score, `${Math.round(overPercent)}% over budget`);
  }
  
  // Under budget (slightly lower score for being too far under)
  if (budgetMin !== null && price < budgetMin) {
    const underPercent = ((budgetMin - price) / budgetMin) * 100;
    
    if (underPercent >= BUDGET_SCORING.UNDER_BUDGET_PENALTY_START) {
      return createScore(
        criterion, weight,
        BUDGET_SCORING.MIN_UNDER_BUDGET_SCORE,
        `${Math.round(underPercent)}% under budget`
      );
    }
    
    // Slight reduction for being under budget
    const score = 100 - (underPercent / BUDGET_SCORING.UNDER_BUDGET_PENALTY_START) * 
      (100 - BUDGET_SCORING.MIN_UNDER_BUDGET_SCORE);
    return createScore(criterion, weight, score, `${Math.round(underPercent)}% under budget`);
  }
  
  return createScore(criterion, weight, 50, "Budget calculation error");
}

/**
 * Score location match
 * Compares property area/city against client's areas_of_interest
 */
function scoreLocation(
  client: ClientForMatching,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "location";
  const weight = getWeight(criterion);
  
  const clientAreas = parseAreasOfInterest(client.areas_of_interest);
  const propertyLocations = getPropertyLocations(property);
  
  // No location preference
  if (clientAreas.length === 0) {
    return createScore(criterion, weight, LOCATION_SCORING.NO_PREFERENCE, "No location preference");
  }
  
  // No location data on property
  if (propertyLocations.length === 0) {
    return createScore(criterion, weight, 50, "Property has no location data");
  }
  
  // Check for exact area match
  for (const clientArea of clientAreas) {
    if (propertyLocations.includes(clientArea)) {
      return createScore(criterion, weight, LOCATION_SCORING.EXACT_MATCH, `Exact match: ${clientArea}`, true);
    }
  }
  
  // Check for partial matches (area contains or is contained in)
  for (const clientArea of clientAreas) {
    for (const propLocation of propertyLocations) {
      if (propLocation.includes(clientArea) || clientArea.includes(propLocation)) {
        return createScore(criterion, weight, LOCATION_SCORING.SAME_CITY, `Partial match: ${propLocation}`);
      }
    }
  }
  
  // No match
  return createScore(criterion, weight, 0, "Location not in areas of interest");
}

/**
 * Score transaction type match
 * BUY clients should see SALE properties, RENT should see RENTAL
 */
function scoreTransactionType(
  client: ClientForMatching,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "transaction_type";
  const weight = getWeight(criterion);
  
  const intent = client.intent;
  const transactionType = property.transaction_type;
  
  // No intent or transaction type
  if (!intent || !transactionType) {
    return createScore(criterion, weight, 80, "Transaction type not specified");
  }
  
  // Check if transaction type matches intent
  const compatibleTypes = INTENT_TO_TRANSACTION[intent] || [];
  
  if (compatibleTypes.includes(transactionType)) {
    return createScore(criterion, weight, 100, `${intent} matches ${transactionType}`, true);
  }
  
  return createScore(criterion, weight, 0, `${intent} incompatible with ${transactionType}`);
}

/**
 * Score property type match
 * RESIDENTIAL purpose should match APARTMENT, HOUSE, etc.
 */
function scorePropertyType(
  client: ClientForMatching,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "property_type";
  const weight = getWeight(criterion);
  
  const purpose = client.purpose;
  const propertyType = property.property_type;
  
  // No purpose or property type
  if (!purpose || !propertyType) {
    return createScore(criterion, weight, 80, "Property type not specified");
  }
  
  // Check if property type matches purpose
  const compatibleTypes = PURPOSE_TO_PROPERTY_TYPE[purpose] || [];
  
  if (compatibleTypes.includes(propertyType)) {
    return createScore(criterion, weight, 100, `${propertyType} matches ${purpose}`, true);
  }
  
  // Partial match for "OTHER" category
  if (propertyType === "OTHER" || purpose === "OTHER") {
    return createScore(criterion, weight, 50, "Generic property type");
  }
  
  return createScore(criterion, weight, 0, `${propertyType} doesn't match ${purpose}`);
}

/**
 * Score bedroom count match
 */
function scoreBedrooms(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "bedrooms";
  const weight = getWeight(criterion);
  
  const { min, max } = getBedroomRange(prefs);
  const bedrooms = property.bedrooms;
  
  // No preference
  if (min === null && max === null) {
    return createScore(criterion, weight, BEDROOMS_SCORING.NO_PREFERENCE, "No bedroom preference");
  }
  
  // No data
  if (bedrooms === null || bedrooms === undefined) {
    return createScore(criterion, weight, 50, "Bedroom count unknown");
  }
  
  // Within range
  if (
    (min === null || bedrooms >= min) &&
    (max === null || bedrooms <= max)
  ) {
    return createScore(criterion, weight, BEDROOMS_SCORING.EXACT_MATCH, `${bedrooms} bedrooms within range`, true);
  }
  
  // Calculate difference
  let diff = 0;
  if (min !== null && bedrooms < min) {
    diff = min - bedrooms;
  } else if (max !== null && bedrooms > max) {
    diff = bedrooms - max;
  }
  
  const score = Math.max(
    BEDROOMS_SCORING.MIN_SCORE,
    BEDROOMS_SCORING.EXACT_MATCH - (diff * BEDROOMS_SCORING.SCORE_PER_BEDROOM_DIFF)
  );
  
  return createScore(criterion, weight, score, `${bedrooms} bedrooms (${diff} off preference)`);
}

/**
 * Score size (sqm) match
 */
function scoreSize(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "size";
  const weight = getWeight(criterion);
  
  const { min, max } = getSizeRange(prefs);
  const size = getPropertySizeSqm(property);
  
  // No preference
  if (min === null && max === null) {
    return createScore(criterion, weight, SIZE_SCORING.NO_PREFERENCE, "No size preference");
  }
  
  // No data
  if (size === null) {
    return createScore(criterion, weight, 50, "Size unknown");
  }
  
  // Within range
  if (
    (min === null || size >= min) &&
    (max === null || size <= max)
  ) {
    return createScore(criterion, weight, SIZE_SCORING.WITHIN_RANGE, `${size} sqm within range`, true);
  }
  
  // Calculate deviation percentage
  let deviationPercent = 0;
  if (min !== null && size < min) {
    deviationPercent = ((min - size) / min) * 100;
  } else if (max !== null && size > max) {
    deviationPercent = ((size - max) / max) * 100;
  }
  
  if (deviationPercent >= SIZE_SCORING.MAX_DEVIATION_PERCENT) {
    return createScore(criterion, weight, 0, `${Math.round(deviationPercent)}% outside size range`);
  }
  
  const score = 100 - (deviationPercent / SIZE_SCORING.MAX_DEVIATION_PERCENT) * 100;
  return createScore(criterion, weight, score, `${size} sqm (${Math.round(deviationPercent)}% off)`);
}

/**
 * Score amenities match
 */
function scoreAmenities(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "amenities";
  const weight = getWeight(criterion);
  
  const { required, preferred } = parseAmenityPreferences(
    prefs.amenities_required,
    prefs.amenities_preferred
  );
  
  // No preferences
  if (required.size === 0 && preferred.size === 0) {
    return createScore(criterion, weight, AMENITIES_SCORING.NO_PREFERENCE, "No amenity preferences");
  }
  
  const propertyAmenities = extractPropertyAmenities(property.amenities);
  
  // Check required amenities
  let requiredMet = 0;
  Array.from(required).forEach((amenity) => {
    if (propertyAmenities.has(amenity)) {
      requiredMet++;
    }
  });
  
  // If not all required are met, heavy penalty
  if (required.size > 0 && requiredMet < required.size) {
    const requiredScore = (requiredMet / required.size) * AMENITIES_SCORING.REQUIRED_WEIGHT;
    return createScore(
      criterion, weight, requiredScore,
      `Missing ${required.size - requiredMet} required amenities`
    );
  }
  
  // All required met, now check preferred
  let preferredMet = 0;
  Array.from(preferred).forEach((amenity) => {
    if (propertyAmenities.has(amenity)) {
      preferredMet++;
    }
  });
  
  const requiredScore = required.size > 0 ? AMENITIES_SCORING.REQUIRED_WEIGHT : 0;
  const preferredScore = preferred.size > 0 
    ? (preferredMet / preferred.size) * AMENITIES_SCORING.PREFERRED_WEIGHT 
    : 0;
  
  // If no required but all preferred met
  if (required.size === 0) {
    const totalScore = preferred.size > 0 
      ? (preferredMet / preferred.size) * 100 
      : AMENITIES_SCORING.NO_PREFERENCE;
    return createScore(criterion, weight, totalScore, `${preferredMet}/${preferred.size} preferred amenities`);
  }
  
  const totalScore = requiredScore + preferredScore;
  return createScore(
    criterion, weight, totalScore,
    `All required met, ${preferredMet}/${preferred.size} preferred`,
    true
  );
}

/**
 * Score property condition match
 */
function scoreCondition(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "condition";
  const weight = getWeight(criterion);
  
  const conditionPrefs = prefs.condition_preferences;
  const propertyCondition = normalizeCondition(property.condition);
  
  // No preference
  if (!conditionPrefs || conditionPrefs.length === 0) {
    return createScore(criterion, weight, 80, "No condition preference");
  }
  
  // No data
  if (!propertyCondition) {
    return createScore(criterion, weight, 50, "Property condition unknown");
  }
  
  // Check if condition is in preferences
  if (conditionPrefs.includes(propertyCondition)) {
    return createScore(criterion, weight, 100, `Condition: ${propertyCondition}`, true);
  }
  
  return createScore(criterion, weight, 0, `Condition ${propertyCondition} not preferred`);
}

/**
 * Score furnished status match
 */
function scoreFurnished(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "furnished";
  const weight = getWeight(criterion);
  
  const pref = prefs.furnished_preference;
  const status = property.furnished;
  
  // No preference or "ANY"
  if (!pref || pref === "ANY") {
    return createScore(criterion, weight, 80, "No furnished preference");
  }
  
  // No data
  if (!status) {
    return createScore(criterion, weight, 50, "Furnished status unknown");
  }
  
  // Exact match
  if (pref === status) {
    return createScore(criterion, weight, 100, `Furnished: ${status}`, true);
  }
  
  // Partial match: PARTIALLY when FULLY wanted (or vice versa)
  if (
    (pref === "FULLY" && status === "PARTIALLY") ||
    (pref === "PARTIALLY" && status === "FULLY")
  ) {
    return createScore(criterion, weight, 60, `Furnished: ${status} (wanted ${pref})`);
  }
  
  return createScore(criterion, weight, 0, `Furnished: ${status} (wanted ${pref})`);
}

/**
 * Score floor level match
 */
function scoreFloor(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "floor";
  const weight = getWeight(criterion);
  
  const { min, max, groundOnly } = getFloorRange(prefs);
  const propertyFloor = parseFloor(property.floor);
  
  // No preference
  if (min === null && max === null && !groundOnly) {
    return createScore(criterion, weight, FLOOR_SCORING.NO_PREFERENCE, "No floor preference");
  }
  
  // No data
  if (propertyFloor === null) {
    return createScore(criterion, weight, 50, "Floor level unknown");
  }
  
  // Ground floor only requirement
  if (groundOnly) {
    if (propertyFloor === 0) {
      return createScore(criterion, weight, FLOOR_SCORING.GROUND_FLOOR_REQUIRED_MATCH, "Ground floor", true);
    }
    return createScore(criterion, weight, FLOOR_SCORING.GROUND_FLOOR_REQUIRED_MISMATCH, `Floor ${propertyFloor} (need ground)`);
  }
  
  // Within range
  if (
    (min === null || propertyFloor >= min) &&
    (max === null || propertyFloor <= max)
  ) {
    return createScore(criterion, weight, FLOOR_SCORING.WITHIN_RANGE, `Floor ${propertyFloor} within range`, true);
  }
  
  // Calculate difference
  let diff = 0;
  if (min !== null && propertyFloor < min) {
    diff = min - propertyFloor;
  } else if (max !== null && propertyFloor > max) {
    diff = propertyFloor - max;
  }
  
  const score = Math.max(0, FLOOR_SCORING.WITHIN_RANGE - (diff * FLOOR_SCORING.SCORE_PER_FLOOR_DIFF));
  return createScore(criterion, weight, score, `Floor ${propertyFloor} (${diff} floors off)`);
}

/**
 * Score elevator requirement
 */
function scoreElevator(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "elevator";
  const weight = getWeight(criterion);
  
  const required = prefs.requires_elevator;
  const hasElevator = property.elevator;
  
  // No requirement
  if (!required) {
    return createScore(criterion, weight, 80, "No elevator requirement");
  }
  
  // Unknown
  if (hasElevator === null || hasElevator === undefined) {
    return createScore(criterion, weight, 50, "Elevator status unknown");
  }
  
  // Check requirement
  if (hasElevator) {
    return createScore(criterion, weight, 100, "Has elevator", true);
  }
  
  return createScore(criterion, weight, 0, "No elevator (required)");
}

/**
 * Score pet-friendly requirement
 */
function scorePetFriendly(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "pet_friendly";
  const weight = getWeight(criterion);
  
  const required = prefs.requires_pet_friendly;
  const acceptsPets = property.accepts_pets;
  
  // No requirement
  if (!required) {
    return createScore(criterion, weight, 80, "No pet requirement");
  }
  
  // Unknown
  if (acceptsPets === null || acceptsPets === undefined) {
    return createScore(criterion, weight, 50, "Pet policy unknown");
  }
  
  // Check requirement
  if (acceptsPets) {
    return createScore(criterion, weight, 100, "Pet-friendly", true);
  }
  
  return createScore(criterion, weight, 0, "Not pet-friendly (required)");
}

/**
 * Score heating type match
 */
function scoreHeating(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "heating";
  const weight = getWeight(criterion);
  
  const heatingPrefs = prefs.heating_preferences;
  const propertyHeating = normalizeHeating(property.heating_type);
  
  // No preference
  if (!heatingPrefs || heatingPrefs.length === 0) {
    return createScore(criterion, weight, 80, "No heating preference");
  }
  
  // No data
  if (!propertyHeating) {
    return createScore(criterion, weight, 50, "Heating type unknown");
  }
  
  // Check if heating type is in preferences
  if (heatingPrefs.includes(propertyHeating)) {
    return createScore(criterion, weight, 100, `Heating: ${propertyHeating}`, true);
  }
  
  return createScore(criterion, weight, 30, `Heating: ${propertyHeating} (not preferred)`);
}

/**
 * Score energy class match
 */
function scoreEnergyClass(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "energy_class";
  const weight = getWeight(criterion);
  
  const minClass = prefs.energy_class_min;
  const propertyClass = property.energy_cert_class;
  
  // No requirement
  if (!minClass) {
    return createScore(criterion, weight, 80, "No energy class requirement");
  }
  
  // No data
  if (!propertyClass) {
    return createScore(criterion, weight, 50, "Energy class unknown");
  }
  
  // Check if meets requirement
  if (meetsEnergyRequirement(propertyClass, minClass)) {
    return createScore(criterion, weight, 100, `Energy class: ${propertyClass}`, true);
  }
  
  return createScore(criterion, weight, 0, `Energy class ${propertyClass} below ${minClass}`);
}

/**
 * Score parking requirement
 */
function scoreParking(
  prefs: ClientPropertyPreferences,
  property: PropertyForMatching
): CriterionScore {
  const criterion: MatchCriterion = "parking";
  const weight = getWeight(criterion);
  
  const required = prefs.requires_parking;
  
  // No requirement
  if (!required) {
    return createScore(criterion, weight, 80, "No parking requirement");
  }
  
  // Check property amenities for parking
  const amenities = extractPropertyAmenities(property.amenities);
  const hasParking = amenities.has("parking") || 
                     amenities.has("garage") ||
                     amenities.has("parking_space");
  
  // Also check if property type is PARKING
  if (property.property_type === "PARKING") {
    return createScore(criterion, weight, 100, "Is a parking space", true);
  }
  
  if (hasParking) {
    return createScore(criterion, weight, 100, "Has parking", true);
  }
  
  return createScore(criterion, weight, 0, "No parking (required)");
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a criterion score object
 */
function createScore(
  criterion: MatchCriterion,
  weight: number,
  score: number,
  reason: string,
  matched: boolean = false
): CriterionScore {
  return {
    criterion,
    weight,
    score: Math.round(score * 100) / 100,
    weightedScore: Math.round((score * weight / 100) * 100) / 100,
    matched: matched || score >= 80,
    reason,
  };
}

// ============================================================================
// V2 MATCHMAKING ENGINE
// ============================================================================
// Request-based matching engine per the Matchmaking System v2 design spec.
// 19 canonical Layer 2 criteria + additive financing bonus (clamped to 100).
// Layer 1 disqualifiers run first via `checkDisqualifiers()`.
// DO NOT TOUCH V1 FUNCTIONS ABOVE THIS BANNER.
// ============================================================================

type OrgWeightsV2 = Partial<Record<MatchCriterionV2, number>> | null | undefined;

/**
 * Create a v2 criterion score object.
 */
function createScoreV2(
  criterion: MatchCriterionV2,
  weight: number,
  score: number,
  reason: string,
  matched: boolean = false
): CriterionScore {
  const clampedScore = Math.max(0, Math.min(100, score));
  return {
    criterion,
    weight,
    score: Math.round(clampedScore * 100) / 100,
    weightedScore: Math.round(((clampedScore * weight) / 100) * 100) / 100,
    matched: matched || clampedScore >= 80,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function amenitySet(
  amenities: Record<string, boolean> | string[] | null | undefined
): Set<string> {
  const set = new Set<string>();
  if (!amenities) return set;
  if (Array.isArray(amenities)) {
    amenities.forEach((a) => {
      if (typeof a === "string") set.add(normalizeAmenityKey(a));
    });
    return set;
  }
  if (typeof amenities === "object") {
    Object.entries(amenities).forEach(([key, value]) => {
      if (value === true) set.add(normalizeAmenityKey(key));
    });
  }
  return set;
}

function propertySizeSqmV2(property: PropertyForMatchingV2): number | null {
  if (property.size_net_sqm !== null && property.size_net_sqm !== undefined) {
    return toNumber(property.size_net_sqm);
  }
  if (property.size_gross_sqm !== null && property.size_gross_sqm !== undefined) {
    return toNumber(property.size_gross_sqm);
  }
  if (property.square_feet !== null && property.square_feet !== undefined) {
    return Math.round(property.square_feet * 0.0929);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Criterion scorers (19)
// ---------------------------------------------------------------------------

function scoreBudgetV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const price = property.price;
  const { budgetMin, budgetMax } = request;

  if (price === null || price === undefined) {
    return createScoreV2("BUDGET", weight, 50, "No property price");
  }
  if (budgetMax === null) {
    return createScoreV2("BUDGET", weight, 50, "No budgetMax specified");
  }
  if (budgetMin !== null && budgetMin > budgetMax) {
    return createScoreV2("BUDGET", weight, 50, "Invalid budget range");
  }

  // Within budget range — perfect score
  const minOk = budgetMin === null || price >= budgetMin;
  const maxOk = price <= budgetMax;
  if (minOk && maxOk) {
    return createScoreV2("BUDGET", weight, 100, "Price within budget", true);
  }

  // Under budgetMin — M-07 fix
  // For INVESTMENT purpose a below-minimum price is a positive signal (entry point value).
  // For all other intents a price well below the minimum is a quality/size concern.
  if (budgetMin !== null && price < budgetMin) {
    const isInvestment = request.purposeOfUse === "INVESTMENT";
    if (isInvestment) {
      // Below minimum asking budget = possibly under-priced gem → strong positive
      return createScoreV2("BUDGET", weight, 90, "Price below budgetMin (investment opportunity)", true);
    }
    // Non-investment: mild negative — may indicate smaller/lower-quality property
    const underPercent = ((budgetMin - price) / budgetMin) * 100;
    if (underPercent > 40) {
      return createScoreV2("BUDGET", weight, 60, `Price ${Math.round(underPercent)}% under budgetMin`);
    }
    return createScoreV2("BUDGET", weight, 75, `Price ${Math.round(underPercent)}% under budgetMin`);
  }

  // Over budgetMax — M-08 fix: linear taper instead of flat 60
  if (price > budgetMax) {
    const softCeiling = budgetMax * 1.15; // 15% soft zone
    if (price <= softCeiling) {
      // Linear taper: 100 at budgetMax → 40 at softCeiling
      const overFraction = (price - budgetMax) / (softCeiling - budgetMax); // 0..1
      const score = Math.round(100 - overFraction * 60); // 100 → 40
      return createScoreV2(
        "BUDGET",
        weight,
        score,
        `Price ${Math.round(((price - budgetMax) / budgetMax) * 100)}% over budget (soft zone)`
      );
    }
    return createScoreV2("BUDGET", weight, 0, "Price over budget ceiling");
  }

  return createScoreV2("BUDGET", weight, 50, "Budget calculation fallback");
}

function scorePropertyTypeV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const propertyType = property.property_type;
  const requested = request.propertyTypes;

  if (!propertyType) {
    return createScoreV2("PROPERTY_TYPE", weight, 50, "Property type unknown");
  }
  if (!requested || requested.length === 0) {
    if (request.purposeOfUse) {
      const compatible = PURPOSE_TO_PROPERTY_TYPE[request.purposeOfUse] ?? [];
      if (compatible.includes(propertyType)) {
        return createScoreV2("PROPERTY_TYPE", weight, 70, "Category match via purposeOfUse");
      }
      // purposeOfUse is set but property type doesn't match — penalise
      return createScoreV2("PROPERTY_TYPE", weight, 20, `Property type ${propertyType} does not match purposeOfUse ${request.purposeOfUse}`);
    }
    // Neither propertyTypes nor purposeOfUse specified — neutral
    return createScoreV2("PROPERTY_TYPE", weight, 50, "No property type preference");
  }

  if (requested.includes(propertyType)) {
    return createScoreV2("PROPERTY_TYPE", weight, 100, `Property type matches: ${propertyType}`, true);
  }

  // Check category-level match via purposeOfUse
  if (request.purposeOfUse) {
    const compatible = PURPOSE_TO_PROPERTY_TYPE[request.purposeOfUse] ?? [];
    if (compatible.includes(propertyType)) {
      return createScoreV2("PROPERTY_TYPE", weight, 70, "Category match via purposeOfUse");
    }
  }

  return createScoreV2("PROPERTY_TYPE", weight, 0, `Property type ${propertyType} not preferred`);
}

function scoreLocationV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  // Geo-based search
  if (
    request.centerLatitude !== null &&
    request.centerLongitude !== null &&
    request.radiusKm !== null &&
    property.latitude !== null &&
    property.longitude !== null
  ) {
    const distance = haversineDistanceKm(
      request.centerLatitude,
      request.centerLongitude,
      property.latitude,
      property.longitude
    );
    const score = scoreByRadius(distance, request.radiusKm, 100);
    return createScoreV2("LOCATION", weight, score, `Distance ${distance}km`, score >= 80);
  }

  // Text-based area fallback
  const requestAreas = request.areas;
  if (!requestAreas || requestAreas.length === 0) {
    return createScoreV2("LOCATION", weight, 50, "No location preference");
  }

  const propertyLocations: string[] = [];
  if (property.area) propertyLocations.push(property.area);
  if (property.address_city) propertyLocations.push(property.address_city);
  if (property.municipality) propertyLocations.push(property.municipality);
  if (property.address_state) propertyLocations.push(property.address_state);

  if (propertyLocations.length === 0) {
    return createScoreV2("LOCATION", weight, 50, "Property has no location data");
  }

  const normalizedRequested = requestAreas.map(normalizeLocation);
  const normalizedProperty = propertyLocations.map(normalizeLocation);

  // Exact match
  for (const area of normalizedRequested) {
    if (normalizedProperty.includes(area)) {
      return createScoreV2("LOCATION", weight, 100, `Exact area match: ${area}`, true);
    }
  }

  // Partial (substring) match
  for (const area of normalizedRequested) {
    if (!area) continue;
    for (const loc of normalizedProperty) {
      if (!loc) continue;
      if (loc.includes(area) || area.includes(loc)) {
        return createScoreV2("LOCATION", weight, 60, `Partial location match: ${loc}`);
      }
    }
  }

  return createScoreV2("LOCATION", weight, 20, "Property not in requested areas");
}

function scoreBedroomsV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const { minBedrooms, maxBedrooms } = request;
  const bedrooms = property.bedrooms;

  if (minBedrooms === null && maxBedrooms === null) {
    return createScoreV2("BEDROOMS", weight, 50, "No bedroom preference");
  }
  if (minBedrooms !== null && maxBedrooms !== null && minBedrooms > maxBedrooms) {
    return createScoreV2("BEDROOMS", weight, 50, "Invalid bedroom range");
  }
  if (bedrooms === null || bedrooms === undefined) {
    return createScoreV2("BEDROOMS", weight, 50, "Bedroom count unknown");
  }

  const minOk = minBedrooms === null || bedrooms >= minBedrooms;
  const maxOk = maxBedrooms === null || bedrooms <= maxBedrooms;

  if (minOk && maxOk) {
    return createScoreV2("BEDROOMS", weight, 100, `${bedrooms} bedrooms in range`, true);
  }

  if (maxBedrooms !== null && bedrooms > maxBedrooms) {
    // Surplus: extra bedrooms are nice-to-have but cost more.
    // Base 80, taper -10 per bedroom over the max, floor at 40.
    const surplus = bedrooms - maxBedrooms;
    const score = Math.max(40, 80 - (surplus - 1) * 10);
    return createScoreV2("BEDROOMS", weight, score, `${bedrooms} bedrooms (${surplus} over max)`);
  }

  if (minBedrooms !== null && bedrooms < minBedrooms) {
    // Deficit: fewer bedrooms than requested is a meaningful mismatch.
    // Base 40, taper -20 per bedroom below the min, floor at 0.
    const deficit = minBedrooms - bedrooms;
    const score = Math.max(0, 40 - (deficit - 1) * 20);
    return createScoreV2("BEDROOMS", weight, score, `${bedrooms} bedrooms (${deficit} below min)`);
  }

  return createScoreV2("BEDROOMS", weight, 50, "Bedroom fallback");
}

function scoreSizeV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const { minSizeSqm, maxSizeSqm } = request;
  const size = propertySizeSqmV2(property);

  if (minSizeSqm === null && maxSizeSqm === null) {
    return createScoreV2("SIZE", weight, 50, "No size preference");
  }
  if (size === null) {
    return createScoreV2("SIZE", weight, 50, "Size unknown");
  }

  const minOk = minSizeSqm === null || size >= minSizeSqm;
  const maxOk = maxSizeSqm === null || size <= maxSizeSqm;

  if (minOk && maxOk) {
    return createScoreV2("SIZE", weight, 100, `${size} sqm in range`, true);
  }

  if (minSizeSqm !== null && size < minSizeSqm) {
    const deficitPercent = (minSizeSqm - size) / minSizeSqm;
    if (deficitPercent < 0.2) {
      return createScoreV2("SIZE", weight, 70, `${size} sqm slightly under minimum`);
    }
    return createScoreV2("SIZE", weight, 30, `${size} sqm well under minimum`);
  }

  if (maxSizeSqm !== null && size > maxSizeSqm) {
    const surplusPercent = (size - maxSizeSqm) / maxSizeSqm;
    if (surplusPercent < 0.2) {
      return createScoreV2("SIZE", weight, 80, `${size} sqm slightly over maximum`);
    }
    return createScoreV2("SIZE", weight, 50, `${size} sqm well over maximum`);
  }

  return createScoreV2("SIZE", weight, 50, "Size fallback");
}

function scoreFloorV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const { floorMin, floorMax } = request;
  if (floorMin === null && floorMax === null) {
    return createScoreV2("FLOOR", weight, 50, "No floor preference");
  }
  const floorNum = parseFloor(property.floor);
  if (floorNum === null) {
    return createScoreV2("FLOOR", weight, 50, "Floor unknown");
  }
  const minOk = floorMin === null || floorNum >= floorMin;
  const maxOk = floorMax === null || floorNum <= floorMax;
  if (minOk && maxOk) {
    return createScoreV2("FLOOR", weight, 100, `Floor ${floorNum} in range`, true);
  }
  return createScoreV2("FLOOR", weight, 40, `Floor ${floorNum} outside range`);
}

function scoreConditionV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const prefs = request.conditionPreferences;

  // No preference expressed — neutral
  if (!prefs || prefs.length === 0) {
    return createScoreV2("CONDITION", weight, 50, "No condition preference");
  }

  // No data on the property side
  if (!property.condition) {
    return createScoreV2("CONDITION", weight, 50, "Property condition unknown");
  }

  if (prefs.includes(property.condition)) {
    return createScoreV2("CONDITION", weight, 100, `Condition matches: ${property.condition}`, true);
  }

  // Partial credit: ordered degradation EXCELLENT > VERY_GOOD > GOOD > NEEDS_RENOVATION
  const CONDITION_RANK: Record<string, number> = {
    EXCELLENT: 4,
    VERY_GOOD: 3,
    GOOD: 2,
    NEEDS_RENOVATION: 1,
  };
  const propRank = CONDITION_RANK[property.condition] ?? 0;
  const bestPrefRank = Math.max(...prefs.map((c) => CONDITION_RANK[c] ?? 0));

  if (propRank < bestPrefRank) {
    // Property is in worse condition than preferred
    const gap = bestPrefRank - propRank;
    const score = Math.max(0, 100 - gap * 30); // -30 per step below preferred
    return createScoreV2("CONDITION", weight, score, `Condition ${property.condition} below preference`);
  }

  // Property is in better condition than the minimum preferred — still acceptable
  return createScoreV2("CONDITION", weight, 80, `Condition ${property.condition} exceeds preference`);
}

function scoreConstructionYearV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const { yearBuiltMin, yearBuiltMax } = request;
  if (yearBuiltMin === null && yearBuiltMax === null) {
    return createScoreV2("CONSTRUCTION_YEAR", weight, 50, "No construction-year preference");
  }
  const year = parseConstructionYear(property.year_built);
  if (year === null) {
    return createScoreV2("CONSTRUCTION_YEAR", weight, 50, "Construction year unknown");
  }
  const minOk = yearBuiltMin === null || year >= yearBuiltMin;
  const maxOk = yearBuiltMax === null || year <= yearBuiltMax;
  if (minOk && maxOk) {
    return createScoreV2("CONSTRUCTION_YEAR", weight, 100, `Built in ${year}`, true);
  }
  return createScoreV2("CONSTRUCTION_YEAR", weight, 20, `Built in ${year} (outside range)`);
}

function scoreParkingV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  if (request.parkingRequired !== true) {
    return createScoreV2("PARKING", weight, 50, "Parking not required");
  }
  if (property.parking === true) {
    return createScoreV2("PARKING", weight, 100, "Has parking", true);
  }
  const amenities = amenitySet(property.amenities);
  if (amenities.has("parking") || amenities.has("garage") || amenities.has("parking_space")) {
    return createScoreV2("PARKING", weight, 100, "Has parking (via amenities)", true);
  }
  return createScoreV2("PARKING", weight, 0, "No parking (required)");
}

function scoreStorageV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  if (request.storageRequired !== true) {
    return createScoreV2("STORAGE", weight, 50, "Storage not required");
  }
  const amenities = amenitySet(property.amenities);
  if (amenities.has("storage")) {
    return createScoreV2("STORAGE", weight, 100, "Has storage", true);
  }
  return createScoreV2("STORAGE", weight, 0, "No storage (required)");
}

function scoreElevatorV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  if (request.elevatorRequired !== true) {
    return createScoreV2("ELEVATOR", weight, 50, "Elevator not required");
  }
  if (property.elevator === true) {
    return createScoreV2("ELEVATOR", weight, 100, "Has elevator", true);
  }
  return createScoreV2("ELEVATOR", weight, 0, "No elevator (required)");
}

function scoreGardenV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const pref = request.gardenRequired;

  // No preference — neutral regardless of garden presence
  if (pref === null || pref === undefined) {
    return createScoreV2("GARDEN", weight, 50, "No garden preference");
  }

  // Determine whether property has garden via dedicated field or amenities
  const amenities = amenitySet(property.amenities);
  const hasGarden = property.garden === true || amenities.has("garden");

  if (!pref) {
    // Buyer explicitly does NOT want garden (e.g., no maintenance burden)
    return createScoreV2(
      "GARDEN",
      weight,
      hasGarden ? 40 : 100,
      hasGarden ? "Has garden (buyer prefers none)" : "No garden (matches preference)",
      !hasGarden
    );
  }

  // Buyer wants garden
  if (hasGarden) {
    return createScoreV2("GARDEN", weight, 100, "Has garden (matches preference)", true);
  }

  // Garden status unknown
  if (property.garden === null && !amenities.has("garden")) {
    return createScoreV2("GARDEN", weight, 40, "Garden status unknown (garden required)");
  }

  return createScoreV2("GARDEN", weight, 0, "No garden (required)");
}

function scoreAmenitiesV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const required = (request.requiredAmenities ?? []).map(normalizeAmenityKey);
  if (required.length === 0) {
    return createScoreV2("AMENITIES", weight, 50, "No required amenities");
  }
  const propertyAmenities = amenitySet(property.amenities);
  let matched = 0;
  for (const amenity of required) {
    if (propertyAmenities.has(amenity)) matched++;
  }
  const score = (matched / required.length) * 100;
  return createScoreV2(
    "AMENITIES",
    weight,
    score,
    `${matched}/${required.length} required amenities matched`,
    matched === required.length
  );
}

function scoreInsideCityPlanV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const pref = request.insideCityPlanRequired;

  // No preference — neutral
  if (pref === null || pref === undefined) {
    return createScoreV2("INSIDE_CITY_PLAN", weight, 50, "No inside-city-plan preference");
  }

  // No data on property
  if (property.inside_city_plan === null || property.inside_city_plan === undefined) {
    return createScoreV2("INSIDE_CITY_PLAN", weight, 50, "Inside-city-plan status unknown");
  }

  if (pref === property.inside_city_plan) {
    return createScoreV2(
      "INSIDE_CITY_PLAN",
      weight,
      100,
      `Inside city plan: ${property.inside_city_plan}`,
      true
    );
  }

  // Mismatch: buyer required inside-plan but property is outside (or vice versa).
  // This is a soft constraint in Greek RE — penalise but don't disqualify.
  return createScoreV2(
    "INSIDE_CITY_PLAN",
    weight,
    20,
    `Inside city plan mismatch (wanted ${pref}, got ${property.inside_city_plan})`
  );
}

function scoreGoldenVisaV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  if (request.goldenVisaRequired !== true) {
    return createScoreV2("GOLDEN_VISA", weight, 50, "Golden visa not required");
  }
  const price = property.price;
  if (price === null || price === undefined) {
    return createScoreV2("GOLDEN_VISA", weight, 0, "No price — cannot verify golden-visa eligibility");
  }
  if ((property.region === null || property.region === undefined) &&
      (property.municipality === null || property.municipality === undefined)) {
    return createScoreV2("GOLDEN_VISA", weight, 50, "Property location unknown — golden visa threshold undetermined");
  }
  const threshold = getGoldenVisaThreshold(property.region, property.municipality);
  if (price >= threshold) {
    return createScoreV2("GOLDEN_VISA", weight, 100, `Meets golden-visa threshold €${threshold}`, true);
  }
  return createScoreV2("GOLDEN_VISA", weight, 0, `Below golden-visa threshold €${threshold}`);
}

function scoreFinancingTypeV2(
  request: RequestForMatching,
  _property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  switch (request.financingStatus) {
    case "CASH":
      return createScoreV2("FINANCING_TYPE", weight, 100, "Cash financing", true);
    case "MORTGAGE_PREAPPROVED":
      return createScoreV2("FINANCING_TYPE", weight, 85, "Mortgage pre-approved");
    case "MORTGAGE_PENDING":
      return createScoreV2("FINANCING_TYPE", weight, 65, "Mortgage in process");
    case "SEEKING_FINANCING":
      return createScoreV2("FINANCING_TYPE", weight, 45, "Seeking financing");
    case "UNKNOWN":
    case null:
    case undefined:
    default:
      return createScoreV2("FINANCING_TYPE", weight, 50, "Financing not specified");
  }
}

function scoreBathroomsV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const { minBathrooms } = request;
  const bathrooms = property.bathrooms;
  if (minBathrooms === null) {
    return createScoreV2("BATHROOMS", weight, 50, "No bathroom preference");
  }
  if (bathrooms === null || bathrooms === undefined) {
    return createScoreV2("BATHROOMS", weight, 50, "Bathroom count unknown");
  }
  if (bathrooms >= minBathrooms) {
    return createScoreV2("BATHROOMS", weight, 100, `${bathrooms} bathrooms meets minimum`, true);
  }
  return createScoreV2("BATHROOMS", weight, 40, `${bathrooms} bathrooms below minimum`);
}

function scoreTimelineV2(
  request: RequestForMatching,
  _property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  // Properties don't expose an availability timeline in the current schema.
  // Score is based solely on the urgency of the request:
  //   IMMEDIATE         → buyer is highly motivated; any active property is relevant → 100
  //   ONE_THREE_MONTHS  → strong signal of near-term intent → 85
  //   THREE_SIX_MONTHS  → moderate → 70
  //   SIX_PLUS_MONTHS   → low urgency but still active → 55
  //   null/unknown      → no preference → 50 (neutral)
  const TIMELINE_SCORE: Record<string, number> = {
    IMMEDIATE: 100,
    ONE_THREE_MONTHS: 85,
    THREE_SIX_MONTHS: 70,
    SIX_PLUS_MONTHS: 55,
  };
  if (!request.timeline) {
    return createScoreV2("TIMELINE", weight, 50, "Timeline not specified");
  }
  const score = TIMELINE_SCORE[request.timeline] ?? 50;
  return createScoreV2("TIMELINE", weight, score, `Timeline: ${request.timeline}`, score >= 80);
}

function scoreEnergyClassV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  weight: number
): CriterionScore {
  const minClass = request.energyClassMin;

  if (!minClass) {
    return createScoreV2("ENERGY_CLASS", weight, 50, "No energy-class preference");
  }
  if (!property.energy_cert_class) {
    return createScoreV2("ENERGY_CLASS", weight, 50, "Energy class unknown");
  }

  const propRank = ENERGY_CLASS_RANK[property.energy_cert_class] ?? 0;
  const reqRank = ENERGY_CLASS_RANK[minClass] ?? 0;

  if (propRank >= reqRank) {
    return createScoreV2(
      "ENERGY_CLASS",
      weight,
      100,
      `Energy class ${property.energy_cert_class} meets minimum ${minClass}`,
      true
    );
  }

  // Linear penalty: one rank below = 70, two = 40, three or more = 10
  const gap = reqRank - propRank;
  const score = Math.max(10, 100 - gap * 30);
  return createScoreV2(
    "ENERGY_CLASS",
    weight,
    score,
    `Energy class ${property.energy_cert_class} is ${gap} rank(s) below minimum ${minClass}`
  );
}

// ---------------------------------------------------------------------------
// Main v2 calculators
// ---------------------------------------------------------------------------

/**
 * Calculate v2 match score between a Request and a Property.
 *
 * Layer 1: Runs disqualifiers — returns overallScore=0 with empty breakdown if disqualified.
 * Layer 2: Scores 19 criteria using `getWeightV2()` with optional per-org overrides.
 * Layer 3: Adds financing bonus (+5) when financingStatus=CASH AND price >= €500,000.
 * Final overallScore is Math.round(rawSum + financingBonus), clamped to [0, 100].
 */
export function calculateMatchScoreV2(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
  orgWeights?: OrgWeightsV2
): MatchResultV2 {
  // Layer 1
  const disqualifier = checkDisqualifiers(request, property);
  if (disqualifier.disqualified) {
    return {
      requestId: request.id,
      propertyId: property.id,
      overallScore: 0,
      financingBonus: 0,
      breakdown: [],
      matchedCriteria: 0,
      totalCriteria: 0,
      calculatedAt: new Date(),
    };
  }

  // Layer 2 — 19 criteria
  const w = (c: MatchCriterionV2) => getWeightV2(c, orgWeights);
  const breakdown: CriterionScore[] = [
    scoreBudgetV2(request, property, w("BUDGET")),
    scorePropertyTypeV2(request, property, w("PROPERTY_TYPE")),
    scoreLocationV2(request, property, w("LOCATION")),
    scoreBedroomsV2(request, property, w("BEDROOMS")),
    scoreSizeV2(request, property, w("SIZE")),
    scoreFloorV2(request, property, w("FLOOR")),
    scoreConditionV2(request, property, w("CONDITION")),
    scoreConstructionYearV2(request, property, w("CONSTRUCTION_YEAR")),
    scoreParkingV2(request, property, w("PARKING")),
    scoreStorageV2(request, property, w("STORAGE")),
    scoreElevatorV2(request, property, w("ELEVATOR")),
    scoreGardenV2(request, property, w("GARDEN")),
    scoreAmenitiesV2(request, property, w("AMENITIES")),
    scoreInsideCityPlanV2(request, property, w("INSIDE_CITY_PLAN")),
    scoreGoldenVisaV2(request, property, w("GOLDEN_VISA")),
    scoreFinancingTypeV2(request, property, w("FINANCING_TYPE")),
    scoreBathroomsV2(request, property, w("BATHROOMS")),
    scoreTimelineV2(request, property, w("TIMELINE")),
    scoreEnergyClassV2(request, property, w("ENERGY_CLASS")),
  ];

  const rawSum = breakdown.reduce((sum, c) => sum + c.weightedScore, 0);

  // Layer 3 — financing bonus
  let financingBonus = 0;
  if (
    request.financingStatus === "CASH" &&
    property.price !== null &&
    property.price !== undefined &&
    property.price >= 500_000
  ) {
    financingBonus = 5;
  }

  const overallScore = Math.min(100, Math.max(0, Math.round(rawSum + financingBonus)));
  const matchedCriteria = breakdown.filter((c) => c.matched).length;

  return {
    requestId: request.id,
    propertyId: property.id,
    overallScore,
    financingBonus,
    breakdown,
    matchedCriteria,
    totalCriteria: breakdown.length,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate v2 match scores for the cartesian product of requests × properties.
 * O(R × P).
 */
export function calculateBatchMatchesV2(
  requests: RequestForMatching[],
  properties: PropertyForMatchingV2[],
  orgWeights?: OrgWeightsV2
): MatchResultV2[] {
  const results: MatchResultV2[] = [];
  for (const request of requests) {
    for (const property of properties) {
      results.push(calculateMatchScoreV2(request, property, orgWeights));
    }
  }
  return results;
}
