import { describe, it, expect } from "vitest";
import {
  calculateMatchScoreV2,
  calculateBatchMatchesV2,
} from "@/lib/matchmaking/calculator";
import type {
  RequestForMatching,
  PropertyForMatchingV2,
  MatchCriterionV2,
} from "@/lib/matchmaking/types";

// ---------------------------------------------------------------------------
// Base fixtures
// ---------------------------------------------------------------------------

const baseRequest: RequestForMatching = {
  id: "req-1",
  organizationId: "org-1",
  assignedAgentId: null,
  budgetMin: null,
  budgetMax: null,
  propertyTypes: [],
  purposeOfUse: null,
  transactionType: "BUY",
  areas: [],
  municipality: null,
  region: null,
  centerLatitude: null,
  centerLongitude: null,
  radiusKm: null,
  minSizeSqm: null,
  maxSizeSqm: null,
  minBedrooms: null,
  maxBedrooms: null,
  minBathrooms: null,
  floorMin: null,
  floorMax: null,
  requiredAmenities: [],
  preferredAmenities: [],
  parkingRequired: null,
  storageRequired: null,
  elevatorRequired: null,
  accessibilityRequired: null,
  goldenVisaRequired: null,
  financingStatus: null,
  timeline: null,
  yearBuiltMin: null,
  yearBuiltMax: null,
  newConstructionOnly: null,
  conditionPreferences: null,
  energyClassMin: null,
  gardenRequired: null,
  insideCityPlanRequired: null,
  status: "ACTIVE",
  expires_at: null,
};

const baseProperty: PropertyForMatchingV2 = {
  id: "prop-1",
  property_name: "Athens Apartment",
  organizationId: "org-1",
  property_status: "ACTIVE",
  transaction_type: "SALE",
  price: null,
  property_type: null,
  area: null,
  address_city: null,
  address_state: null,
  municipality: null,
  bedrooms: null,
  bathrooms: null,
  size_net_sqm: null,
  size_gross_sqm: null,
  square_feet: null,
  floor: null,
  elevator: null,
  accepts_pets: null,
  furnished: null,
  heating_type: null,
  energy_cert_class: null,
  condition: null,
  amenities: null,
  assigned_to: null,
  latitude: null,
  longitude: null,
  region: null,
  inside_city_plan: null,
  year_built: null,
  garden: null,
  parking: null,
};

function findCriterion(
  breakdown: Array<{ criterion: string; score: number; weight: number; weightedScore: number }>,
  criterion: MatchCriterionV2
) {
  return breakdown.find((c) => c.criterion === criterion);
}

// ---------------------------------------------------------------------------
// Layer 1 disqualifiers
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — Layer 1 disqualifiers", () => {
  it("returns overallScore=0 and empty breakdown when property is SOLD", () => {
    const property: PropertyForMatchingV2 = { ...baseProperty, property_status: "SOLD" };
    const result = calculateMatchScoreV2(baseRequest, property);

    expect(result.overallScore).toBe(0);
    expect(result.breakdown).toEqual([]);
    expect(result.matchedCriteria).toBe(0);
    expect(result.totalCriteria).toBe(0);
  });

  it("returns overallScore=0 when RENT request meets SALE property", () => {
    const request: RequestForMatching = { ...baseRequest, transactionType: "RENT" };
    const property: PropertyForMatchingV2 = { ...baseProperty, transaction_type: "SALE" };
    const result = calculateMatchScoreV2(request, property);

    expect(result.overallScore).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it("sets requestId and propertyId on the result", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    expect(result.requestId).toBe("req-1");
    expect(result.propertyId).toBe("prop-1");
  });

  it("populates calculatedAt with a Date", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    expect(result.calculatedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Breakdown structure
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — breakdown structure", () => {
  it("includes exactly 19 entries in breakdown when not disqualified", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    expect(result.breakdown).toHaveLength(19);
  });

  it("uses SCREAMING_SNAKE_CASE criterion keys (BUDGET exists)", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget).toBeDefined();
    expect(budget?.criterion).toBe("BUDGET");
  });

  it("has all 19 canonical v2 criteria in breakdown", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    const expected: MatchCriterionV2[] = [
      "BUDGET",
      "PROPERTY_TYPE",
      "LOCATION",
      "BEDROOMS",
      "SIZE",
      "FLOOR",
      "CONDITION",
      "CONSTRUCTION_YEAR",
      "PARKING",
      "STORAGE",
      "ELEVATOR",
      "GARDEN",
      "AMENITIES",
      "INSIDE_CITY_PLAN",
      "GOLDEN_VISA",
      "FINANCING_TYPE",
      "BATHROOMS",
      "TIMELINE",
      "ENERGY_CLASS",
    ];
    for (const key of expected) {
      const entry = findCriterion(result.breakdown, key);
      expect(entry, `missing criterion ${key}`).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// BUDGET scoring
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — BUDGET", () => {
  it("scores 100 when price is within budget range", () => {
    const request: RequestForMatching = { ...baseRequest, budgetMin: 100_000, budgetMax: 300_000 };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 200_000 };
    const result = calculateMatchScoreV2(request, property);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget?.score).toBe(100);
  });

  it("scores ~80 when price is in soft-zone above budgetMax (<=1.15x)", () => {
    // budgetMax=200k, softCeiling=230k; price=210k → overFraction=(10k/30k)≈0.333 → 100-0.333*60≈80
    const request: RequestForMatching = { ...baseRequest, budgetMin: null, budgetMax: 200_000 };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 210_000 };
    const result = calculateMatchScoreV2(request, property);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget?.score).toBe(80);
  });

  it("scores 75 when price is under budgetMin (non-investment, <40% under)", () => {
    // price=150k, budgetMin=200k → underPercent=25% → not >40% → score=75
    const request: RequestForMatching = { ...baseRequest, budgetMin: 200_000, budgetMax: 400_000 };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 150_000 };
    const result = calculateMatchScoreV2(request, property);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget?.score).toBe(75);
  });

  it("scores 50 (neutral) when property has no price", () => {
    const request: RequestForMatching = { ...baseRequest, budgetMin: 100_000, budgetMax: 300_000 };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: null };
    const result = calculateMatchScoreV2(request, property);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget?.score).toBe(50);
  });

  it("scores 50 when request has no budgetMax", () => {
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 250_000 };
    const result = calculateMatchScoreV2(baseRequest, property);
    const budget = findCriterion(result.breakdown, "BUDGET");
    expect(budget?.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// BEDROOMS scoring
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — BEDROOMS", () => {
  it("scores 100 when bedrooms is within [min, max]", () => {
    const request: RequestForMatching = { ...baseRequest, minBedrooms: 2, maxBedrooms: 3 };
    const property: PropertyForMatchingV2 = { ...baseProperty, bedrooms: 3 };
    const result = calculateMatchScoreV2(request, property);
    const b = findCriterion(result.breakdown, "BEDROOMS");
    expect(b?.score).toBe(100);
  });

  it("scores 20 when bedrooms is below minBedrooms by 2 (deficit=2)", () => {
    // minBedrooms=3, property=1 → deficit=2 → max(0, 40-(2-1)*20)=20
    const request: RequestForMatching = { ...baseRequest, minBedrooms: 3, maxBedrooms: 4 };
    const property: PropertyForMatchingV2 = { ...baseProperty, bedrooms: 1 };
    const result = calculateMatchScoreV2(request, property);
    const b = findCriterion(result.breakdown, "BEDROOMS");
    expect(b?.score).toBe(20);
  });

  it("scores 70 when bedrooms is above maxBedrooms by 2 (surplus=2)", () => {
    // maxBedrooms=2, property=4 → surplus=2 → max(40, 80-(2-1)*10)=70
    const request: RequestForMatching = { ...baseRequest, minBedrooms: 1, maxBedrooms: 2 };
    const property: PropertyForMatchingV2 = { ...baseProperty, bedrooms: 4 };
    const result = calculateMatchScoreV2(request, property);
    const b = findCriterion(result.breakdown, "BEDROOMS");
    expect(b?.score).toBe(70);
  });

  it("scores 50 when no preference", () => {
    const property: PropertyForMatchingV2 = { ...baseProperty, bedrooms: 3 };
    const result = calculateMatchScoreV2(baseRequest, property);
    const b = findCriterion(result.breakdown, "BEDROOMS");
    expect(b?.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Financing bonus
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — financing bonus", () => {
  it("applies +5 bonus when financingStatus=CASH and price >= 500_000", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      financingStatus: "CASH",
      budgetMin: 400_000,
      budgetMax: 600_000,
    };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 500_000 };
    const result = calculateMatchScoreV2(request, property);
    expect(result.financingBonus).toBe(5);
  });

  it("no bonus when financingStatus=CASH but price < 500_000", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      financingStatus: "CASH",
      budgetMin: 100_000,
      budgetMax: 400_000,
    };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 300_000 };
    const result = calculateMatchScoreV2(request, property);
    expect(result.financingBonus).toBe(0);
  });

  it("no bonus when financingStatus=MORTGAGE and price >= 500_000", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      financingStatus: "MORTGAGE",
      budgetMin: 400_000,
      budgetMax: 600_000,
    };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 500_000 };
    const result = calculateMatchScoreV2(request, property);
    expect(result.financingBonus).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Golden visa
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — GOLDEN_VISA", () => {
  it("scores 100 when goldenVisaRequired=true and price >= Attica threshold (800k)", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      goldenVisaRequired: true,
      budgetMin: 700_000,
      budgetMax: 900_000,
    };
    const property: PropertyForMatchingV2 = {
      ...baseProperty,
      region: "Attica",
      price: 850_000,
    };
    const result = calculateMatchScoreV2(request, property);
    const gv = findCriterion(result.breakdown, "GOLDEN_VISA");
    expect(gv?.score).toBe(100);
  });

  it("scores 0 when goldenVisaRequired=true and price < threshold (Crete 400k)", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      goldenVisaRequired: true,
      budgetMin: 100_000,
      budgetMax: 400_000,
    };
    const property: PropertyForMatchingV2 = {
      ...baseProperty,
      region: "Crete",
      price: 300_000,
    };
    const result = calculateMatchScoreV2(request, property);
    const gv = findCriterion(result.breakdown, "GOLDEN_VISA");
    expect(gv?.score).toBe(0);
  });

  it("scores 50 (neutral) when goldenVisaRequired is not true", () => {
    const result = calculateMatchScoreV2(baseRequest, baseProperty);
    const gv = findCriterion(result.breakdown, "GOLDEN_VISA");
    expect(gv?.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Overall score clamping
// ---------------------------------------------------------------------------

describe("calculateMatchScoreV2 — overall score", () => {
  it("never exceeds 100 even with perfect match + financing bonus", () => {
    const request: RequestForMatching = {
      ...baseRequest,
      budgetMin: 400_000,
      budgetMax: 600_000,
      propertyTypes: ["APARTMENT"],
      areas: ["Athens"],
      minBedrooms: 2,
      maxBedrooms: 3,
      minSizeSqm: 80,
      maxSizeSqm: 120,
      minBathrooms: 1,
      parkingRequired: true,
      storageRequired: true,
      elevatorRequired: true,
      goldenVisaRequired: false,
      financingStatus: "CASH",
      yearBuiltMin: 2000,
      yearBuiltMax: 2020,
      requiredAmenities: ["gym"],
    };
    const property: PropertyForMatchingV2 = {
      ...baseProperty,
      property_type: "APARTMENT",
      area: "Athens",
      price: 500_000,
      bedrooms: 3,
      bathrooms: 2,
      size_net_sqm: 100,
      elevator: true,
      parking: true,
      amenities: { gym: true, storage: true },
      year_built: 2010,
    };
    const result = calculateMatchScoreV2(request, property);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("returns overallScore as an integer", () => {
    const request: RequestForMatching = { ...baseRequest, budgetMin: 100_000, budgetMax: 300_000 };
    const property: PropertyForMatchingV2 = { ...baseProperty, price: 200_000 };
    const result = calculateMatchScoreV2(request, property);
    expect(Number.isInteger(result.overallScore)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Batch calculator
// ---------------------------------------------------------------------------

describe("calculateBatchMatchesV2", () => {
  it("returns R×P results for the cartesian product of requests and properties", () => {
    const requests = [baseRequest, { ...baseRequest, id: "req-2" }];
    const properties = [
      baseProperty,
      { ...baseProperty, id: "prop-2" },
      { ...baseProperty, id: "prop-3" },
    ];
    const results = calculateBatchMatchesV2(requests, properties);
    expect(results).toHaveLength(6);
  });

  it("sets correct requestId/propertyId on each result", () => {
    const requests = [baseRequest];
    const properties = [baseProperty, { ...baseProperty, id: "prop-2" }];
    const results = calculateBatchMatchesV2(requests, properties);
    expect(results[0].requestId).toBe("req-1");
    expect(results[0].propertyId).toBe("prop-1");
    expect(results[1].requestId).toBe("req-1");
    expect(results[1].propertyId).toBe("prop-2");
  });
});
