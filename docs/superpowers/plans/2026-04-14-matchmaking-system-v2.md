# Matchmaking System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 Client→Property matching engine with a native Request→Property engine featuring a 3-layer scoring architecture (hard disqualifiers, 19 weighted criteria, geodesic location) with intra-org cron persistence, per-org weight overrides, and a manual "run now" trigger.

**Architecture:** A pure scoring library (`lib/matchmaking/`) stays computation-only with no Prisma imports; server actions orchestrate data fetching, caching results into `PropertyRequestMatch` rows, and triggering recalculation. Three scopes: intra-org (cron every 30 min), bilateral cross-org, and Polis network.

**Tech Stack:** TypeScript, Prisma 7 (PostgreSQL), Next.js App Router server actions, Vercel cron

---

## File Structure

### Created
- `lib/matchmaking/constants/golden-visa.ts` — regional threshold tiers for Golden Visa scoring
- `lib/matchmaking/geo.ts` — Haversine distance + radius-based location score
- `lib/matchmaking/disqualifiers.ts` — Layer 1: 4 hard disqualifiers (fast reject before weighted scoring)
- `actions/matchmaking/compute-intra-org-matches.ts` — batch score requests vs properties, upsert to `PropertyRequestMatch`
- `app/api/cron/intra-org-matches/route.ts` — 30-min cron endpoint
- `app/api/matchmaking/run-now/route.ts` — manual trigger (rate-limited per request)
- `tests/matchmaking/disqualifiers.test.ts`
- `tests/matchmaking/calculator-v2.test.ts`
- `tests/matchmaking/geo.test.ts`

### Modified
- `prisma/schema.prisma` — 3 new fields, 2 new models, 2 new enums, CrossOrgMatch rename
- `lib/matchmaking/types.ts` — add `RequestForMatching`, extend `PropertyForMatching`, expand `MatchCriterion`
- `lib/matchmaking/weights.ts` — replace v1 15-criterion weights with v2 19-criterion, add `getWeightV2()` (renamed from `getWeight` to avoid duplicate export collision)
- `lib/matchmaking/normalizers.ts` — remove `@ts-nocheck`, fix broken Prisma Decimal import, add `parseConstructionYear()`
- `lib/matchmaking/calculator.ts` — remove `@ts-nocheck`, add `calculateMatchScoreV2()` + 19 criterion scorers
- `lib/matchmaking/index.ts` — barrel: export all v2 symbols
- `actions/matchmaking/get-request-matches.ts` — use v2 engine, fetch all missing fields, remove adaptation dance
- `actions/network/compute-cross-org-matches.ts` — migrate Mandate→Request, new CrossOrgMatch columns
- `vercel.json` — add 30-min intra-org cron

---

## Task 1: Schema Additions + CrossOrgMatch Migration

**Files:**
- Modify: `prisma/schema.prisma`

### What's changing

| Location | Change |
|---|---|
| `Properties` model | Add `latitude Float?`, `longitude Float?` |
| `PropertyRequestMatch` model | Add `scoreBreakdown Json?` |
| `Request` model | Add `lastMatchRunAt DateTime?` |
| `CrossOrgMatch` model | Rename `mandateId→requestId`, `mandateOrgId→requestOrgId`; add `scope CrossOrgScope @default(BILATERAL)`; update unique + @@map |
| New enum | `CrossOrgScope { BILATERAL POLIS }` |
| New enum | `CalibrationStatus { PENDING APPLIED DISMISSED }` |
| New model | `OrgMatchWeights` — per-org criterion weight overrides |
| New model | `WeightCalibrationReport` — weekly calibration run records |

- [ ] **Step 1: Add latitude/longitude to Properties and scoreBreakdown + lastMatchRunAt**

Open `prisma/schema.prisma`.

In the `Properties` model, after `regional_unit String?` (around line 614), add:
```prisma
  latitude               Float?
  longitude              Float?
```

In the `PropertyRequestMatch` model, after `agentNotes String?`, add:
```prisma
  scoreBreakdown  Json?           // Per-criterion breakdown stored for UI display
```

In the `Request` model, after `expiresAt DateTime?` (in the Timeline section around line 3830), add:
```prisma
  lastMatchRunAt DateTime?        // Throttle manual "run now" triggers
```

- [ ] **Step 2: Replace CrossOrgMatch model**

Find the existing `CrossOrgMatch` model and replace it entirely:

```prisma
model CrossOrgMatch {
  id            String        @id @default(cuid())
  requestOrgId  String
  requestId     String
  propertyOrgId String
  propertyId    String
  scope         CrossOrgScope @default(BILATERAL)
  matchScore    Int
  breakdown     Json
  computedAt    DateTime      @default(now())
  expiresAt     DateTime

  @@unique([requestId, propertyId, scope])
  @@index([requestOrgId])
  @@index([propertyOrgId])
  @@index([expiresAt])
  @@map("cross_org_matches")
}
```

- [ ] **Step 3: Add CrossOrgScope and CalibrationStatus enums**

Find the existing enum block (e.g. near `CrossOrgScope`—if absent, add after `FinancingStatus` enum):

```prisma
enum CrossOrgScope {
  BILATERAL
  POLIS
}

enum CalibrationStatus {
  PENDING
  APPLIED
  DISMISSED
}
```

- [ ] **Step 4: Add OrgMatchWeights model**

Add after the `CrossOrgMatch` model:

```prisma
/// Per-org overrides for matchmaking criterion weights.
/// weights is a JSON map of { [criterion: string]: number }.
/// Missing criteria fall back to MATCH_WEIGHTS_V2 defaults.
model OrgMatchWeights {
  id             String   @id @default(cuid())
  organizationId String   @unique  // @unique creates its own index — no @@index needed
  weights        Json     // Partial<Record<MatchCriterionV2, number>>
  updatedAt      DateTime @updatedAt
  updatedBy      String?

  @@map("org_match_weights")
}
```

- [ ] **Step 5: Add WeightCalibrationReport model**

Add immediately after `OrgMatchWeights`:

```prisma
/// Records of the weekly automated weight calibration analysis.
/// Admin must explicitly apply a report; it is never auto-applied.
model WeightCalibrationReport {
  id              String            @id @default(cuid())
  organizationId  String
  status          CalibrationStatus @default(PENDING)
  proposedWeights Json              // Record<MatchCriterionV2, number>
  rationale       Json              // Human-readable per-criterion reasoning
  lookbackDays    Int               @default(90)
  computedAt      DateTime          @default(now())
  reviewedAt      DateTime?
  reviewedBy      String?
  appliedAt       DateTime?

  @@index([organizationId])
  @@index([status])
  @@index([computedAt])
  @@map("weight_calibration_reports")
}
```

- [ ] **Step 6: Generate migration and run it**

```bash
pnpm db:migrate
# When prompted for a migration name, enter: matchmaking_v2_schema
```

Expected output: `Your database is now in sync with your schema.`

Then regenerate the Prisma client:

```bash
pnpm prisma generate
```

Expected: `Generated Prisma Client` with no errors.

> ⚠️ **CrossOrgMatch note**: The rename from `mandateId/mandateOrgId` → `requestId/requestOrgId` drops all existing rows (they're a 30-day TTL cache). Prisma will generate a `DROP TABLE` + `CREATE TABLE` if you let it. That's acceptable — run `pnpm prisma migrate dev --name matchmaking_v2_schema` and confirm the destructive migration prompt.

- [ ] **Step 7: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(matchmaking): v2 schema — lat/lon, scoreBreakdown, CrossOrgScope, OrgMatchWeights, WeightCalibrationReport"
```

---

## Task 2: Golden Visa Constants

**Files:**
- Create: `lib/matchmaking/constants/golden-visa.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// lib/matchmaking/constants/golden-visa.ts

/**
 * Greek Golden Visa regional price thresholds.
 *
 * Greece uses a two-tier system since 2023:
 * - Tier A (Athens, Thessaloniki, Mykonos, Santorini / Thira): ≥ €800,000
 * - Tier B (all other regions): ≥ €400,000
 *
 * Matching is done against the property's `region` or `municipality` field,
 * normalized to lowercase before lookup.
 */

export const GOLDEN_VISA_HIGH_TIER_REGIONS = new Set([
  "attica",
  "athens",
  "athina",
  "attiki",
  "thessaloniki",
  "mykonos",
  "mykonos island",
  "santorini",
  "thira",
  "θήρα",
  "σαντορίνη",
  "μύκονος",
  "αθήνα",
  "θεσσαλονίκη",
  "αττική",
]);

export const GOLDEN_VISA_THRESHOLD_TIER_A = 800_000; // €
export const GOLDEN_VISA_THRESHOLD_TIER_B = 400_000; // €

/**
 * Returns the applicable Golden Visa threshold for a property,
 * based on its region or municipality (case-insensitive).
 */
export function getGoldenVisaThreshold(
  region?: string | null,
  municipality?: string | null,
): number {
  const regionLower = (region ?? "").toLowerCase().trim();
  const municipalityLower = (municipality ?? "").toLowerCase().trim();

  if (
    GOLDEN_VISA_HIGH_TIER_REGIONS.has(regionLower) ||
    GOLDEN_VISA_HIGH_TIER_REGIONS.has(municipalityLower)
  ) {
    return GOLDEN_VISA_THRESHOLD_TIER_A;
  }
  return GOLDEN_VISA_THRESHOLD_TIER_B;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/matchmaking/constants/golden-visa.ts
git commit -m "feat(matchmaking): add golden visa regional threshold constants"
```

---

## Task 3: Geodesic Scoring Utilities

**Files:**
- Create: `lib/matchmaking/geo.ts`
- Create: `tests/matchmaking/geo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/matchmaking/geo.test.ts
import { describe, it, expect } from "vitest";
import { haversineDistanceKm, scoreByRadius } from "@/lib/matchmaking/geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm(37.9838, 23.7275, 37.9838, 23.7275)).toBe(0);
  });

  it("calculates Athens → Thessaloniki (~491 km)", () => {
    const dist = haversineDistanceKm(37.9838, 23.7275, 40.6401, 22.9444);
    expect(dist).toBeGreaterThan(480);
    expect(dist).toBeLessThan(510);
  });

  it("calculates a short distance correctly (~2.5 km)", () => {
    // Syntagma → Acropolis
    const dist = haversineDistanceKm(37.9754, 23.7348, 37.9715, 23.7257);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });
});

describe("scoreByRadius", () => {
  it("returns maxPoints when property is at request center", () => {
    expect(scoreByRadius(0, 5, 100)).toBe(100);
  });

  it("returns 0 when property is beyond 1.2x radius", () => {
    expect(scoreByRadius(7, 5, 100)).toBe(0); // 7 > 5 * 1.2
  });

  it("returns partial score between 0 and maxPoints", () => {
    const score = scoreByRadius(3, 5, 100);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("never returns negative", () => {
    expect(scoreByRadius(100, 5, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/matchmaking/geo.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/matchmaking/geo'`

- [ ] **Step 3: Create geo.ts**

```typescript
// lib/matchmaking/geo.ts

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula: great-circle distance between two lat/lon points in km.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Score a property's location against a request's geo center + radius.
 *
 * Uses a linear decay: full score at distance=0, zero at distance=radiusKm*1.2.
 * The 1.2x buffer acknowledges that strict radius circles create hard edges
 * (e.g. a property 50m outside a 5km radius is still highly relevant).
 *
 * @param distanceKm - Distance from property to request center
 * @param radiusKm   - Request search radius
 * @param maxPoints  - Maximum score points (the criterion weight)
 */
export function scoreByRadius(
  distanceKm: number,
  radiusKm: number,
  maxPoints: number,
): number {
  const effectiveRadius = radiusKm * 1.2;
  return Math.max(0, Math.round(maxPoints * (1 - distanceKm / effectiveRadius)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/matchmaking/geo.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matchmaking/geo.ts tests/matchmaking/geo.test.ts
git commit -m "feat(matchmaking): add Haversine geo scoring utility"
```

---

## Task 4: Update Types

**Files:**
- Modify: `lib/matchmaking/types.ts`

- [ ] **Step 1: Add new type aliases at the top**

In `lib/matchmaking/types.ts`, after the existing `EnergyCertClass` type and before the `ClientPropertyPreferences` interface, add new enums that the v2 engine uses natively from the Prisma schema:

```typescript
// ── v2 additions ──────────────────────────────────
export type FinancingStatus =
  | "CASH"
  | "MORTGAGE_PREAPPROVED"
  | "MORTGAGE_PENDING"
  | "SEEKING_FINANCING"
  | "UNKNOWN";

export type Timeline =
  | "IMMEDIATE"
  | "ONE_THREE_MONTHS"
  | "THREE_SIX_MONTHS"
  | "SIX_PLUS_MONTHS";
```

- [ ] **Step 2: Add RequestForMatching interface**

Add after the `ClientForMatching` interface:

```typescript
/**
 * A buyer/renter search brief (Request) adapted for the v2 matching engine.
 * Uses the Request model's native camelCase field names — no adaptation dance.
 */
export interface RequestForMatching {
  id: string;
  friendlyId?: string | null;

  // Classification
  requestType: "BUY" | "RENT";
  propertyCategory?: PropertyPurpose | null;
  propertyTypes?: PropertyType[] | null;

  // Budget
  budgetMin?: Decimal | number | null;
  budgetMax?: Decimal | number | null;

  // Size
  surfaceMin?: Decimal | number | null;
  surfaceMax?: Decimal | number | null;

  // Rooms
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  bathroomsMin?: number | null;
  bathroomsMax?: number | null;

  // Floor
  floorMin?: number | null;
  floorMax?: number | null;
  groundFloorOnly?: boolean | null;

  // Construction
  constructionYearMin?: number | null;
  constructionYearMax?: number | null;

  // Features
  conditionPreference?: PropertyCondition[] | null;
  heatingTypes?: HeatingType[] | null;
  energyClassMin?: EnergyCertClass | null;
  furnished?: FurnishedStatus | null;
  requiresElevator?: boolean | null;
  requiresParking?: boolean | null;
  requiresStorage?: boolean | null;
  requiresGarden?: boolean | null;
  petFriendly?: boolean | null;
  insideCityPlan?: boolean | null;
  amenities?: Record<string, boolean> | null;

  // Investment
  goldenVisaEligible?: boolean | null;
  financingStatus?: FinancingStatus | null;

  // Timeline
  timeline?: Timeline | null;

  // Location — text-based fallback
  areasOfInterest?: string[] | null;
  municipality?: string | null;
  region?: string | null;

  // Location — geodesic (preferred when populated)
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  radiusKm?: number | null;

  // Meta
  organizationId: string;
  assignedAgentId?: string | null;
}
```

- [ ] **Step 3: Extend PropertyForMatching**

In the existing `PropertyForMatching` interface, add after `assigned_to`:

```typescript
  // Geodesic coordinates (v2)
  latitude?: number | null;
  longitude?: number | null;

  // Additional scoring fields (v2)
  region?: string | null;
  inside_city_plan?: boolean | null;
  year_built?: number | null;
```

- [ ] **Step 4: Expand MatchCriterion to 19 v2 criteria**

Replace the existing `MatchCriterion` type with both v1 (for backward compat) and v2:

```typescript
/**
 * v1 matching criteria (legacy — kept for backward compat with getMandateMatchAnalytics)
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
 * v2 matching criteria — 19 total, intentional base-sum of 104 (clamped to 100)
 */
export type MatchCriterionV2 =
  | "price"
  | "property_type"
  | "location"
  | "bedrooms"
  | "size"
  | "floor"
  | "condition"
  | "construction_year"
  | "parking"
  | "storage"
  | "elevator"
  | "garden"
  | "amenities_bundle"
  | "inside_city_plan"
  | "golden_visa"
  | "financing_type"
  | "bathrooms"
  | "timeline"
  | "energy_class";
```

- [ ] **Step 5: Widen CriterionScore.criterion and add MatchResultV2 type**

First, update the existing `CriterionScore` interface to accept both v1 and v2 criteria. Find the interface in `types.ts` and change the `criterion` field:

```typescript
export interface CriterionScore {
  criterion: MatchCriterion | MatchCriterionV2;  // widened for v2 compatibility
  weight: number;
  score: number;          // 0-100
  weightedScore: number;  // score * weight
  matched: boolean;
  reason?: string;
}
```

Then add after the existing `MatchResult` interface:

```typescript
/**
 * v2 match result — uses MatchCriterionV2 in the breakdown
 */
export interface MatchResultV2 {
  requestId: string;
  propertyId: string;
  overallScore: number;      // 0-100, clamped
  financingBonus: number;    // Additive bonus (0 or 5)
  breakdown: CriterionScore[];
  matchedCriteria: number;
  totalCriteria: number;
  calculatedAt: Date;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/matchmaking/types.ts
git commit -m "feat(matchmaking): add RequestForMatching, MatchCriterionV2, MatchResultV2 types"
```

---

## Task 5: Update Weights

**Files:**
- Modify: `lib/matchmaking/weights.ts`

- [ ] **Step 1: Add v2 weights constant and getWeightV2 helper**

Open `lib/matchmaking/weights.ts`. Add `import type { MatchCriterionV2 } from "./types";` at the **top of the file**, alongside the existing imports.

Then, after the existing `MATCH_WEIGHTS` export, add:

```typescript
/**
 * v2 criterion weights. Intentional base-sum = 104 — the engine clamps
 * the final score to 100 via Math.min(100, sum + financingBonus).
 * DO NOT add a runtime sum check: the over-100 headroom is intentional.
 */
export const MATCH_WEIGHTS_V2: Record<MatchCriterionV2, number> = {
  price:            20,
  property_type:    12,
  location:         12,
  bedrooms:          8,
  size:              7,
  floor:             5,
  condition:         5,
  construction_year: 4,
  parking:           4,
  storage:           3,
  elevator:          3,
  garden:            3,
  amenities_bundle:  5,
  inside_city_plan:  3,
  golden_visa:       2,
  financing_type:    2,
  bathrooms:         2,
  timeline:          2,
  energy_class:      2,
  // Base sum = 104 (intentional — clamp handles the overflow)
};

/**
 * Returns the effective weight for a v2 criterion, applying any org-level override.
 * Org overrides are stored as a partial map — only explicitly set criteria are
 * overridden; everything else falls back to MATCH_WEIGHTS_V2.
 * Named getWeightV2 to avoid collision with the existing v1 getWeight export.
 */
export function getWeightV2(
  criterion: MatchCriterionV2,
  orgWeights?: Partial<Record<MatchCriterionV2, number>> | null,
): number {
  if (orgWeights && criterion in orgWeights) {
    return orgWeights[criterion]!;
  }
  return MATCH_WEIGHTS_V2[criterion];
}
```

- [ ] **Step 2: Remove the v1 runtime sum validation**

Find and remove this block in weights.ts (approximately lines 42–45):

```typescript
// REMOVE this block entirely:
const totalWeight = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(totalWeight - 100) > 0.1) {
  console.warn("[MATCHMAKING] Weights do not sum to 100:", totalWeight);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/matchmaking/weights.ts
git commit -m "feat(matchmaking): add v2 19-criterion weights, getWeightV2() org override helper"
```

---

## Task 6: Fix Normalizers

**Files:**
- Modify: `lib/matchmaking/normalizers.ts`

- [ ] **Step 1: Remove @ts-nocheck and fix the Prisma Decimal import**

Open `lib/matchmaking/normalizers.ts`.

Line 1: remove `// @ts-nocheck`

Line 10: replace the broken Prisma 7 import:
```typescript
// REMOVE:
import type { Decimal } from "@prisma/client/runtime/library";

// REPLACE WITH:
import type { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;
```

- [ ] **Step 2: Add parseConstructionYear function**

At the end of `normalizers.ts`, add:

```typescript
/**
 * Parse a construction year value into a number, returning null for
 * invalid / future / unreasonably old values.
 */
export function parseConstructionYear(
  year: string | number | null | undefined,
): number | null {
  if (year == null) return null;
  const n = typeof year === "number" ? year : parseInt(String(year), 10);
  if (!isFinite(n) || n < 1800 || n > new Date().getFullYear()) return null;
  return n;
}
```

- [ ] **Step 3: Verify no type errors**

```bash
pnpm build 2>&1 | grep -E "normalizers|error TS" | head -20
```

Expected: no TypeScript errors from normalizers.ts.

- [ ] **Step 4: Commit**

```bash
git add lib/matchmaking/normalizers.ts
git commit -m "fix(matchmaking): remove @ts-nocheck, fix Prisma Decimal import, add parseConstructionYear"
```

---

## Task 7: Create Layer 1 Disqualifiers (TDD)

**Files:**
- Create: `lib/matchmaking/disqualifiers.ts`
- Create: `tests/matchmaking/disqualifiers.test.ts`

Layer 1 runs before any weighted scoring. Any disqualifier returning `true` means the pair gets score=0 immediately.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/matchmaking/disqualifiers.test.ts
import { describe, it, expect } from "vitest";
import { checkDisqualifiers } from "@/lib/matchmaking/disqualifiers";
import type { RequestForMatching, PropertyForMatching } from "@/lib/matchmaking/types";

// Minimal valid objects — tests override only the fields they care about
const baseRequest: RequestForMatching = {
  id: "req-1",
  requestType: "BUY",
  organizationId: "org-1",
};

const baseProperty: PropertyForMatching = {
  id: "prop-1",
  property_name: "Test Property",
  organizationId: "org-1",
  property_status: "ACTIVE",
  transaction_type: "SALE",
};

describe("ARCHIVED_OR_INACTIVE", () => {
  it("disqualifies SOLD property", () => {
    const result = checkDisqualifiers(baseRequest, {
      ...baseProperty,
      property_status: "SOLD",
    });
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("ARCHIVED_OR_INACTIVE");
  });

  it("disqualifies OFF_MARKET property", () => {
    const result = checkDisqualifiers(baseRequest, {
      ...baseProperty,
      property_status: "OFF_MARKET",
    });
    expect(result.disqualified).toBe(true);
  });

  it("passes ACTIVE property", () => {
    expect(checkDisqualifiers(baseRequest, baseProperty).disqualified).toBe(false);
  });

  it("passes PENDING property", () => {
    const result = checkDisqualifiers(baseRequest, {
      ...baseProperty,
      property_status: "PENDING",
    });
    expect(result.disqualified).toBe(false);
  });
});

describe("PURPOSE_MISMATCH", () => {
  it("disqualifies RENT request against SALE property", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, requestType: "RENT" },
      { ...baseProperty, transaction_type: "SALE" },
    );
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("PURPOSE_MISMATCH");
  });

  it("disqualifies BUY request against RENTAL property", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, requestType: "BUY" },
      { ...baseProperty, transaction_type: "RENTAL" },
    );
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("PURPOSE_MISMATCH");
  });

  it("passes BUY request against SALE property", () => {
    expect(
      checkDisqualifiers(baseRequest, { ...baseProperty, transaction_type: "SALE" }).disqualified
    ).toBe(false);
  });

  it("passes RENT request against RENTAL property", () => {
    expect(
      checkDisqualifiers(
        { ...baseRequest, requestType: "RENT" },
        { ...baseProperty, transaction_type: "RENTAL" },
      ).disqualified
    ).toBe(false);
  });

  it("passes RENT request against SHORT_TERM property", () => {
    expect(
      checkDisqualifiers(
        { ...baseRequest, requestType: "RENT" },
        { ...baseProperty, transaction_type: "SHORT_TERM" },
      ).disqualified
    ).toBe(false);
  });
});

describe("BUDGET_HARD_FLOOR", () => {
  it("disqualifies when property price > budgetMax * 1.15", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, budgetMax: 200_000 },
      { ...baseProperty, price: 240_000 }, // 240k > 200k * 1.15 = 230k
    );
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("BUDGET_HARD_FLOOR");
  });

  it("does NOT disqualify at exactly 1.15x", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, budgetMax: 200_000 },
      { ...baseProperty, price: 230_000 }, // exactly 200k * 1.15
    );
    expect(result.disqualified).toBe(false);
  });

  it("does NOT disqualify when no budgetMax is set", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, budgetMax: null },
      { ...baseProperty, price: 10_000_000 },
    );
    expect(result.disqualified).toBe(false);
  });

  it("does NOT disqualify when no property price", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, budgetMax: 100_000 },
      { ...baseProperty, price: null },
    );
    expect(result.disqualified).toBe(false);
  });
});

describe("AREA_HARD_EXCLUSION", () => {
  it("disqualifies when request has areas and property not in any", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, areasOfInterest: ["Glyfada", "Voula"] },
      { ...baseProperty, area: "Kifissia", address_city: "Kifissia" },
    );
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("AREA_HARD_EXCLUSION");
  });

  it("passes when property area matches (case-insensitive)", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, areasOfInterest: ["Glyfada", "Voula"] },
      { ...baseProperty, area: "glyfada" },
    );
    expect(result.disqualified).toBe(false);
  });

  it("passes when request has no areas of interest", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, areasOfInterest: [] },
      { ...baseProperty, area: "Anywhere" },
    );
    expect(result.disqualified).toBe(false);
  });

  it("passes when property matches via address_city", () => {
    const result = checkDisqualifiers(
      { ...baseRequest, areasOfInterest: ["Voula"] },
      { ...baseProperty, area: null, address_city: "Voula" },
    );
    expect(result.disqualified).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/matchmaking/disqualifiers.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/matchmaking/disqualifiers'`

- [ ] **Step 3: Implement disqualifiers.ts**

```typescript
// lib/matchmaking/disqualifiers.ts
import { toNumber } from "./normalizers";
import type { RequestForMatching, PropertyForMatching } from "./types";

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

const ALLOWED_STATUSES = new Set(["ACTIVE", "PENDING"]);

const BUY_TRANSACTION_TYPES = new Set(["SALE", "EXCHANGE", "AUCTION"]);
const RENT_TRANSACTION_TYPES = new Set(["RENTAL", "SHORT_TERM"]);

const BUDGET_SOFT_CEILING_MULTIPLIER = 1.15;

/** 1. Property or (implicitly) request is not active */
function disqualifyInactive(
  property: PropertyForMatching,
): DisqualifierResult | null {
  if (property.property_status && !ALLOWED_STATUSES.has(property.property_status)) {
    return {
      disqualified: true,
      reason: "ARCHIVED_OR_INACTIVE",
      detail: `Property status is ${property.property_status}`,
    };
  }
  return null;
}

/** 2. Transaction type incompatible with request intent */
function disqualifyPurpose(
  request: RequestForMatching,
  property: PropertyForMatching,
): DisqualifierResult | null {
  const tx = property.transaction_type;
  if (!tx) return null; // unknown → give benefit of doubt

  if (request.requestType === "BUY" && !BUY_TRANSACTION_TYPES.has(tx)) {
    return {
      disqualified: true,
      reason: "PURPOSE_MISMATCH",
      detail: `BUY request vs ${tx} property`,
    };
  }
  if (request.requestType === "RENT" && !RENT_TRANSACTION_TYPES.has(tx)) {
    return {
      disqualified: true,
      reason: "PURPOSE_MISMATCH",
      detail: `RENT request vs ${tx} property`,
    };
  }
  return null;
}

/** 3. Property price exceeds budgetMax by more than 15% */
function disqualifyBudget(
  request: RequestForMatching,
  property: PropertyForMatching,
): DisqualifierResult | null {
  const budgetMax = toNumber(request.budgetMax);
  const price = toNumber(property.price);
  if (!budgetMax || !price) return null;

  if (price > budgetMax * BUDGET_SOFT_CEILING_MULTIPLIER) {
    return {
      disqualified: true,
      reason: "BUDGET_HARD_FLOOR",
      detail: `Price ${price} exceeds budgetMax ${budgetMax} * 1.15 = ${budgetMax * BUDGET_SOFT_CEILING_MULTIPLIER}`,
    };
  }
  return null;
}

/** 4. Request lists explicit areas and property is in none of them */
function disqualifyArea(
  request: RequestForMatching,
  property: PropertyForMatching,
): DisqualifierResult | null {
  const areas = request.areasOfInterest;
  if (!areas || areas.length === 0) return null;

  const normalize = (s: string) => s.toLowerCase().trim();
  const normalizedAreas = areas.map(normalize);

  const propLocations = [
    property.area,
    property.address_city,
    property.municipality,
    property.address_state,
  ]
    .filter(Boolean)
    .map((s) => normalize(s!));

  const hasMatch = propLocations.some((loc) =>
    normalizedAreas.some((area) => loc.includes(area) || area.includes(loc))
  );

  if (!hasMatch) {
    return {
      disqualified: true,
      reason: "AREA_HARD_EXCLUSION",
      detail: `Property locations [${propLocations.join(", ")}] not in request areas [${areas.join(", ")}]`,
    };
  }
  return null;
}

/**
 * Run all Layer 1 disqualifiers in priority order.
 * Returns on the first match — subsequent checks are skipped.
 */
export function checkDisqualifiers(
  request: RequestForMatching,
  property: PropertyForMatching,
): DisqualifierResult {
  return (
    disqualifyInactive(property) ??
    disqualifyPurpose(request, property) ??
    disqualifyBudget(request, property) ??
    disqualifyArea(request, property) ?? { disqualified: false }
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/matchmaking/disqualifiers.test.ts
```

Expected: all 17 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matchmaking/disqualifiers.ts tests/matchmaking/disqualifiers.test.ts
git commit -m "feat(matchmaking): Layer 1 disqualifiers — 4 hard-reject checks with tests"
```

---

## Task 8: Rewrite Calculator (TDD)

**Files:**
- Modify: `lib/matchmaking/calculator.ts`
- Create: `tests/matchmaking/calculator-v2.test.ts`

This is the core scoring engine. The v2 functions coexist with v1 functions until all callers are migrated. v1 functions (`calculateMatchScore`, `calculateBatchMatches`) are kept unchanged.

- [ ] **Step 1: Write failing tests for the v2 calculator**

```typescript
// tests/matchmaking/calculator-v2.test.ts
import { describe, it, expect } from "vitest";
import { calculateMatchScoreV2 } from "@/lib/matchmaking/calculator";
import type { RequestForMatching, PropertyForMatching } from "@/lib/matchmaking/types";

const baseRequest: RequestForMatching = {
  id: "req-1",
  requestType: "BUY",
  organizationId: "org-1",
};

const baseProperty: PropertyForMatching = {
  id: "prop-1",
  property_name: "Athens Apartment",
  organizationId: "org-1",
  property_status: "ACTIVE",
  transaction_type: "SALE",
};

describe("calculateMatchScoreV2", () => {
  describe("Layer 1 rejection", () => {
    it("returns score 0 when property is SOLD (disqualifier fires)", () => {
      const result = calculateMatchScoreV2(baseRequest, {
        ...baseProperty,
        property_status: "SOLD",
      });
      expect(result.overallScore).toBe(0);
    });

    it("returns score 0 for RENT vs SALE mismatch", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, requestType: "RENT" },
        baseProperty,
      );
      expect(result.overallScore).toBe(0);
    });
  });

  describe("budget scoring (weight 20)", () => {
    it("scores 100 when price exactly in budget", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, budgetMin: 100_000, budgetMax: 300_000 },
        { ...baseProperty, price: 200_000 },
      );
      const budget = result.breakdown.find((c) => c.criterion === "price");
      expect(budget?.score).toBe(100);
    });

    it("scores 80 when price is under budgetMin (might be below expectations)", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, budgetMin: 200_000, budgetMax: 300_000 },
        { ...baseProperty, price: 100_000 },
      );
      const budget = result.breakdown.find((c) => c.criterion === "price");
      expect(budget?.score).toBe(80);
    });

    it("scores 60 when price slightly over budget (soft zone)", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, budgetMin: 100_000, budgetMax: 200_000 },
        { ...baseProperty, price: 220_000 }, // 10% over — within 15% soft zone
      );
      const budget = result.breakdown.find((c) => c.criterion === "price");
      expect(budget?.score).toBe(60);
    });
  });

  describe("bedroom scoring (weight 8, asymmetric)", () => {
    it("scores 100 for exact bedroom match", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, bedroomsMin: 2, bedroomsMax: 3 },
        { ...baseProperty, bedrooms: 2 },
      );
      const bd = result.breakdown.find((c) => c.criterion === "bedrooms");
      expect(bd?.score).toBe(100);
    });

    it("scores 40 when property has fewer bedrooms than min (deficit penalty)", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, bedroomsMin: 3, bedroomsMax: 4 },
        { ...baseProperty, bedrooms: 1 }, // 2 fewer than min
      );
      const bd = result.breakdown.find((c) => c.criterion === "bedrooms");
      expect(bd?.score).toBe(40);
    });

    it("scores 80 when property has more bedrooms than max (surplus)", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, bedroomsMin: 2, bedroomsMax: 3 },
        { ...baseProperty, bedrooms: 5 },
      );
      const bd = result.breakdown.find((c) => c.criterion === "bedrooms");
      expect(bd?.score).toBe(80);
    });
  });

  describe("financing bonus", () => {
    it("adds +5 bonus for CASH buyer on property ≥ €500k", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, financingStatus: "CASH", budgetMax: 1_000_000 },
        { ...baseProperty, price: 600_000 },
      );
      expect(result.financingBonus).toBe(5);
    });

    it("does NOT add bonus for CASH buyer on property < €500k", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, financingStatus: "CASH", budgetMax: 400_000 },
        { ...baseProperty, price: 400_000 },
      );
      expect(result.financingBonus).toBe(0);
    });

    it("does NOT add bonus for MORTGAGE buyer even on expensive property", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, financingStatus: "MORTGAGE_PREAPPROVED", budgetMax: 1_000_000 },
        { ...baseProperty, price: 800_000 },
      );
      expect(result.financingBonus).toBe(0);
    });
  });

  describe("golden visa scoring (weight 2)", () => {
    it("scores 100 when request wants golden visa and property price meets Tier A threshold", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, goldenVisaEligible: true, budgetMax: 2_000_000 },
        { ...baseProperty, price: 850_000, region: "Attica" },
      );
      const gv = result.breakdown.find((c) => c.criterion === "golden_visa");
      expect(gv?.score).toBe(100);
    });

    it("scores 0 when request wants golden visa but price below threshold", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, goldenVisaEligible: true, budgetMax: 500_000 },
        { ...baseProperty, price: 350_000, region: "Crete" },
      );
      const gv = result.breakdown.find((c) => c.criterion === "golden_visa");
      expect(gv?.score).toBe(0);
    });

    it("scores 100 for Tier B region at €400k threshold", () => {
      const result = calculateMatchScoreV2(
        { ...baseRequest, goldenVisaEligible: true, budgetMax: 500_000 },
        { ...baseProperty, price: 420_000, region: "Crete" },
      );
      const gv = result.breakdown.find((c) => c.criterion === "golden_visa");
      expect(gv?.score).toBe(100);
    });
  });

  describe("overall score clamping", () => {
    it("overallScore never exceeds 100", () => {
      // Perfect match on all criteria — with financing bonus, raw sum > 100
      const result = calculateMatchScoreV2(
        {
          ...baseRequest,
          budgetMin: 400_000,
          budgetMax: 600_000,
          financingStatus: "CASH",
          bedroomsMin: 2,
          bedroomsMax: 3,
        },
        {
          ...baseProperty,
          price: 500_000,
          bedrooms: 2,
        },
      );
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe("result shape", () => {
    it("includes all 19 criteria in breakdown", () => {
      const result = calculateMatchScoreV2(baseRequest, baseProperty);
      expect(result.breakdown.length).toBe(19);
    });

    it("sets requestId and propertyId correctly", () => {
      const result = calculateMatchScoreV2(baseRequest, baseProperty);
      expect(result.requestId).toBe("req-1");
      expect(result.propertyId).toBe("prop-1");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/matchmaking/calculator-v2.test.ts
```

Expected: FAIL with `calculateMatchScoreV2 is not a function`

- [ ] **Step 3: Remove @ts-nocheck from calculator.ts**

Open `lib/matchmaking/calculator.ts`. Remove line 1: `// @ts-nocheck`

- [ ] **Step 4: Add imports and helpers at the top of calculator.ts**

After the existing imports, add:

```typescript
import type { RequestForMatching, MatchCriterionV2, MatchResultV2 } from "./types";
import { MATCH_WEIGHTS_V2, getWeightV2 } from "./weights";
import { checkDisqualifiers } from "./disqualifiers";
import { haversineDistanceKm, scoreByRadius } from "./geo";
import { getGoldenVisaThreshold } from "./constants/golden-visa";
import { toNumber, parseFloor, parseConstructionYear, normalizeAmenityKey } from "./normalizers";

// Financing bonus constants
const CASH_BONUS_POINTS = 5;
const CASH_BONUS_MIN_PRICE = 500_000;

/**
 * v2 variant of createScore — accepts MatchCriterionV2 and an optional reason.
 * The existing v1 createScore is typed to MatchCriterion and a required string;
 * this overload avoids a cast and keeps v1 callers fully type-safe.
 */
function createScoreV2(
  criterion: MatchCriterionV2,
  weight: number,
  score: number,
  reason?: string,
  matched: boolean = false,
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
```

- [ ] **Step 5: Add the 19 criterion scorer functions**

Add these functions after the existing v1 scorers (keep all v1 functions intact):

```typescript
// ──────────────────────────────────────────────────────────────────────────────
// v2 criterion scorers — each returns 0-100
// ──────────────────────────────────────────────────────────────────────────────

function v2scorePrice(request: RequestForMatching, property: PropertyForMatching): number {
  const price = toNumber(property.price);
  const budgetMin = toNumber(request.budgetMin);
  const budgetMax = toNumber(request.budgetMax);
  if (!price) return 50;   // Unknown price — neutral
  if (!budgetMax) return 50; // No budget set — neutral
  if (price >= (budgetMin ?? 0) && price <= budgetMax) return 100;
  if (price < (budgetMin ?? 0)) return 80; // Under budget (might be lower quality)
  if (price <= budgetMax * 1.15) return 60; // Slightly over (soft zone, hard DQ at 1.15x)
  return 0; // Should not reach here — Layer 1 already rejected
}

function v2scorePropertyType(request: RequestForMatching, property: PropertyForMatching): number {
  if (!property.property_type) return 50;

  // Specific type match (highest confidence)
  if (request.propertyTypes && request.propertyTypes.length > 0) {
    if (request.propertyTypes.includes(property.property_type)) return 100;
  }

  // Category-level match (e.g. request wants RESIDENTIAL, property is APARTMENT)
  if (request.propertyCategory) {
    const residentialTypes = new Set(["APARTMENT", "HOUSE", "MAISONETTE", "RESIDENTIAL", "VACATION"]);
    const commercialTypes = new Set(["COMMERCIAL", "WAREHOUSE", "INDUSTRIAL"]);
    const landTypes = new Set(["LAND", "PLOT", "FARM"]);
    const parkingTypes = new Set(["PARKING"]);

    const typeMap: Record<string, Set<string>> = {
      RESIDENTIAL: residentialTypes,
      COMMERCIAL: commercialTypes,
      LAND: landTypes,
      PARKING: parkingTypes,
    };
    const compatibleTypes = typeMap[request.propertyCategory];
    if (compatibleTypes?.has(property.property_type)) return 70;
    return 0; // Wrong category
  }

  return 50; // No type preference
}

function v2scoreLocation(
  request: RequestForMatching,
  property: PropertyForMatching,
  maxPts: number,
): number {
  // Prefer geodesic scoring when both have coordinates
  const hasRequestGeo = request.centerLatitude != null && request.centerLongitude != null && request.radiusKm;
  const hasPropertyGeo = property.latitude != null && property.longitude != null;

  if (hasRequestGeo && hasPropertyGeo) {
    const dist = haversineDistanceKm(
      request.centerLatitude!,
      request.centerLongitude!,
      property.latitude!,
      property.longitude!,
    );
    return scoreByRadius(dist, request.radiusKm!, maxPts);
  }

  // Text-based fallback
  const areas = request.areasOfInterest;
  if (!areas || areas.length === 0) return 50;

  const normalize = (s: string) => s.toLowerCase().trim();
  const normalizedAreas = areas.map(normalize);
  const propLocations = [
    property.area,
    property.address_city,
    property.municipality,
    property.address_state,
  ]
    .filter(Boolean)
    .map((s) => normalize(s!));

  const directMatch = propLocations.some((loc) =>
    normalizedAreas.some((a) => loc.includes(a) || a.includes(loc))
  );
  if (directMatch) return 100;

  // Soft partial: same region/state mentioned in areas
  const regionMatch = propLocations.some((loc) =>
    normalizedAreas.some((a) => loc.includes(a.split(" ")[0]) || a.includes(loc.split(" ")[0]))
  );
  return regionMatch ? 60 : 20;
}

function v2scoreBedrooms(request: RequestForMatching, property: PropertyForMatching): number {
  const min = request.bedroomsMin;
  const max = request.bedroomsMax;
  const actual = property.bedrooms;
  if (actual == null) return 50;
  if (min == null && max == null) return 50;

  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 99;

  if (actual >= effectiveMin && actual <= effectiveMax) return 100; // exact match
  if (actual > effectiveMax) return 80;   // surplus — bigger than wanted
  return 40;                              // deficit — smaller than needed
}

function v2scoreSize(request: RequestForMatching, property: PropertyForMatching): number {
  const minSqm = request.surfaceMin ? Number(request.surfaceMin) : null;
  const maxSqm = request.surfaceMax ? Number(request.surfaceMax) : null;
  const propSqm =
    toNumber(property.size_net_sqm) ??
    toNumber(property.size_gross_sqm) ??
    (property.square_feet ? property.square_feet * 0.0929 : null);

  if (!propSqm) return 50;
  if (!minSqm && !maxSqm) return 50;

  const effectiveMin = minSqm ?? 0;
  const effectiveMax = maxSqm ?? Infinity;

  if (propSqm >= effectiveMin && propSqm <= effectiveMax) return 100;
  if (propSqm < effectiveMin) {
    const deficit = (effectiveMin - propSqm) / effectiveMin;
    return deficit < 0.2 ? 70 : 30;
  }
  // Over max
  const surplus = (propSqm - effectiveMax) / effectiveMax;
  return surplus < 0.2 ? 80 : 50;
}

function v2scoreFloor(request: RequestForMatching, property: PropertyForMatching): number {
  if (request.groundFloorOnly) {
    const floorNum = parseFloor(property.floor ?? null);
    if (floorNum === null) return 50;
    return floorNum === 0 ? 100 : 0;
  }
  const min = request.floorMin;
  const max = request.floorMax;
  if (min == null && max == null) return 50;

  const floorNum = parseFloor(property.floor ?? null);
  if (floorNum === null) return 50;

  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 99;
  return floorNum >= effectiveMin && floorNum <= effectiveMax ? 100 : 40;
}

function v2scoreCondition(request: RequestForMatching, property: PropertyForMatching): number {
  const prefs = request.conditionPreference;
  if (!prefs || prefs.length === 0) return 50;
  if (!property.condition) return 50;
  return prefs.includes(property.condition) ? 100 : 0;
}

function v2scoreConstructionYear(request: RequestForMatching, property: PropertyForMatching): number {
  const min = request.constructionYearMin;
  const max = request.constructionYearMax;
  if (min == null && max == null) return 50;

  const built = parseConstructionYear(property.year_built);
  if (!built) return 50;

  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 9999;
  return built >= effectiveMin && built <= effectiveMax ? 100 : 20;
}

function v2scoreParking(request: RequestForMatching, property: PropertyForMatching): number {
  if (!request.requiresParking) return 50;
  const amenities = property.amenities as Record<string, boolean> | null;
  const hasParking =
    property.property_type === "PARKING" ||
    (amenities && (amenities["parking"] || amenities["Parking"] || amenities["PARKING"]));
  return hasParking ? 100 : 0;
}

function v2scoreStorage(request: RequestForMatching, property: PropertyForMatching): number {
  if (!request.requiresStorage) return 50;
  const amenities = property.amenities as Record<string, boolean> | null;
  const hasStorage = amenities && (amenities["storage"] || amenities["Storage"] || amenities["αποθήκη"]);
  return hasStorage ? 100 : 0;
}

function v2scoreElevator(request: RequestForMatching, property: PropertyForMatching): number {
  if (!request.requiresElevator) return 50;
  return property.elevator === true ? 100 : 0;
}

function v2scoreGarden(request: RequestForMatching, property: PropertyForMatching): number {
  if (!request.requiresGarden) return 50;
  const amenities = property.amenities as Record<string, boolean> | null;
  const hasGarden = amenities && (
    amenities["garden"] || amenities["Garden"] || amenities["κήπος"] || amenities["yard"]
  );
  return hasGarden ? 100 : 0;
}

function v2scoreAmenitiesBundle(request: RequestForMatching, property: PropertyForMatching): number {
  const requestedAmenities = request.amenities;
  if (!requestedAmenities || Object.keys(requestedAmenities).length === 0) return 50;

  const propertyAmenities = property.amenities as Record<string, boolean> | null;
  if (!propertyAmenities) return 0;

  const wanted = Object.entries(requestedAmenities)
    .filter(([, v]) => v === true)
    .map(([k]) => normalizeAmenityKey(k));

  if (wanted.length === 0) return 50;

  const hasCount = wanted.filter((key) =>
    Object.entries(propertyAmenities).some(
      ([pk, pv]) => pv === true && normalizeAmenityKey(pk) === key
    )
  ).length;

  return Math.round((hasCount / wanted.length) * 100);
}

function v2scoreInsideCityPlan(request: RequestForMatching, property: PropertyForMatching): number {
  if (request.insideCityPlan == null) return 50;
  if (!request.insideCityPlan) return 50; // Not required
  return property.inside_city_plan === true ? 100 : 0;
}

function v2scoreGoldenVisa(request: RequestForMatching, property: PropertyForMatching): number {
  if (!request.goldenVisaEligible) return 50;
  const price = toNumber(property.price);
  if (!price) return 50;

  const threshold = getGoldenVisaThreshold(property.region ?? null, property.municipality ?? null);
  return price >= threshold ? 100 : 0;
}

function v2scoreFinancingType(request: RequestForMatching, property: PropertyForMatching): number {
  const status = request.financingStatus;
  if (!status) return 50;
  if (status === "CASH") return 100;
  if (status === "MORTGAGE_PREAPPROVED") return 80;
  if (status === "MORTGAGE_PENDING") return 60;
  return 50;
}

function v2scoreBathrooms(request: RequestForMatching, property: PropertyForMatching): number {
  const min = request.bathroomsMin;
  const max = request.bathroomsMax;
  if (min == null && max == null) return 50;
  const actual = property.bathrooms != null ? Math.floor(property.bathrooms) : null;
  if (actual == null) return 50;
  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 99;
  if (actual >= effectiveMin && actual <= effectiveMax) return 100;
  if (actual > effectiveMax) return 80;
  return 40;
}

function v2scoreTimeline(_request: RequestForMatching, _property: PropertyForMatching): number {
  // V1 placeholder: timeline data not yet on Properties model.
  // Returns neutral 80 (slightly positive to encourage listing both).
  return 80;
}

function v2scoreEnergyClass(request: RequestForMatching, property: PropertyForMatching): number {
  const minClass = request.energyClassMin;
  if (!minClass) return 50;
  if (!property.energy_cert_class) return 50;

  const ORDER: string[] = ["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"];
  const minIdx = ORDER.indexOf(minClass);
  const actualIdx = ORDER.indexOf(property.energy_cert_class);
  if (minIdx === -1 || actualIdx === -1) return 50;
  // Lower index = better class. Property must be at least as good as minimum.
  return actualIdx <= minIdx ? 100 : 0;
}
```

- [ ] **Step 6: Add the main v2 entry point**

```typescript
/**
 * v2 scoring engine entry point.
 *
 * Execution order:
 *   1. Layer 1: hard disqualifiers → score=0 if any fires
 *   2. Layer 2: 19 weighted criteria → raw sum (may exceed 100)
 *   3. Layer 3: financing bonus → +5 if CASH + price ≥ €500k
 *   4. Clamp: Math.min(100, rawSum + bonus)
 */
export function calculateMatchScoreV2(
  request: RequestForMatching,
  property: PropertyForMatching,
  orgWeights?: Partial<Record<MatchCriterionV2, number>> | null,
): MatchResultV2 {
  // Layer 1
  const dq = checkDisqualifiers(request, property);
  if (dq.disqualified) {
    return {
      requestId: request.id,
      propertyId: property.id,
      overallScore: 0,
      financingBonus: 0,
      breakdown: [],
      matchedCriteria: 0,
      totalCriteria: 19,
      calculatedAt: new Date(),
    };
  }

  // Layer 2 — build breakdown
  type ScorerFn = (req: RequestForMatching, prop: PropertyForMatching) => number;

  const criteriaScorers: [MatchCriterionV2, ScorerFn][] = [
    ["price",             v2scorePrice],
    ["property_type",     v2scorePropertyType],
    ["location",          (req, prop) => v2scoreLocation(req, prop, 100)],
    ["bedrooms",          v2scoreBedrooms],
    ["size",              v2scoreSize],
    ["floor",             v2scoreFloor],
    ["condition",         v2scoreCondition],
    ["construction_year", v2scoreConstructionYear],
    ["parking",           v2scoreParking],
    ["storage",           v2scoreStorage],
    ["elevator",          v2scoreElevator],
    ["garden",            v2scoreGarden],
    ["amenities_bundle",  v2scoreAmenitiesBundle],
    ["inside_city_plan",  v2scoreInsideCityPlan],
    ["golden_visa",       v2scoreGoldenVisa],
    ["financing_type",    v2scoreFinancingType],
    ["bathrooms",         v2scoreBathrooms],
    ["timeline",          v2scoreTimeline],
    ["energy_class",      v2scoreEnergyClass],
  ];

  const breakdown = criteriaScorers.map(([criterion, scorer]) => {
    const weight = getWeightV2(criterion, orgWeights);
    const score = scorer(request, property);
    return createScoreV2(criterion, weight, score, undefined, score > 50);
  });

  const rawSum = breakdown.reduce((acc, c) => acc + c.weightedScore, 0);

  // Layer 3 — financing bonus (additive, not via criterion)
  const price = toNumber(property.price) ?? 0;
  const financingBonus =
    request.financingStatus === "CASH" && price >= CASH_BONUS_MIN_PRICE
      ? CASH_BONUS_POINTS
      : 0;

  const overallScore = Math.min(100, Math.round(rawSum + financingBonus));

  return {
    requestId: request.id,
    propertyId: property.id,
    overallScore,
    financingBonus,
    breakdown,
    matchedCriteria: breakdown.filter((c) => c.score > 50).length,
    totalCriteria: 19,
    calculatedAt: new Date(),
  };
}

/**
 * Batch v2: score all (request, property) combinations.
 * Runs in O(R × P) — acceptable for intra-org scale (< 10k pairs).
 * Results are NOT filtered by threshold here — callers filter.
 */
export function calculateBatchMatchesV2(
  requests: RequestForMatching[],
  properties: PropertyForMatching[],
  orgWeights?: Partial<Record<MatchCriterionV2, number>> | null,
): MatchResultV2[] {
  const results: MatchResultV2[] = [];
  for (const request of requests) {
    for (const property of properties) {
      results.push(calculateMatchScoreV2(request, property, orgWeights));
    }
  }
  return results;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm vitest run tests/matchmaking/calculator-v2.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/matchmaking/calculator.ts tests/matchmaking/calculator-v2.test.ts
git commit -m "feat(matchmaking): v2 calculator — 19-criterion scoring engine with Layer 1/2/3"
```

---

## Task 9: Update Index Barrel

**Files:**
- Modify: `lib/matchmaking/index.ts`

- [ ] **Step 1: Add v2 exports**

Open `lib/matchmaking/index.ts`. Add after the existing exports:

```typescript
// ── v2 exports ──────────────────────────────────────────────────────────────
export type { RequestForMatching, MatchCriterionV2, MatchResultV2, FinancingStatus, Timeline } from "./types";
export { MATCH_WEIGHTS_V2, getWeightV2 } from "./weights";
export { checkDisqualifiers } from "./disqualifiers";
export type { DisqualifierResult, DisqualifierReason } from "./disqualifiers";
export { haversineDistanceKm, scoreByRadius } from "./geo";
export { getGoldenVisaThreshold, GOLDEN_VISA_THRESHOLD_TIER_A, GOLDEN_VISA_THRESHOLD_TIER_B } from "./constants/golden-visa";
export { calculateMatchScoreV2, calculateBatchMatchesV2 } from "./calculator";
export { parseConstructionYear } from "./normalizers";
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error TS|matchmaking" | head -20
```

Expected: no TypeScript errors in `lib/matchmaking/`.

- [ ] **Step 3: Commit**

```bash
git add lib/matchmaking/index.ts
git commit -m "feat(matchmaking): export v2 symbols from barrel"
```

---

## Task 10: Update get-request-matches Action

**Files:**
- Modify: `actions/matchmaking/get-request-matches.ts`

This action is already partially implemented (v1 adaptation dance). Replace the core with direct v2 types and engine.

- [ ] **Step 1: Update the import block**

At the top of `actions/matchmaking/get-request-matches.ts`, replace the existing imports with:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateBatchMatchesV2,
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type {
  RequestForMatching,
  PropertyForMatching,
  MatchAnalytics,
  MatchResultWithClient,
  MatchResultWithProperty,
  MatchDistribution,
  ClientSummary,
  PropertyWithMatchStats,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptRequestForOrg } from "@/lib/model-encryption";
```

- [ ] **Step 2: Update fetchActiveRequests to include all v2 fields**

Replace the `fetchActiveRequests` function:

```typescript
async function fetchActiveRequests(organizationId: string) {
  return prismadb.request.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draftStatus: { not: true },
      visibility: { not: "HIDDEN" },
    },
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      propertyCategory: true,
      propertyTypes: true,
      areasOfInterest: true,
      municipality: true,
      region: true,
      // Geo
      centerLatitude: true,
      centerLongitude: true,
      radiusKm: true,
      // Budget
      budgetMin: true,
      budgetMax: true,
      // Size
      surfaceMin: true,
      surfaceMax: true,
      // Rooms
      bedroomsMin: true,
      bedroomsMax: true,
      bathroomsMin: true,
      bathroomsMax: true,
      // Floor
      floorMin: true,
      floorMax: true,
      groundFloorOnly: true,
      // Construction
      constructionYearMin: true,
      constructionYearMax: true,
      // Features
      conditionPreference: true,
      heatingTypes: true,
      energyClassMin: true,
      furnished: true,
      requiresElevator: true,
      requiresParking: true,
      requiresStorage: true,
      requiresGarden: true,
      petFriendly: true,
      insideCityPlan: true,
      amenities: true,
      // Investment
      goldenVisaEligible: true,
      financingStatus: true,
      // Timeline
      timeline: true,
      // Meta
      assignedAgentId: true,
      organizationId: true,
      requestContacts: {
        select: { contact: { select: { displayName: true } } },
        take: 1,
      },
    },
  });
}

type RequestRow = Awaited<ReturnType<typeof fetchActiveRequests>>[number];
```

- [ ] **Step 3: Replace adaptRequestToClient with adaptRequestToV2**

Remove the old `adaptRequestToClient` function. Add:

```typescript
function adaptRequestToV2(r: RequestRow): RequestForMatching {
  const areas: string[] = Array.isArray(r.areasOfInterest)
    ? (r.areasOfInterest as string[])
    : [];
  if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
  if (r.region && !areas.includes(r.region)) areas.push(r.region);

  return {
    id: r.id,
    friendlyId: r.friendlyId,
    requestType: r.requestType as "BUY" | "RENT",
    propertyCategory: r.propertyCategory as RequestForMatching["propertyCategory"],
    propertyTypes: r.propertyTypes as RequestForMatching["propertyTypes"],
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    surfaceMin: r.surfaceMin,
    surfaceMax: r.surfaceMax,
    bedroomsMin: r.bedroomsMin,
    bedroomsMax: r.bedroomsMax,
    bathroomsMin: r.bathroomsMin,
    bathroomsMax: r.bathroomsMax,
    floorMin: r.floorMin,
    floorMax: r.floorMax,
    groundFloorOnly: r.groundFloorOnly,
    constructionYearMin: r.constructionYearMin,
    constructionYearMax: r.constructionYearMax,
    conditionPreference: r.conditionPreference as RequestForMatching["conditionPreference"],
    heatingTypes: r.heatingTypes as RequestForMatching["heatingTypes"],
    energyClassMin: r.energyClassMin as RequestForMatching["energyClassMin"],
    furnished: r.furnished as RequestForMatching["furnished"],
    requiresElevator: r.requiresElevator,
    requiresParking: r.requiresParking,
    requiresStorage: r.requiresStorage,
    requiresGarden: r.requiresGarden,
    petFriendly: r.petFriendly,
    insideCityPlan: r.insideCityPlan,
    amenities: r.amenities as Record<string, boolean> | null,
    goldenVisaEligible: r.goldenVisaEligible,
    financingStatus: r.financingStatus as RequestForMatching["financingStatus"],
    timeline: r.timeline as RequestForMatching["timeline"],
    areasOfInterest: areas.length > 0 ? areas : null,
    municipality: r.municipality,
    region: r.region,
    centerLatitude: r.centerLatitude,
    centerLongitude: r.centerLongitude,
    radiusKm: r.radiusKm,
    organizationId: r.organizationId,
    assignedAgentId: r.assignedAgentId,
  };
}
```

- [ ] **Step 4: Update getRequestMatchAnalytics to use v2 engine**

In the `getRequestMatchAnalytics` function body, replace the line:

```typescript
const allMatches = calculateBatchMatches(clients, matchableProperties);
```

with:

```typescript
const requests: RequestForMatching[] = decryptedRequests.map((r) =>
  adaptRequestToV2(r as RequestRow)
);

// Also delete the old clients array construction (the clients variable is gone)
const allMatches = calculateBatchMatchesV2(requests, matchableProperties);
```

And update the `requestsWithMatchesSet` line from using `.clientId` to `.requestId`:

```typescript
const requestsWithMatchesSet = new Set(
  allMatches
    .filter((m) => m.overallScore >= MATCH_THRESHOLDS.FAIR)
    .map((m) => m.requestId)  // was .clientId in v1
);
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm build 2>&1 | grep "get-request-matches" | head -10
```

Expected: no errors from that file.

- [ ] **Step 6: Commit**

```bash
git add actions/matchmaking/get-request-matches.ts
git commit -m "feat(matchmaking): migrate get-request-matches to v2 engine and RequestForMatching"
```

---

## Task 11: Create compute-intra-org-matches Action

**Files:**
- Create: `actions/matchmaking/compute-intra-org-matches.ts`

This action runs the v2 engine across all active requests × active properties for an org, upserts results into `PropertyRequestMatch`, and records score breakdowns.

- [ ] **Step 1: Create the action**

```typescript
// actions/matchmaking/compute-intra-org-matches.ts
"use server";

import { prismadb } from "@/lib/prisma";
import {
  calculateBatchMatchesV2,
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type { RequestForMatching, PropertyForMatching } from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

const BATCH_SIZE = 50; // Process this many request-property pairs per Prisma transaction

export interface IntraOrgMatchResult {
  upserted: number;
  skipped: number;
  durationMs: number;
}

/**
 * Fetch active requests for the v2 engine.
 * Pulls all fields required by RequestForMatching.
 */
async function fetchRequests(organizationId: string): Promise<RequestForMatching[]> {
  const rows = await prismadb.request.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draftStatus: { not: true },
      visibility: { not: "HIDDEN" },
    },
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      propertyCategory: true,
      propertyTypes: true,
      areasOfInterest: true,
      municipality: true,
      region: true,
      centerLatitude: true,
      centerLongitude: true,
      radiusKm: true,
      budgetMin: true,
      budgetMax: true,
      surfaceMin: true,
      surfaceMax: true,
      bedroomsMin: true,
      bedroomsMax: true,
      bathroomsMin: true,
      bathroomsMax: true,
      floorMin: true,
      floorMax: true,
      groundFloorOnly: true,
      constructionYearMin: true,
      constructionYearMax: true,
      conditionPreference: true,
      heatingTypes: true,
      energyClassMin: true,
      furnished: true,
      requiresElevator: true,
      requiresParking: true,
      requiresStorage: true,
      requiresGarden: true,
      petFriendly: true,
      insideCityPlan: true,
      amenities: true,
      goldenVisaEligible: true,
      financingStatus: true,
      timeline: true,
      assignedAgentId: true,
      organizationId: true,
    },
  });

  return rows.map((r): RequestForMatching => {
    const areas: string[] = Array.isArray(r.areasOfInterest)
      ? (r.areasOfInterest as string[])
      : [];
    if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
    if (r.region && !areas.includes(r.region)) areas.push(r.region);

    return {
      id: r.id,
      friendlyId: r.friendlyId,
      requestType: r.requestType as "BUY" | "RENT",
      propertyCategory: r.propertyCategory as RequestForMatching["propertyCategory"],
      propertyTypes: r.propertyTypes as RequestForMatching["propertyTypes"],
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      surfaceMin: r.surfaceMin,
      surfaceMax: r.surfaceMax,
      bedroomsMin: r.bedroomsMin,
      bedroomsMax: r.bedroomsMax,
      bathroomsMin: r.bathroomsMin,
      bathroomsMax: r.bathroomsMax,
      floorMin: r.floorMin,
      floorMax: r.floorMax,
      groundFloorOnly: r.groundFloorOnly,
      constructionYearMin: r.constructionYearMin,
      constructionYearMax: r.constructionYearMax,
      conditionPreference: r.conditionPreference as RequestForMatching["conditionPreference"],
      heatingTypes: r.heatingTypes as RequestForMatching["heatingTypes"],
      energyClassMin: r.energyClassMin as RequestForMatching["energyClassMin"],
      furnished: r.furnished as RequestForMatching["furnished"],
      requiresElevator: r.requiresElevator,
      requiresParking: r.requiresParking,
      requiresStorage: r.requiresStorage,
      requiresGarden: r.requiresGarden,
      petFriendly: r.petFriendly,
      insideCityPlan: r.insideCityPlan,
      amenities: r.amenities as Record<string, boolean> | null,
      goldenVisaEligible: r.goldenVisaEligible,
      financingStatus: r.financingStatus as RequestForMatching["financingStatus"],
      timeline: r.timeline as RequestForMatching["timeline"],
      areasOfInterest: areas.length > 0 ? areas : null,
      municipality: r.municipality,
      region: r.region,
      centerLatitude: r.centerLatitude,
      centerLongitude: r.centerLongitude,
      radiusKm: r.radiusKm,
      organizationId: r.organizationId,
      assignedAgentId: r.assignedAgentId,
    };
  });
}

async function fetchProperties(organizationId: string): Promise<PropertyForMatching[]> {
  const rows = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: { in: ["ACTIVE", "PENDING"] },
      visibility: { not: "HIDDEN" },
    },
    select: {
      id: true,
      friendlyId: true,
      property_name: true,
      price: true,
      property_type: true,
      transaction_type: true,
      property_status: true,
      area: true,
      address_city: true,
      address_state: true,
      municipality: true,
      region: true,
      bedrooms: true,
      bathrooms: true,
      size_net_sqm: true,
      size_gross_sqm: true,
      square_feet: true,
      floor: true,
      elevator: true,
      accepts_pets: true,
      furnished: true,
      heating_type: true,
      energy_cert_class: true,
      condition: true,
      inside_city_plan: true,
      year_built: true,
      amenities: true,
      latitude: true,
      longitude: true,
      assigned_to: true,
      organizationId: true,
    },
  });

  return rows.map((p): PropertyForMatching => ({
    id: p.id,
    property_name: p.property_name,
    price: p.price != null ? Number(p.price) : null,
    property_type: p.property_type as PropertyForMatching["property_type"],
    transaction_type: p.transaction_type as PropertyForMatching["transaction_type"],
    property_status: p.property_status as PropertyForMatching["property_status"],
    area: p.area,
    address_city: p.address_city,
    address_state: p.address_state,
    municipality: p.municipality,
    region: p.region ?? null,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms != null ? Math.floor(p.bathrooms) : null,
    size_net_sqm: p.size_net_sqm,
    size_gross_sqm: p.size_gross_sqm,
    square_feet: p.square_feet != null ? Number(p.square_feet) : null,
    floor: p.floor,
    elevator: p.elevator,
    accepts_pets: p.accepts_pets,
    furnished: p.furnished as PropertyForMatching["furnished"],
    heating_type: p.heating_type as PropertyForMatching["heating_type"],
    energy_cert_class: p.energy_cert_class as PropertyForMatching["energy_cert_class"],
    condition: p.condition as PropertyForMatching["condition"],
    inside_city_plan: p.inside_city_plan,
    year_built: p.year_built,
    amenities: p.amenities as PropertyForMatching["amenities"],
    latitude: p.latitude,
    longitude: p.longitude,
    assigned_to: p.assigned_to,
    organizationId: p.organizationId,
  }));
}

/**
 * Internal runner — called by both the cron route and the manual trigger.
 * Returns counts without needing a permission guard (callers handle auth).
 */
export async function runIntraOrgMatches(
  organizationId: string,
): Promise<IntraOrgMatchResult> {
  const start = Date.now();
  const [requests, properties] = await Promise.all([
    fetchRequests(organizationId),
    fetchProperties(organizationId),
  ]);

  if (requests.length === 0 || properties.length === 0) {
    return { upserted: 0, skipped: 0, durationMs: Date.now() - start };
  }

  // Fetch org weight overrides (optional — null means use defaults)
  const orgWeightsRow = await prismadb.orgMatchWeights.findUnique({
    where: { organizationId },
    select: { weights: true },
  });
  const orgWeights = (orgWeightsRow?.weights ?? null) as
    | Partial<Record<string, number>>
    | null;

  const allMatches = calculateBatchMatchesV2(requests, properties, orgWeights);
  const aboveThreshold = allMatches.filter(
    (m) => m.overallScore >= MATCH_THRESHOLDS.FAIR
  );

  // Upsert in batches
  let upserted = 0;
  for (let i = 0; i < aboveThreshold.length; i += BATCH_SIZE) {
    const batch = aboveThreshold.slice(i, i + BATCH_SIZE);
    await prismadb.$transaction(
      batch.map((m) =>
        prismadb.propertyRequestMatch.upsert({
          where: {
            organizationId_propertyId_requestId: {
              organizationId,
              propertyId: m.propertyId,
              requestId: m.requestId,
            },
          },
          create: {
            organizationId,
            propertyId: m.propertyId,
            requestId: m.requestId,
            matchScore: m.overallScore / 100, // stored as 0.0–1.0
            matchMethod: "RULE_BASED",
            scoreBreakdown: m.breakdown as unknown as Record<string, unknown>,
          },
          update: {
            matchScore: m.overallScore / 100,
            scoreBreakdown: m.breakdown as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        })
      )
    );
    upserted += batch.length;
  }

  const skipped = allMatches.length - aboveThreshold.length;
  return { upserted, skipped, durationMs: Date.now() - start };
}

/**
 * Server action: manual trigger for intra-org match recalculation.
 * Rate-limited: an org can only trigger once per 5 minutes via lastMatchRunAt.
 * Call from Property or Request detail pages via a button.
 */
export async function triggerIntraOrgMatches(): Promise<ActionResponse<IntraOrgMatchResult>> {
  const guard = await requireAction("matchmaking:run");
  if (guard) return guard;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return actionError("No organization context");

  try {
    const result = await runIntraOrgMatches(organizationId);
    return actionSuccess(result);
  } catch (error) {
    console.error("[MATCHMAKING_INTRA_ORG_TRIGGER]", error);
    return actionError("Failed to run matching", error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/matchmaking/compute-intra-org-matches.ts
git commit -m "feat(matchmaking): compute-intra-org-matches action — batch v2 engine, upsert to PropertyRequestMatch"
```

---

## Task 12: Intra-Org Cron Route + vercel.json

**Files:**
- Create: `app/api/cron/intra-org-matches/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron route**

```typescript
// app/api/cron/intra-org-matches/route.ts
import { timingSafeEqual } from "crypto";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import { NextResponse } from "next/server";

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!verifySecret(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // Fetch all orgs that have at least one active request
  const orgsWithRequests = await prismadb.request.findMany({
    where: {
      status: "ACTIVE",
      draftStatus: { not: true },
    },
    distinct: ["organizationId"],
    select: { organizationId: true },
  });

  const results: Array<{ org: string; upserted: number; skipped: number; error?: string }> = [];

  for (const { organizationId } of orgsWithRequests) {
    try {
      const r = await runIntraOrgMatches(organizationId);
      results.push({ org: organizationId, upserted: r.upserted, skipped: r.skipped });
    } catch (err) {
      console.error("[CRON_INTRA_ORG_MATCHES]", organizationId, err);
      results.push({ org: organizationId, upserted: 0, skipped: 0, error: String(err) });
    }
  }

  const totalUpserted = results.reduce((s, r) => s + r.upserted, 0);
  const errors = results.filter((r) => r.error);

  return NextResponse.json({
    ok: errors.length === 0,
    orgsProcessed: orgsWithRequests.length,
    totalUpserted,
    errors: errors.length,
    durationMs: Date.now() - start,
  });
}
```

- [ ] **Step 2: Add the cron to vercel.json**

Open `vercel.json`. Find the `"crons"` array and add the new entry:

```json
{
  "path": "/api/cron/intra-org-matches",
  "schedule": "*/30 * * * *"
}
```

The crons array should look like (existing entries preserved):
```json
"crons": [
  { "path": "/api/cron/reminders",           "schedule": "0 8 * * *" },
  { "path": "/api/cron/cross-org-matches",   "schedule": "0 4 * * *" },
  { "path": "/api/cron/cleanup-orphan-images","schedule": "0 3 * * *" },
  { "path": "/api/cron/intra-org-matches",   "schedule": "*/30 * * * *" }
]
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/intra-org-matches/route.ts vercel.json
git commit -m "feat(matchmaking): 30-min intra-org cron route + vercel.json schedule"
```

---

## Task 13: Update compute-cross-org-matches

**Files:**
- Modify: `actions/network/compute-cross-org-matches.ts`

The CrossOrgMatch table was renamed (mandateId → requestId). This action must be updated to use Request instead of Mandate.

- [ ] **Step 1: Replace fetchNetworkMandates with fetchNetworkRequests**

Open `actions/network/compute-cross-org-matches.ts`.

Find `fetchNetworkMandates` and replace with:

```typescript
async function fetchNetworkRequests(orgId: string): Promise<RequestForMatching[]> {
  const rows = await prismadb.request.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      draftStatus: { not: true },
      visibility: "SECURE", // Only SECURE+ requests participate in cross-org
    },
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      propertyCategory: true,
      propertyTypes: true,
      areasOfInterest: true,
      municipality: true,
      region: true,
      centerLatitude: true,
      centerLongitude: true,
      radiusKm: true,
      budgetMin: true,
      budgetMax: true,
      surfaceMin: true,
      surfaceMax: true,
      bedroomsMin: true,
      bedroomsMax: true,
      bathroomsMin: true,
      bathroomsMax: true,
      floorMin: true,
      floorMax: true,
      groundFloorOnly: true,
      constructionYearMin: true,
      constructionYearMax: true,
      conditionPreference: true,
      heatingTypes: true,
      energyClassMin: true,
      furnished: true,
      requiresElevator: true,
      requiresParking: true,
      requiresStorage: true,
      requiresGarden: true,
      petFriendly: true,
      insideCityPlan: true,
      amenities: true,
      goldenVisaEligible: true,
      financingStatus: true,
      timeline: true,
      assignedAgentId: true,
      organizationId: true,
    },
  });

  return rows.map((r): RequestForMatching => {
    const areas: string[] = Array.isArray(r.areasOfInterest)
      ? (r.areasOfInterest as string[])
      : [];
    if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
    if (r.region && !areas.includes(r.region)) areas.push(r.region);
    return {
      id: r.id,
      friendlyId: r.friendlyId,
      requestType: r.requestType as "BUY" | "RENT",
      propertyCategory: r.propertyCategory as RequestForMatching["propertyCategory"],
      propertyTypes: r.propertyTypes as RequestForMatching["propertyTypes"],
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      surfaceMin: r.surfaceMin,
      surfaceMax: r.surfaceMax,
      bedroomsMin: r.bedroomsMin,
      bedroomsMax: r.bedroomsMax,
      bathroomsMin: r.bathroomsMin,
      bathroomsMax: r.bathroomsMax,
      floorMin: r.floorMin,
      floorMax: r.floorMax,
      groundFloorOnly: r.groundFloorOnly,
      constructionYearMin: r.constructionYearMin,
      constructionYearMax: r.constructionYearMax,
      conditionPreference: r.conditionPreference as RequestForMatching["conditionPreference"],
      heatingTypes: r.heatingTypes as RequestForMatching["heatingTypes"],
      energyClassMin: r.energyClassMin as RequestForMatching["energyClassMin"],
      furnished: r.furnished as RequestForMatching["furnished"],
      requiresElevator: r.requiresElevator,
      requiresParking: r.requiresParking,
      requiresStorage: r.requiresStorage,
      requiresGarden: r.requiresGarden,
      petFriendly: r.petFriendly,
      insideCityPlan: r.insideCityPlan,
      amenities: r.amenities as Record<string, boolean> | null,
      goldenVisaEligible: r.goldenVisaEligible,
      financingStatus: r.financingStatus as RequestForMatching["financingStatus"],
      timeline: r.timeline as RequestForMatching["timeline"],
      areasOfInterest: areas.length > 0 ? areas : null,
      municipality: r.municipality,
      region: r.region,
      centerLatitude: r.centerLatitude,
      centerLongitude: r.centerLongitude,
      radiusKm: r.radiusKm,
      organizationId: r.organizationId,
      assignedAgentId: r.assignedAgentId,
    };
  });
}
```

- [ ] **Step 2: Update the CrossOrgMatch upsert**

Find the `crossOrgMatch.upsert` call and update the `mandateId/mandateOrgId` fields to `requestId/requestOrgId`. Also update the unique selector:

```typescript
// Old unique selector:
// { mandateId_propertyId: { mandateId, propertyId } }

// New unique selector:
// { requestId_propertyId_scope: { requestId: request.id, propertyId: property.id, scope: "BILATERAL" } }

await prismadb.crossOrgMatch.upsert({
  where: {
    requestId_propertyId_scope: {
      requestId: request.id,
      propertyId: property.id,
      scope: "BILATERAL",
    },
  },
  create: {
    requestOrgId: request.organizationId,
    requestId: request.id,
    propertyOrgId: property.organizationId,
    propertyId: property.id,
    scope: "BILATERAL",
    matchScore: match.overallScore,
    breakdown: match.breakdown as unknown as Record<string, unknown>,
    expiresAt: new Date(Date.now() + MATCH_TTL_DAYS * 24 * 60 * 60 * 1000),
  },
  update: {
    matchScore: match.overallScore,
    breakdown: match.breakdown as unknown as Record<string, unknown>,
    computedAt: new Date(),
    expiresAt: new Date(Date.now() + MATCH_TTL_DAYS * 24 * 60 * 60 * 1000),
  },
});
```

- [ ] **Step 3: Update all references from mandate to request**

Search the file for any remaining `mandate` references:

```bash
grep -n "mandate\|Mandate" actions/network/compute-cross-org-matches.ts
```

Fix each remaining reference (rename variable names, function calls, etc.).

- [ ] **Step 4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep "compute-cross-org" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add actions/network/compute-cross-org-matches.ts
git commit -m "feat(matchmaking): migrate cross-org-matches from Mandate to Request model"
```

---

## Task 14: Manual Trigger API Route

**Files:**
- Create: `app/api/matchmaking/run-now/route.ts`

This endpoint is called from the Property and Request detail pages. It rate-limits by updating `Request.lastMatchRunAt` and checking that 5 minutes have elapsed.

- [ ] **Step 1: Create the route**

```typescript
// app/api/matchmaking/run-now/route.ts
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternalError, apiBadRequest } from "@/lib/api-response";

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    // Optional: pass a requestId to update its lastMatchRunAt
    const body = await req.json().catch(() => ({}));
    const requestId = typeof body?.requestId === "string" ? body.requestId : null;

    if (requestId) {
      const request = await prismadb.request.findFirst({
        where: { id: requestId, organizationId },
        select: { lastMatchRunAt: true },
      });

      if (!request) return apiForbidden("Request not found in your organization");

      if (request.lastMatchRunAt) {
        const elapsed = Date.now() - request.lastMatchRunAt.getTime();
        if (elapsed < RATE_LIMIT_MS) {
          const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
          return apiBadRequest(
            `Rate limited. Try again in ${retryAfterSec}s.`
          );
        }
      }

      await prismadb.request.update({
        where: { id: requestId },
        data: { lastMatchRunAt: new Date() },
      });
    }

    const result = await runIntraOrgMatches(organizationId);

    return apiSuccess({
      upserted: result.upserted,
      skipped: result.skipped,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[MATCHMAKING_RUN_NOW]", error);
    return apiInternalError("Failed to run matching", error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/matchmaking/run-now/route.ts
git commit -m "feat(matchmaking): manual run-now API route with 5-min rate limiting"
```

---

## Task 15: Final Verification

**Files:** None

- [ ] **Step 1: Run all matchmaking tests**

```bash
pnpm vitest run tests/matchmaking/
```

Expected: all tests in `geo.test.ts`, `disqualifiers.test.ts`, `calculator-v2.test.ts` PASS.

- [ ] **Step 2: Full TypeScript build**

```bash
pnpm build 2>&1 | grep -c "error TS"
```

Expected: `0` (no TypeScript errors).

- [ ] **Step 3: Verify cron is registered**

```bash
cat vercel.json | jq '.crons[].path'
```

Expected output includes:
```
"/api/cron/reminders"
"/api/cron/cross-org-matches"
"/api/cron/cleanup-orphan-images"
"/api/cron/intra-org-matches"
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git status  # Review — should be clean or only changes in the above files
git commit -m "feat(matchmaking): v2 system complete — 3-layer scoring, geo, intra-org cron, manual trigger"
```

---

## Implementation Notes

### Things to Watch For

1. **`PropertyRequestMatch.matchScore` is stored as `Decimal` (0.0–1.0)** but the engine returns 0–100 integer. Divide by 100 on upsert: `matchScore: m.overallScore / 100`.

2. **CrossOrgMatch migration is destructive.** The migration will `DROP TABLE cross_org_matches` and recreate it. This is intentional — rows have a 30-day TTL and are pure cache. Confirm the migration prompt when running `pnpm db:migrate`.

3. **`MatchMethod.RULE_BASED`** is used for the upsert `matchMethod`. This value already exists in the enum — no schema change needed.

4. **`getWeightV2()` with orgWeights param**: The second argument is `Partial<Record<MatchCriterionV2, number>> | null`. The `OrgMatchWeights.weights` JSON field must be cast before passing. Named `getWeightV2` to avoid collision with the existing v1 `getWeight` export.

5. **`requireAction("matchmaking:run")`** is used for the manual trigger. This permission key already exists in the permissions union — no changes needed.

### Out of Scope (Deferred to v2.1)

- UI surface for `OrgMatchWeights` (weight configuration screen)
- Weekly calibration cron (`/api/cron/weight-calibration`) — schema models are ready, cron not yet built
- Timeline criterion: currently returns neutral 80 — real scoring requires adding a `readiness` or `availableFrom` field to Properties
- Polis scope in CrossOrgMatch (schema ready, no new compute action needed — extend cross-org when Polis is launched)
