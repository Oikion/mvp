/**
 * Data Normalizers for Matchmaking
 * 
 * Utilities to normalize and extract data from client/property records
 * for consistent matching calculations.
 */

import type { Decimal } from "@prisma/client/runtime/library";
import type {
  ClientForMatching,
  PropertyForMatching,
  ClientPropertyPreferences,
  FurnishedStatus,
  HeatingType,
  PropertyCondition,
  EnergyCertClass,
} from "./types";

// ============================================
// NUMBER NORMALIZATION
// ============================================

/**
 * Convert Decimal or number to number
 */
export function toNumber(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  // Prisma Decimal
  return Number(value);
}

/**
 * Parse floor string to number
 * Handles: "1", "Ground", "Basement", "-1", "Penthouse", etc.
 */
export function parseFloor(floor: string | null | undefined): number | null {
  if (!floor) return null;
  
  const normalized = floor.toLowerCase().trim();
  
  // Common floor names
  if (normalized === "ground" || normalized === "ισόγειο" || normalized === "0") return 0;
  if (normalized === "basement" || normalized === "υπόγειο" || normalized === "-1") return -1;
  if (normalized === "penthouse" || normalized === "ρετιρέ") return 99; // High number for top floor
  if (normalized === "mezzanine" || normalized === "ημιώροφος" || normalized === "0.5") return 0.5;
  
  // Try parsing as number
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

// ============================================
// PROPERTY PREFERENCES EXTRACTION
// ============================================

/**
 * Extract typed preferences from client's property_preferences JSON field
 */
export function extractPreferences(
  client: ClientForMatching
): ClientPropertyPreferences {
  const prefs = client.property_preferences;
  
  if (!prefs || typeof prefs !== "object") {
    return {};
  }
  
  // If it's already the correct type, return it
  return prefs as ClientPropertyPreferences;
}

/**
 * Get bedroom range from client preferences
 */
export function getBedroomRange(
  prefs: ClientPropertyPreferences
): { min: number | null; max: number | null } {
  return {
    min: prefs.bedrooms_min ?? null,
    max: prefs.bedrooms_max ?? null,
  };
}

/**
 * Get bathroom range from client preferences
 */
export function getBathroomRange(
  prefs: ClientPropertyPreferences
): { min: number | null; max: number | null } {
  return {
    min: prefs.bathrooms_min ?? null,
    max: prefs.bathrooms_max ?? null,
  };
}

/**
 * Get size range in sqm from client preferences
 */
export function getSizeRange(
  prefs: ClientPropertyPreferences
): { min: number | null; max: number | null } {
  return {
    min: prefs.size_min_sqm ?? null,
    max: prefs.size_max_sqm ?? null,
  };
}

/**
 * Get floor range from client preferences
 */
export function getFloorRange(
  prefs: ClientPropertyPreferences
): { min: number | null; max: number | null; groundOnly: boolean } {
  return {
    min: prefs.floor_min ?? null,
    max: prefs.floor_max ?? null,
    groundOnly: prefs.ground_floor_only ?? false,
  };
}

// ============================================
// LOCATION NORMALIZATION
// ============================================

/**
 * Normalize location string for comparison
 * Removes accents, lowercases, and trims
 */
export function normalizeLocation(location: string | null | undefined): string {
  if (!location) return "";
  
  return location
    .toLowerCase()
    .trim()
    // Remove Greek accents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remove common suffixes/prefixes
    .replace(/^(city of|municipality of|δήμος|νομός)\s*/i, "")
    .replace(/\s*(city|municipality|δήμος)$/i, "");
}

/**
 * Get all location identifiers from a property
 */
export function getPropertyLocations(property: PropertyForMatching): string[] {
  const locations: string[] = [];
  
  if (property.area) locations.push(normalizeLocation(property.area));
  if (property.address_city) locations.push(normalizeLocation(property.address_city));
  if (property.municipality) locations.push(normalizeLocation(property.municipality));
  if (property.address_state) locations.push(normalizeLocation(property.address_state));
  
  // Remove duplicates and empty strings
  return [...new Set(locations.filter(Boolean))];
}

/**
 * Parse areas_of_interest from client
 * Handles: JSON string array, already parsed array, or comma-separated string
 */
export function parseAreasOfInterest(
  areas: string[] | string | null | undefined
): string[] {
  if (!areas) return [];
  
  // Already an array
  if (Array.isArray(areas)) {
    return areas.map(normalizeLocation).filter(Boolean);
  }
  
  // JSON string
  if (typeof areas === "string") {
    try {
      const parsed = JSON.parse(areas);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeLocation).filter(Boolean);
      }
    } catch {
      // Not JSON, try comma-separated
      return areas.split(",").map(normalizeLocation).filter(Boolean);
    }
  }
  
  return [];
}

// ============================================
// AMENITIES NORMALIZATION
// ============================================

/**
 * Standard amenity keys for matching
 */
export const STANDARD_AMENITIES = [
  "pool", "gym", "garden", "terrace", "balcony", "storage",
  "security", "concierge", "playground", "bbq", "sauna",
  "jacuzzi", "fireplace", "air_conditioning", "solar_panels",
  "ev_charging", "smart_home", "alarm", "cctv", "intercom"
] as const;

/**
 * Extract amenities from property as a Set of normalized keys
 */
export function extractPropertyAmenities(
  amenities: Record<string, boolean> | string[] | null | undefined
): Set<string> {
  const result = new Set<string>();
  
  if (!amenities) return result;
  
  // Array format
  if (Array.isArray(amenities)) {
    amenities.forEach(a => {
      if (typeof a === "string") {
        result.add(normalizeAmenityKey(a));
      }
    });
    return result;
  }
  
  // Object format { pool: true, gym: false }
  if (typeof amenities === "object") {
    Object.entries(amenities).forEach(([key, value]) => {
      if (value === true) {
        result.add(normalizeAmenityKey(key));
      }
    });
  }
  
  return result;
}

/**
 * Normalize amenity key for consistent matching
 */
export function normalizeAmenityKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Parse client amenity preferences
 */
export function parseAmenityPreferences(
  required: string[] | null | undefined,
  preferred: string[] | null | undefined
): { required: Set<string>; preferred: Set<string> } {
  return {
    required: new Set((required ?? []).map(normalizeAmenityKey)),
    preferred: new Set((preferred ?? []).map(normalizeAmenityKey)),
  };
}

// ============================================
// PROPERTY SIZE NORMALIZATION
// ============================================

/**
 * Get property size in square meters
 * Tries size_net_sqm, then size_gross_sqm, then converts from square_feet
 */
export function getPropertySizeSqm(property: PropertyForMatching): number | null {
  // Prefer net size
  if (property.size_net_sqm) {
    return toNumber(property.size_net_sqm);
  }
  
  // Fall back to gross size
  if (property.size_gross_sqm) {
    return toNumber(property.size_gross_sqm);
  }
  
  // Convert from square feet if available
  if (property.square_feet) {
    return Math.round(property.square_feet * 0.092903); // sq ft to sq m
  }
  
  return null;
}

// ============================================
// BUDGET NORMALIZATION
// ============================================

/**
 * Get client budget range
 */
export function getBudgetRange(
  client: ClientForMatching
): { min: number | null; max: number | null } {
  return {
    min: toNumber(client.budget_min),
    max: toNumber(client.budget_max),
  };
}

/**
 * Check if a price is within budget range with optional tolerance
 */
export function isPriceInBudget(
  price: number | null,
  budgetMin: number | null,
  budgetMax: number | null,
  tolerancePercent: number = 0
): boolean {
  if (price === null) return false;
  
  // No budget constraints
  if (budgetMin === null && budgetMax === null) return true;
  
  const tolerance = tolerancePercent / 100;
  
  // Check min with tolerance
  if (budgetMin !== null) {
    const adjustedMin = budgetMin * (1 - tolerance);
    if (price < adjustedMin) return false;
  }
  
  // Check max with tolerance
  if (budgetMax !== null) {
    const adjustedMax = budgetMax * (1 + tolerance);
    if (price > adjustedMax) return false;
  }
  
  return true;
}

// ============================================
// ENUM NORMALIZATION
// ============================================

/**
 * Normalize furnished status for comparison
 */
export function normalizeFurnished(
  value: string | null | undefined
): FurnishedStatus | null {
  if (!value) return null;
  
  const normalized = value.toUpperCase();
  if (["NO", "UNFURNISHED", "NONE"].includes(normalized)) return "NO";
  if (["PARTIALLY", "PARTIAL", "SEMI"].includes(normalized)) return "PARTIALLY";
  if (["FULLY", "FULL", "YES", "FURNISHED"].includes(normalized)) return "FULLY";
  
  return value as FurnishedStatus;
}

/**
 * Normalize heating type for comparison
 */
export function normalizeHeating(
  value: string | null | undefined
): HeatingType | null {
  if (!value) return null;
  
  const normalized = value.toUpperCase().replace(/[\s_-]+/g, "_");
  
  const mappings: Record<string, HeatingType> = {
    AUTONOMOUS: "AUTONOMOUS",
    INDIVIDUAL: "AUTONOMOUS",
    CENTRAL: "CENTRAL",
    COMMUNAL: "CENTRAL",
    NATURAL_GAS: "NATURAL_GAS",
    GAS: "NATURAL_GAS",
    HEAT_PUMP: "HEAT_PUMP",
    HEATPUMP: "HEAT_PUMP",
    ELECTRIC: "ELECTRIC",
    ELECTRICAL: "ELECTRIC",
    NONE: "NONE",
    NO: "NONE",
  };
  
  return mappings[normalized] ?? (value as HeatingType);
}

/**
 * Normalize property condition for comparison
 */
export function normalizeCondition(
  value: string | null | undefined
): PropertyCondition | null {
  if (!value) return null;
  
  const normalized = value.toUpperCase().replace(/[\s_-]+/g, "_");
  
  const mappings: Record<string, PropertyCondition> = {
    EXCELLENT: "EXCELLENT",
    NEW: "EXCELLENT",
    VERY_GOOD: "VERY_GOOD",
    VERYGOOD: "VERY_GOOD",
    GOOD: "GOOD",
    AVERAGE: "GOOD",
    NEEDS_RENOVATION: "NEEDS_RENOVATION",
    NEEDSRENOVATION: "NEEDS_RENOVATION",
    RENOVATE: "NEEDS_RENOVATION",
    FIXER: "NEEDS_RENOVATION",
  };
  
  return mappings[normalized] ?? (value as PropertyCondition);
}

/**
 * Normalize energy class for comparison
 */
export function normalizeEnergyClass(
  value: string | null | undefined
): EnergyCertClass | null {
  if (!value) return null;
  
  const normalized = value.toUpperCase().replace(/[\s_-]+/g, "_").replace(/\+/g, "_PLUS");
  
  const mappings: Record<string, EnergyCertClass> = {
    A_PLUS: "A_PLUS",
    "A+": "A_PLUS",
    APLUS: "A_PLUS",
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    G: "G",
    H: "H",
    IN_PROGRESS: "IN_PROGRESS",
    PENDING: "IN_PROGRESS",
    INPROGRESS: "IN_PROGRESS",
  };
  
  return mappings[normalized] ?? (value as EnergyCertClass);
}
