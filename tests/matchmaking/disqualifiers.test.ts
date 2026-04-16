import { describe, it, expect } from "vitest";
import { checkDisqualifiers } from "@/lib/matchmaking/disqualifiers";
import type { RequestForMatching, PropertyForMatching } from "@/lib/matchmaking/types";

// ---------------------------------------------------------------------------
// Base fixtures — every required field populated with a safe default
// ---------------------------------------------------------------------------

const baseRequest: RequestForMatching = {
  id: "req-1",
  organizationId: "org-1",
  assignedAgentId: null,
  // Budget
  budgetMin: null,
  budgetMax: null,
  // Property preferences
  propertyTypes: [],
  purposeOfUse: null,
  transactionType: "BUY",
  // Location
  areas: [],
  municipality: null,
  region: null,
  // Geo
  centerLatitude: null,
  centerLongitude: null,
  radiusKm: null,
  // Size
  minSizeSqm: null,
  maxSizeSqm: null,
  minBedrooms: null,
  maxBedrooms: null,
  minBathrooms: null,
  // Floor
  floorMin: null,
  floorMax: null,
  // Features
  requiredAmenities: [],
  preferredAmenities: [],
  parkingRequired: null,
  storageRequired: null,
  elevatorRequired: null,
  accessibilityRequired: null,
  // Investment
  goldenVisaRequired: null,
  financingStatus: null,
  timeline: null,
  // Construction
  yearBuiltMin: null,
  yearBuiltMax: null,
  newConstructionOnly: null,
  // Status
  status: "ACTIVE",
  expires_at: null,
};

const baseProperty: PropertyForMatching = {
  id: "prop-1",
  property_name: "Test Property",
  organizationId: "org-1",
  property_status: "ACTIVE",
  transaction_type: "SALE",
};

// ---------------------------------------------------------------------------
// ARCHIVED_OR_INACTIVE (4 tests)
// ---------------------------------------------------------------------------

describe("checkDisqualifiers — ARCHIVED_OR_INACTIVE", () => {
  it("disqualifies a SOLD property", () => {
    const property = { ...baseProperty, property_status: "SOLD" as const };
    const result = checkDisqualifiers(baseRequest, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("ARCHIVED_OR_INACTIVE");
  });

  it("disqualifies an OFF_MARKET property", () => {
    const property = { ...baseProperty, property_status: "OFF_MARKET" as const };
    const result = checkDisqualifiers(baseRequest, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("ARCHIVED_OR_INACTIVE");
  });

  it("passes an ACTIVE property", () => {
    const property = { ...baseProperty, property_status: "ACTIVE" as const };
    const result = checkDisqualifiers(baseRequest, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes a PENDING property", () => {
    const property = { ...baseProperty, property_status: "PENDING" as const };
    const result = checkDisqualifiers(baseRequest, property);
    expect(result.disqualified).toBe(false);
  });

  it("disqualifies WITHDRAWN property", () => {
    const result = checkDisqualifiers(baseRequest, {
      ...baseProperty,
      property_status: "WITHDRAWN",
    });
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("ARCHIVED_OR_INACTIVE");
  });
});

// ---------------------------------------------------------------------------
// PURPOSE_MISMATCH (5 tests)
// ---------------------------------------------------------------------------

describe("checkDisqualifiers — PURPOSE_MISMATCH", () => {
  it("disqualifies a RENT request against a SALE property", () => {
    const request = { ...baseRequest, transactionType: "RENT" as const };
    const property = { ...baseProperty, transaction_type: "SALE" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("PURPOSE_MISMATCH");
  });

  it("disqualifies a BUY request against a RENTAL property", () => {
    const request = { ...baseRequest, transactionType: "BUY" as const };
    const property = { ...baseProperty, transaction_type: "RENTAL" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("PURPOSE_MISMATCH");
  });

  it("passes a BUY request against a SALE property", () => {
    const request = { ...baseRequest, transactionType: "BUY" as const };
    const property = { ...baseProperty, transaction_type: "SALE" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes a RENT request against a RENTAL property", () => {
    const request = { ...baseRequest, transactionType: "RENT" as const };
    const property = { ...baseProperty, transaction_type: "RENTAL" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes a RENT request against a SHORT_TERM property", () => {
    const request = { ...baseRequest, transactionType: "RENT" as const };
    const property = { ...baseProperty, transaction_type: "SHORT_TERM" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BUDGET_HARD_FLOOR (4 tests)
// ---------------------------------------------------------------------------

describe("checkDisqualifiers — BUDGET_HARD_FLOOR", () => {
  it("disqualifies when price exceeds budgetMax * 1.15 (240k > 230k)", () => {
    const request = { ...baseRequest, budgetMax: 200_000 };
    const property = { ...baseProperty, price: 240_000 }; // 240k > 200k * 1.15 = 230k
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("BUDGET_HARD_FLOOR");
  });

  it("does NOT disqualify when price equals budgetMax * 1.15 exactly", () => {
    const request = { ...baseRequest, budgetMax: 200_000 };
    const property = { ...baseProperty, price: 230_000 }; // exactly 200k * 1.15
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("does NOT disqualify when budgetMax is null", () => {
    const request = { ...baseRequest, budgetMax: null };
    const property = { ...baseProperty, price: 999_999 };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("does NOT disqualify when price is null", () => {
    const request = { ...baseRequest, budgetMax: 200_000 };
    const property = { ...baseProperty, price: null };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AREA_HARD_EXCLUSION (4 tests)
// ---------------------------------------------------------------------------

describe("checkDisqualifiers — AREA_HARD_EXCLUSION", () => {
  it("disqualifies when property area does not match any requested area", () => {
    const request = { ...baseRequest, areas: ["Glyfada", "Voula"] };
    const property = { ...baseProperty, area: "Kifissia" };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("AREA_HARD_EXCLUSION");
  });

  it("passes when property area matches case-insensitively (lowercase property.area)", () => {
    const request = { ...baseRequest, areas: ["Glyfada", "Voula"] };
    const property = { ...baseProperty, area: "glyfada" };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes when request.areas is empty (no area constraint)", () => {
    const request = { ...baseRequest, areas: [] };
    const property = { ...baseProperty, area: "Anywhere" };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes when property.area is null but address_city matches a requested area", () => {
    const request = { ...baseRequest, areas: ["Voula"] };
    const property = { ...baseProperty, area: null, address_city: "Voula" };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });
});
