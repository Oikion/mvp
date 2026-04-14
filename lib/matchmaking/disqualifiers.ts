/**
 * Layer 1 Disqualifiers — Matchmaking System v2
 *
 * Hard-reject checks that run before any scoring. If a property fails any
 * disqualifier it is excluded entirely from the candidate set.
 *
 * Execution order (short-circuit on first match):
 *   1. ARCHIVED_OR_INACTIVE  — property is not available
 *   2. PURPOSE_MISMATCH      — buy/rent intent conflicts with listing type
 *   3. BUDGET_HARD_FLOOR     — asking price > 115 % of request budgetMax
 *   4. AREA_HARD_EXCLUSION   — property is outside all requested areas
 */

import { toNumber } from "./normalizers";
import type { RequestForMatching, PropertyForMatching } from "./types";

// ============================================
// PUBLIC TYPES
// ============================================

export type DisqualifierReason =
  | "ARCHIVED_OR_INACTIVE"
  | "PURPOSE_MISMATCH"
  | "BUDGET_HARD_FLOOR"
  | "AREA_HARD_EXCLUSION";

export interface DisqualifierResult {
  disqualified: boolean;
  reason?: DisqualifierReason;
  detail?: string;
}

// ============================================
// CONSTANTS
// ============================================

const ALLOWED_STATUSES = new Set(["ACTIVE", "PENDING"]);

/** Property transaction types that satisfy a BUY request */
const BUY_TRANSACTION_TYPES = new Set(["SALE", "EXCHANGE", "AUCTION"]);

/** Property transaction types that satisfy a RENT request */
const RENT_TRANSACTION_TYPES = new Set(["RENTAL", "SHORT_TERM"]);

/** Maximum asking-price multiple over budgetMax before hard rejection */
const BUDGET_SOFT_CEILING_MULTIPLIER = 1.15;

// ============================================
// PRIVATE DISQUALIFIER FUNCTIONS
// Return DisqualifierResult if disqualified, null if the check passes.
// ============================================

function disqualifyInactive(
  _request: RequestForMatching,
  property: PropertyForMatching
): DisqualifierResult | null {
  const status = property.property_status ?? "";
  if (!ALLOWED_STATUSES.has(status)) {
    return {
      disqualified: true,
      reason: "ARCHIVED_OR_INACTIVE",
      detail: `Property status is "${status}"`,
    };
  }
  return null;
}

function disqualifyPurpose(
  request: RequestForMatching,
  property: PropertyForMatching
): DisqualifierResult | null {
  const intent = (request.transactionType ?? "").toUpperCase();
  const listingType = (property.transaction_type ?? "").toUpperCase();

  // If either side is unknown, skip this check (no constraint)
  if (!intent || !listingType) return null;

  const isBuyIntent = intent === "BUY";
  const isRentIntent = intent === "RENT";

  if (isBuyIntent && !BUY_TRANSACTION_TYPES.has(listingType)) {
    return {
      disqualified: true,
      reason: "PURPOSE_MISMATCH",
      detail: `Request intent "${intent}" cannot match listing type "${listingType}"`,
    };
  }

  if (isRentIntent && !RENT_TRANSACTION_TYPES.has(listingType)) {
    return {
      disqualified: true,
      reason: "PURPOSE_MISMATCH",
      detail: `Request intent "${intent}" cannot match listing type "${listingType}"`,
    };
  }

  return null;
}

function disqualifyBudget(
  request: RequestForMatching,
  property: PropertyForMatching
): DisqualifierResult | null {
  const price = toNumber(property.price);
  const budgetMax = toNumber(request.budgetMax);

  // No constraint if either value is absent
  if (price === null || budgetMax === null) return null;

  // Round to the nearest integer to avoid IEEE 754 drift when comparing exact
  // multiples (e.g. 200_000 * 1.15 = 229_999.999... in floating point).
  const ceiling = Math.round(budgetMax * BUDGET_SOFT_CEILING_MULTIPLIER);
  if (price > ceiling) {
    return {
      disqualified: true,
      reason: "BUDGET_HARD_FLOOR",
      detail: `Price ${price} exceeds budgetMax ceiling ${ceiling} (${budgetMax} × ${BUDGET_SOFT_CEILING_MULTIPLIER})`,
    };
  }

  return null;
}

/**
 * Normalize a location string for area matching:
 * lowercase + trim + strip accents.
 */
function normalizeArea(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "");
}

/**
 * Return true when `loc` (a property location token) matches `area` (a
 * requested area string) using bidirectional substring matching after
 * normalization.
 */
function areaMatches(loc: string, area: string): boolean {
  const normLoc = normalizeArea(loc);
  const normArea = normalizeArea(area);
  if (!normLoc || !normArea) return false;
  return normLoc.includes(normArea) || normArea.includes(normLoc);
}

function disqualifyArea(
  request: RequestForMatching,
  property: PropertyForMatching
): DisqualifierResult | null {
  const requestedAreas = request.areas;

  // No area constraint — always passes
  if (!requestedAreas || requestedAreas.length === 0) return null;

  // Gather all location tokens from the property
  const propertyLocations: string[] = [];
  if (property.area) propertyLocations.push(property.area);
  if (property.address_city) propertyLocations.push(property.address_city);
  if (property.municipality) propertyLocations.push(property.municipality);
  if (property.address_state) propertyLocations.push(property.address_state);

  // Property has no location data — cannot confirm it's in any area → disqualify
  if (propertyLocations.length === 0) {
    return {
      disqualified: true,
      reason: "AREA_HARD_EXCLUSION",
      detail: "Property has no location data to match against requested areas",
    };
  }

  // Check if ANY property location token matches ANY requested area
  for (const area of requestedAreas) {
    for (const loc of propertyLocations) {
      if (areaMatches(loc, area)) return null; // found a match → passes
    }
  }

  return {
    disqualified: true,
    reason: "AREA_HARD_EXCLUSION",
    detail: `Property location does not match any of the requested areas: [${requestedAreas.join(", ")}]`,
  };
}

// ============================================
// PUBLIC ENTRY POINT
// ============================================

/**
 * Run all Layer 1 disqualifiers in priority order.
 * Returns on the first failure (short-circuit).
 * Returns `{ disqualified: false }` when all checks pass.
 */
export function checkDisqualifiers(
  request: RequestForMatching,
  property: PropertyForMatching
): DisqualifierResult {
  return (
    disqualifyInactive(request, property) ??
    disqualifyPurpose(request, property) ??
    disqualifyBudget(request, property) ??
    disqualifyArea(request, property) ??
    { disqualified: false }
  );
}
