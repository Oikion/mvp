/**
 * Matchmaking System Types
 * 
 * Defines all TypeScript interfaces for the client-property matching engine
 */

import type { Decimal } from "@prisma/client/runtime/library";

// ============================================
// ENUMS (matching Prisma schema)
// ============================================

export type ClientIntent = "BUY" | "RENT" | "SELL" | "LEASE" | "INVEST";
export type PropertyPurpose = "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "PARKING" | "OTHER";
export type TransactionType = "SALE" | "RENTAL" | "SHORT_TERM" | "EXCHANGE";
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
  criterion: MatchCriterion;
  weight: number;
  score: number;          // 0-100
  weightedScore: number;  // score * weight
  matched: boolean;       // Quick flag for binary criteria
  reason?: string;        // Human-readable explanation
}

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
