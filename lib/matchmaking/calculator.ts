/**
 * Matchmaking Calculator
 * 
 * Core matching algorithm that calculates compatibility scores
 * between clients and properties based on weighted criteria.
 */

import type {
  ClientForMatching,
  PropertyForMatching,
  MatchResult,
  CriterionScore,
  MatchCriterion,
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
  meetsEnergyRequirement,
  getWeight,
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
} from "./normalizers";

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
  for (const amenity of required) {
    if (propertyAmenities.has(amenity)) {
      requiredMet++;
    }
  }
  
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
  for (const amenity of preferred) {
    if (propertyAmenities.has(amenity)) {
      preferredMet++;
    }
  }
  
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
