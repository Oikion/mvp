/**
 * Matchmaking System Types
 * 
 * Defines all TypeScript interfaces for the client-property matching engine
 */

import type { Prisma } from "@prisma/client";
// Prisma 7: Decimal is available via the `Prisma` namespace rather than the
// removed `@prisma/client/runtime/library` module.
type Decimal = Prisma.Decimal;

// ============================================
// ENUMS (matching Prisma schema)
// ============================================

export type ClientIntent = "BUY" | "RENT" | "SELL" | "LEASE" | "INVEST";
export type PropertyPurpose = "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "PARKING" | "OTHER";
export type TransactionType = "SALE" | "RENTAL" | "SHORT_TERM" | "EXCHANGE" | "AUCTION";
export type PropertyType = 
  | "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "RENTAL" | "VACATION"
  | "APARTMENT" | "HOUSE" | "MAISONETTE" | "WAREHOUSE" | "PARKING"
  | "PLOT" | "FARM" | "INDUSTRIAL" | "OTHER";
export type PropertyCondition = "EXCELLENT" | "VERY_GOOD" | "GOOD" | "NEEDS_RENOVATION";
export type FurnishedStatus = "NO" | "PARTIALLY" | "FULLY";
export type HeatingType = "AUTONOMOUS" | "CENTRAL" | "NATURAL_GAS" | "HEAT_PUMP" | "ELECTRIC" | "NONE";
export type EnergyCertClass = "A_PLUS" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "IN_PROGRESS";
export type PropertyStatus = "ACTIVE" | "PENDING" | "SOLD" | "OFF_MARKET" | "WITHDRAWN";
export type ClientStatus = "LEAD" | "ACTIVE" | "INACTIVE" | "CONVERTED" | "LOST";

// ============================================
// CLIENT PROPERTY PREFERENCES
// ============================================

/**
 * Structured preferences stored in client's property_preferences JSON field
 */
export interface ClientPropertyPreferences {
  // Room requirements
  bedrooms_min?: number;
  bedrooms_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  
  // Size requirements
  size_min_sqm?: number;
  size_max_sqm?: number;
  
  // Floor preferences
  floor_min?: number;
  floor_max?: number;
  ground_floor_only?: boolean;
  
  // Feature requirements (hard requirements)
  requires_elevator?: boolean;
  requires_parking?: boolean;
  requires_pet_friendly?: boolean;
  
  // Soft preferences
  furnished_preference?: FurnishedStatus | "ANY";
  heating_preferences?: HeatingType[];
  energy_class_min?: EnergyCertClass;
  condition_preferences?: PropertyCondition[];
  
  // Amenities
  amenities_required?: string[];  // Must have these
  amenities_preferred?: string[]; // Nice to have
}

// ============================================
// DATA MODELS FOR MATCHING
// ============================================

/**
 * Client data needed for matching calculations
 */
export interface ClientForMatching {
  id: string;
  client_name: string;
  full_name?: string | null;
  intent?: ClientIntent | null;
  purpose?: PropertyPurpose | null;
  budget_min?: Decimal | number | null;
  budget_max?: Decimal | number | null;
  areas_of_interest?: string[] | null;  // JSON parsed as string array
  property_preferences?: ClientPropertyPreferences | null;
  client_status?: ClientStatus | null;
  assigned_to?: string | null;
  organizationId: string;
}

/**
 * Property data needed for matching calculations
 */
export interface PropertyForMatching {
  id: string;
  property_name: string;
  price?: number | null;
  property_type?: PropertyType | null;
  transaction_type?: TransactionType | null;
  property_status?: PropertyStatus | null;
  
  // Location
  area?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  municipality?: string | null;
  
  // Rooms
  bedrooms?: number | null;
  bathrooms?: number | null;
  
  // Size
  size_net_sqm?: Decimal | number | null;
  size_gross_sqm?: Decimal | number | null;
  square_feet?: number | null;
  
  // Features
  floor?: string | null;
  elevator?: boolean | null;
  accepts_pets?: boolean | null;
  furnished?: FurnishedStatus | null;
  heating_type?: HeatingType | null;
  energy_cert_class?: EnergyCertClass | null;
  condition?: PropertyCondition | null;
  
  // Amenities (JSON)
  amenities?: Record<string, boolean> | string[] | null;
  
  // Meta
  assigned_to?: string | null;
  organizationId: string;
}

// ============================================
// MATCHING RESULTS
// ============================================

/**
 * Individual criterion score breakdown
 */
export interface CriterionScore {
  // v1 uses lowercase snake_case ("budget", "location"); v2 uses SCREAMING_SNAKE_CASE ("BUDGET", "LOCATION").
  // Do not compare criterion strings across versions — use the engine's own output for each version.
  criterion: MatchCriterion | MatchCriterionV2;
  weight: number;
  score: number;          // 0-100
  weightedScore: number;  // score * weight
  matched: boolean;       // Quick flag for binary criteria
  reason?: string;        // Human-readable explanation
}

// ============================================
// V2 CRITERION TYPE
// ============================================

/**
 * All possible matching criteria for the v2 engine (Request-based matching).
 * 19 canonical Layer 2 criteria per the Matchmaking System v2 design spec.
 */
export type MatchCriterionV2 =
  | "BUDGET"
  | "PROPERTY_TYPE"
  | "LOCATION"
  | "BEDROOMS"
  | "SIZE"
  | "FLOOR"
  | "CONDITION"
  | "CONSTRUCTION_YEAR"
  | "PARKING"
  | "STORAGE"
  | "ELEVATOR"
  | "GARDEN"
  | "AMENITIES"
  | "INSIDE_CITY_PLAN"
  | "GOLDEN_VISA"
  | "FINANCING_TYPE"
  | "BATHROOMS"
  | "TIMELINE"
  | "ENERGY_CLASS";

/**
 * All possible matching criteria
 */
export type MatchCriterion =
  | "budget"
  | "location"
  | "transaction_type"
  | "property_type"
  | "bedrooms"
  | "size"
  | "amenities"
  | "condition"
  | "furnished"
  | "floor"
  | "elevator"
  | "pet_friendly"
  | "heating"
  | "energy_class"
  | "parking";

/**
 * Complete match result between a client and property
 */
export interface MatchResult {
  clientId: string;
  propertyId: string;
  overallScore: number;     // 0-100 percentage
  breakdown: CriterionScore[];
  matchedCriteria: number;  // Count of criteria with score > 0
  totalCriteria: number;    // Total criteria evaluated
  calculatedAt: Date;
}

/**
 * Match result with client details included
 */
export interface MatchResultWithClient extends MatchResult {
  client: {
    id: string;
    friendlyId: string;
    client_name: string;
    full_name?: string | null;
    intent?: ClientIntent | null;
    budget_min?: number | null;
    budget_max?: number | null;
    client_status?: ClientStatus | null;
  };
}

/**
 * Match result with property details included
 */
export interface MatchResultWithProperty extends MatchResult {
  property: {
    id: string;
    friendlyId: string;
    property_name: string;
    price?: number | null;
    property_type?: PropertyType | null;
    bedrooms?: number | null;
    area?: string | null;
    address_city?: string | null;
    property_status?: PropertyStatus | null;
    imageUrl?: string | null;
  };
}

// ============================================
// ANALYTICS & DASHBOARD
// ============================================

/**
 * Summary of a client for dashboard display
 */
export interface ClientSummary {
  id: string;
  friendlyId: string;
  client_name: string;
  full_name?: string | null;
  intent?: ClientIntent | null;
  budget_min?: number | null;
  budget_max?: number | null;
  client_status?: ClientStatus | null;
  bestMatchScore?: number;
  matchCount?: number;
}

/**
 * Summary of a property for dashboard display
 */
export interface PropertySummary {
  id: string;
  friendlyId: string;
  property_name: string;
  price?: number | null;
  property_type?: PropertyType | null;
  area?: string | null;
  address_city?: string | null;
  property_status?: PropertyStatus | null;
  imageUrl?: string | null;
}

/**
 * Property with match statistics
 */
export interface PropertyWithMatchStats extends PropertySummary {
  matchCount: number;        // Number of clients matching > threshold
  averageMatchScore: number; // Average score across all clients
  topMatchScore: number;     // Highest individual match score
}

/**
 * Distribution bucket for match scores
 */
export interface MatchDistribution {
  range: string;   // e.g., "0-25%", "26-50%", "51-75%", "76-100%"
  min: number;
  max: number;
  count: number;
}

/**
 * Complete analytics data for dashboard
 */
export interface MatchAnalytics {
  // Top matches
  topMatches: Array<MatchResultWithClient & MatchResultWithProperty>;
  
  // Distribution
  matchDistribution: MatchDistribution[];
  
  // Clients needing attention (no good matches)
  unmatchedClients: ClientSummary[];
  
  // Properties with most interest
  hotProperties: PropertyWithMatchStats[];
  
  // Stats
  totalClients: number;
  totalProperties: number;
  averageMatchScore: number;
  clientsWithMatches: number;  // Clients with at least one match > 50%

  // Request-based stats (v2 engine — used by dashboard summary action)
  requestsWithMatches?: number;  // Requests with at least one match > threshold
  totalRequests?: number;        // Total active requests in org
  unmatchedRequests?: number;    // Requests with no matches above threshold
}

// ============================================
// FILTER & OPTIONS
// ============================================

/**
 * Filters for match queries
 */
export interface MatchFilters {
  minScore?: number;           // Minimum match score (0-100)
  clientStatuses?: ClientStatus[];
  propertyStatuses?: PropertyStatus[];
  assignedToUserId?: string;
  propertyTypes?: PropertyType[];
  intents?: ClientIntent[];
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Options for match calculations
 */
export interface MatchOptions {
  limit?: number;
  offset?: number;
  sortBy?: "score" | "date" | "price" | "name";
  sortOrder?: "asc" | "desc";
  includeBreakdown?: boolean;
  minScoreThreshold?: number;
}

// ============================================
// V2 TYPES — Request-based matching engine
// ============================================

export type FinancingStatus = "CASH" | "MORTGAGE" | "MIXED" | "UNSPECIFIED";
export type Timeline = "IMMEDIATE" | "THREE_MONTHS" | "SIX_MONTHS" | "ONE_YEAR" | "FLEXIBLE";

/**
 * Request (demand-side) data needed for v2 matching calculations.
 * Replaces the v1 client-centric model; a Request captures a buyer/renter's
 * structured property requirements.
 */
export interface RequestForMatching {
  id: string;
  organizationId: string;
  assignedAgentId: string | null;

  // Budget
  budgetMin: number | null;
  budgetMax: number | null;

  // Property preferences
  propertyTypes: string[];       // e.g. ["APARTMENT", "HOUSE"]
  purposeOfUse: string | null;   // "RESIDENTIAL" | "COMMERCIAL" | "INVESTMENT" etc.
  transactionType: "BUY" | "RENT" | null;

  // Location preferences
  areas: string[];               // preferred area/neighbourhood names
  municipality: string | null;
  region: string | null;

  // Geo search
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusKm: number | null;

  // Size preferences
  minSizeSqm: number | null;
  maxSizeSqm: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minBathrooms: number | null;

  // Floor preferences
  floorMin: number | null;
  floorMax: number | null;

  // Features & amenities
  requiredAmenities: string[];   // must-have amenities
  preferredAmenities: string[];  // nice-to-have amenities
  parkingRequired: boolean | null;
  storageRequired: boolean | null;
  elevatorRequired: boolean | null;
  accessibilityRequired: boolean | null;

  // Investment criteria
  goldenVisaRequired: boolean | null;
  financingStatus: FinancingStatus | null;
  timeline: Timeline | null;

  // Construction
  yearBuiltMin: number | null;
  yearBuiltMax: number | null;
  newConstructionOnly: boolean | null;

  // Condition / quality preferences
  conditionPreferences: PropertyCondition[] | null;  // e.g. ["EXCELLENT", "VERY_GOOD"]
  energyClassMin: EnergyCertClass | null;             // minimum acceptable energy class

  // Feature preferences (non-hard-requirement)
  gardenRequired: boolean | null;          // null = no preference
  insideCityPlanRequired: boolean | null;  // null = no preference

  // Status
  status: string;  // "ACTIVE" | "PENDING" | "ARCHIVED" etc.
  expires_at: Date | null;
}

/**
 * Extended property data for v2 matching, adding geo and construction fields
 * not present in the v1 PropertyForMatching interface.
 */
export interface PropertyForMatchingV2 extends PropertyForMatching {
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  inside_city_plan: boolean | null;
  year_built: number | null;
  garden: boolean | null;
  parking: boolean | null;
}

/**
 * Complete match result between a Request and a Property (v2 engine)
 */
export interface MatchResultV2 {
  requestId: string;
  propertyId: string;
  overallScore: number;         // 0–100 integer
  financingBonus: number;       // additive bonus (0 or 5)
  breakdown: CriterionScore[];
  matchedCriteria: number;
  totalCriteria: number;
  calculatedAt: Date;
}
