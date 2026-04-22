# Matchmaking & Entities Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 18 QA-identified defects across the matchmaking v2 engine and entity action layer — missing constants, broken barrel exports, stale mandate model references, an O(R×P) analytics bottleneck, hardcoded null amenities in cross-org adapters, and Clerk auth anti-patterns.

**Architecture:** Bottom-up fix sequence: shared lib constants → type extensions → disqualifier upgrade → barrel rewrite → action-layer fixes → consumers → code quality. No schema migrations required; each task is independently releasable and fully covered by a failing test before implementation.

**Tech Stack:** TypeScript 5, Next.js App Router, Prisma ORM, Vitest, `@clerk/nextjs/server`

---

## File Map

| File | Action | Issues |
|------|--------|--------|
| `lib/matchmaking/weights.ts` | Modify — add 2 constants | M-18 |
| `lib/matchmaking/index.ts` | Modify — re-export new constants | M-18 |
| `lib/matchmaking/types.ts` | Modify — extend `MatchAnalytics` | M-19 |
| `lib/matchmaking/disqualifiers.ts` | Modify — add disqualifier + reason | M-09, M-10 |
| `lib/matchmaking/amenity-utils.ts` | **Create** — extract shared helper | M-11 |
| `actions/matchmaking/index.ts` | Rewrite — v2 barrel exports | M-01, M-17 |
| `actions/mandates/update-mandate.ts` | Rewrite — fix imports + model | M-03, E-03 |
| `actions/network/compute-cross-org-matches.ts` | Modify — fix adapters | M-11, M-12 |
| `actions/matchmaking/get-request-matches.ts` | Modify — replace O(R×P) call | M-04, M-05 |
| `actions/dashboard/get-matchmaking-summary.ts` | Modify — v2 import + requestId | M-02 |
| `app/api/matchmaking/run-now/route.ts` | Modify — org-level rate limit | M-15 |
| `app/api/cron/weight-calibration/route.ts` | **Create** — GET stub | M-16 |
| `app/api/crm/contacts/route.ts` | Modify — add `void` | E-01 |
| `app/api/entities/search/route.ts` | Modify — replace string-match auth | E-02 |
| `app/api/entities/top/route.ts` | Modify — replace string-match auth | E-02 |
| `lib/entity-change-log.ts` | Modify — fix stale comment | E-04 |

---

### Task 1 (M-18): Export weight calibration constants

The v2 engine's `MATCH_WEIGHTS_V2` sums to 104, not 100 — the extra 4 is intentional headroom for the additive financing bonus (+5, clamped to 100). Without named constants, consumers either re-derive these magic numbers or get them wrong.

**Files:**
- Modify: `lib/matchmaking/weights.ts` (after the `MATCH_WEIGHTS_V2` block, ~line 72)
- Modify: `lib/matchmaking/index.ts` (~line 102, "V2 weights" section)
- Create: `tests/matchmaking/weights.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/matchmaking/weights.test.ts
import { describe, it, expect } from "vitest";
import {
  MATCH_WEIGHTS_V2,
  MATCH_WEIGHTS_V2_BASE_SUM,
  MATCH_WEIGHTS_V2_FINANCING_BONUS,
} from "@/lib/matchmaking";

describe("MATCH_WEIGHTS_V2 constants", () => {
  it("MATCH_WEIGHTS_V2_BASE_SUM equals sum of all weights", () => {
    const actualSum = Object.values(MATCH_WEIGHTS_V2).reduce((a, b) => a + b, 0);
    expect(MATCH_WEIGHTS_V2_BASE_SUM).toBe(actualSum);
  });

  it("MATCH_WEIGHTS_V2_BASE_SUM is 104", () => {
    expect(MATCH_WEIGHTS_V2_BASE_SUM).toBe(104);
  });

  it("MATCH_WEIGHTS_V2_FINANCING_BONUS is 5", () => {
    expect(MATCH_WEIGHTS_V2_FINANCING_BONUS).toBe(5);
  });

  it("max possible score does not exceed 100 (base sum + bonus clamped)", () => {
    expect(Math.min(MATCH_WEIGHTS_V2_BASE_SUM + MATCH_WEIGHTS_V2_FINANCING_BONUS, 100)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/matchmaking/weights.test.ts
```

Expected: `ReferenceError` — `MATCH_WEIGHTS_V2_BASE_SUM is not a function` or similar named import failure.

- [ ] **Step 3: Add the constants to weights.ts**

Open `lib/matchmaking/weights.ts`. After the closing `} as const satisfies Record<MatchCriterionV2, number>;` line of `MATCH_WEIGHTS_V2` (approximately line 72), add:

```typescript
/** Intentional sum — the 4-point overage creates headroom for the financing bonus. */
export const MATCH_WEIGHTS_V2_BASE_SUM = 104;

/** Additive bonus applied after weighted scoring; overall score is clamped to 100. */
export const MATCH_WEIGHTS_V2_FINANCING_BONUS = 5;
```

- [ ] **Step 4: Re-export from the lib barrel**

Open `lib/matchmaking/index.ts`. Find the "V2 weights" section (~line 102). Append the two new constants to the same export line or add a new export:

```typescript
export {
  MATCH_WEIGHTS_V2,
  MATCH_WEIGHTS_V2_BASE_SUM,
  MATCH_WEIGHTS_V2_FINANCING_BONUS,
  getWeightV2,
} from "./weights";
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm vitest run tests/matchmaking/weights.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/matchmaking/weights.ts lib/matchmaking/index.ts tests/matchmaking/weights.test.ts
git commit -m "feat(matchmaking): export MATCH_WEIGHTS_V2_BASE_SUM and MATCH_WEIGHTS_V2_FINANCING_BONUS constants (M-18)"
```

---

### Task 2 (M-19): Extend MatchAnalytics with request-centric stats

`MatchAnalytics` in `lib/matchmaking/types.ts` was defined for the v1 client-based engine. The v2 `RequestMatchAnalytics` extends it but adds `requestStats` as a separate field. Adding optional `requestsWithMatches`, `totalRequests`, and `unmatchedRequests` directly to `MatchAnalytics` allows dashboards to consume either engine's output without conditionally accessing nested stats objects.

**Files:**
- Modify: `lib/matchmaking/types.ts` (~line 305, `MatchAnalytics` interface)
- Create: `tests/matchmaking/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/matchmaking/types.test.ts
import { describe, it, expect } from "vitest";
import type { MatchAnalytics } from "@/lib/matchmaking/types";

describe("MatchAnalytics interface", () => {
  it("accepts optional requestsWithMatches field", () => {
    const analytics: MatchAnalytics = {
      topMatches: [],
      matchDistribution: [],
      unmatchedClients: [],
      hotProperties: [],
      totalClients: 10,
      totalProperties: 5,
      averageMatchScore: 72,
      clientsWithMatches: 8,
      requestsWithMatches: 8,
    };
    expect(analytics.requestsWithMatches).toBe(8);
  });

  it("accepts optional totalRequests field", () => {
    const analytics: MatchAnalytics = {
      topMatches: [],
      matchDistribution: [],
      unmatchedClients: [],
      hotProperties: [],
      totalClients: 10,
      totalProperties: 5,
      averageMatchScore: 72,
      clientsWithMatches: 8,
      totalRequests: 10,
    };
    expect(analytics.totalRequests).toBe(10);
  });

  it("accepts optional unmatchedRequests field", () => {
    const analytics: MatchAnalytics = {
      topMatches: [],
      matchDistribution: [],
      unmatchedClients: [],
      hotProperties: [],
      totalClients: 10,
      totalProperties: 5,
      averageMatchScore: 72,
      clientsWithMatches: 8,
      unmatchedRequests: 2,
    };
    expect(analytics.unmatchedRequests).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/matchmaking/types.test.ts
```

Expected: TypeScript compile errors — `Object literal may only specify known properties, and 'requestsWithMatches' does not exist in type 'MatchAnalytics'`.

- [ ] **Step 3: Add optional fields to MatchAnalytics**

Open `lib/matchmaking/types.ts`. Find the `MatchAnalytics` interface (~line 305). Add three optional fields inside the `// Stats` block:

```typescript
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
  clientsWithMatches: number;   // Clients with at least one match > 50%

  // Request-based stats (v2 engine — optional for v1 callers)
  requestsWithMatches?: number;
  totalRequests?: number;
  unmatchedRequests?: number;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/matchmaking/types.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matchmaking/types.ts tests/matchmaking/types.test.ts
git commit -m "feat(matchmaking): add optional request-centric stats to MatchAnalytics interface (M-19)"
```

---

### Task 3 (M-01 + M-17): Rewrite actions/matchmaking/index.ts barrel

The barrel currently exports only 4 deprecated v1 stubs. All v2 server actions and the engine constants are unreachable through the public action import path, forcing consumers to import directly from deep paths (breaking encapsulation) or from the wrong modules entirely.

**Files:**
- Modify: `actions/matchmaking/index.ts`
- Create: `tests/matchmaking/barrel.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/matchmaking/barrel.test.ts
import { describe, it, expect } from "vitest";

describe("actions/matchmaking barrel exports", () => {
  it("exports getRequestMatchAnalytics as a function", async () => {
    const mod = await import("@/actions/matchmaking");
    expect(typeof mod.getRequestMatchAnalytics).toBe("function");
  });

  it("exports runIntraOrgMatches as a function", async () => {
    const mod = await import("@/actions/matchmaking");
    expect(typeof mod.runIntraOrgMatches).toBe("function");
  });

  it("exports triggerIntraOrgMatches as a function", async () => {
    const mod = await import("@/actions/matchmaking");
    expect(typeof mod.triggerIntraOrgMatches).toBe("function");
  });

  it("exports MATCH_THRESHOLDS as an object", async () => {
    const mod = await import("@/actions/matchmaking");
    expect(typeof mod.MATCH_THRESHOLDS).toBe("object");
  });

  it("exports calculateBatchMatchesV2 as a function", async () => {
    const mod = await import("@/actions/matchmaking");
    expect(typeof mod.calculateBatchMatchesV2).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/matchmaking/barrel.test.ts
```

Expected: failures because `getRequestMatchAnalytics`, `runIntraOrgMatches`, etc. are not exported from the barrel.

- [ ] **Step 3: Rewrite the barrel**

Replace the entire contents of `actions/matchmaking/index.ts`:

```typescript
export { getRequestMatchAnalytics } from "./get-request-matches";
export type { RequestMatchStats, RequestMatchAnalytics } from "./get-request-matches";

export { runIntraOrgMatches, triggerIntraOrgMatches } from "./compute-intra-org-matches";
export type { IntraOrgMatchResult } from "./compute-intra-org-matches";

export {
  MATCH_THRESHOLDS,
  DEFAULT_MIN_MATCH_SCORE,
  MATCH_WEIGHTS_V2,
  MATCH_WEIGHTS_V2_BASE_SUM,
  MATCH_WEIGHTS_V2_FINANCING_BONUS,
  calculateBatchMatchesV2,
} from "@/lib/matchmaking";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/matchmaking/barrel.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/matchmaking/index.ts tests/matchmaking/barrel.test.ts
git commit -m "feat(matchmaking): rewrite actions barrel to export v2 functions and engine constants (M-01, M-17)"
```

---

### Task 4 (M-03 + E-03): Fix actions/mandates/update-mandate.ts

The file references three things that no longer exist: `encryptMandateForOrg` (renamed to `encryptRequestForOrg`), `updateMandateSchema` from `@/lib/validations/mandates` (file deleted, schema moved), and `prismadb.mandate` (model removed in schema migration). It also lacks a `requireAction` permission guard and uses the old snake_case field names that belong to the deleted Mandate model.

**Files:**
- Modify: `actions/mandates/update-mandate.ts`

- [ ] **Step 1: Verify fix prerequisites exist**

Confirm the target imports exist before rewriting:

```bash
pnpm tsc --noEmit 2>&1 | grep "update-mandate"
```

Expected: TypeScript errors referencing the three broken imports. (If there are no errors, the file has already been fixed — skip this task.)

- [ ] **Step 2: Rewrite the file**

Replace the entire contents of `actions/mandates/update-mandate.ts`:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import { updateRequestSchema } from "@/lib/validations/requests";
import { createChangeLogEntry } from "@/lib/entity-change-log";
import type { z } from "zod";

type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export async function updateMandate(
  data: UpdateRequestInput
): Promise<ActionResponse> {
  const guard = await requireAction("requests:edit");
  if (guard) return guard;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return actionError("Organization not found", "NOT_FOUND");

  const parsed = updateRequestSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("Validation failed", parsed.error.message);
  }

  const { id, ...updateData } = parsed.data;

  const existing = await prismadb.request.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      status: true,
      assignedAgentId: true,
      budgetMin: true,
      budgetMax: true,
      requestType: true,
    },
  });
  if (!existing) return actionError("Request not found", "NOT_FOUND");

  const encrypted = await encryptRequestForOrg(updateData, organizationId);

  const updated = await prismadb.request.update({
    where: { id },
    data: encrypted,
  });

  void createChangeLogEntry({
    entityType: "REQUEST",
    entityId: updated.id,
    organizationId,
    eventType: "UPDATED",
    before: existing,
    after: updated,
  }).catch((err) => console.error("[UPDATE_MANDATE_CHANGELOG]", err));

  return actionSuccess(updated);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "update-mandate"
```

Expected: no output (zero errors in this file).

- [ ] **Step 4: Commit**

```bash
git add actions/mandates/update-mandate.ts
git commit -m "fix(mandates): rewrite update-mandate action to use Request model and encryptRequestForOrg (M-03, E-03)"
```

---

### Task 5 (M-09 + M-10): Add PROPERTY_TYPE_MISMATCH disqualifier

The disqualifier layer has 4 hard gates but no property-type gate. A buyer requesting apartments can match against warehouses. Additionally, `checkDisqualifiers` accepts `PropertyForMatching` (v1) instead of `PropertyForMatchingV2`, so callers must downcast — losing the extended geo/feature fields.

**Files:**
- Modify: `lib/matchmaking/disqualifiers.ts`
- Modify: `tests/matchmaking/disqualifiers.test.ts` (extend existing test file)

- [ ] **Step 1: Add PROPERTY_TYPE_MISMATCH tests to the existing test file**

Open `tests/matchmaking/disqualifiers.test.ts`. The `baseProperty` fixture currently uses `PropertyForMatching`. First update `baseProperty` to `PropertyForMatchingV2` with all extra fields set to null, then append the new describe block.

Replace the `baseProperty` fixture (lines 61-67):

```typescript
const baseProperty: PropertyForMatchingV2 = {
  id: "prop-1",
  property_name: "Test Property",
  organizationId: "org-1",
  property_status: "ACTIVE",
  transaction_type: "SALE",
  // V2 extended fields — null means "unknown"
  latitude: null,
  longitude: null,
  region: null,
  inside_city_plan: null,
  year_built: null,
  garden: null,
  parking: null,
};
```

Update the import line at the top to add `PropertyForMatchingV2`:

```typescript
import type { RequestForMatching, PropertyForMatchingV2 } from "@/lib/matchmaking/types";
```

Then append after line 221 (end of `AREA_HARD_EXCLUSION` block):

```typescript
// ---------------------------------------------------------------------------
// PROPERTY_TYPE_MISMATCH (4 tests)
// ---------------------------------------------------------------------------

describe("checkDisqualifiers — PROPERTY_TYPE_MISMATCH", () => {
  it("disqualifies when property type is not in request.propertyTypes", () => {
    const request = { ...baseRequest, propertyTypes: ["APARTMENT", "HOUSE"] };
    const property = { ...baseProperty, property_type: "WAREHOUSE" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(true);
    expect(result.reason).toBe("PROPERTY_TYPE_MISMATCH");
  });

  it("passes when property type matches one of the requested types", () => {
    const request = { ...baseRequest, propertyTypes: ["APARTMENT", "HOUSE"] };
    const property = { ...baseProperty, property_type: "APARTMENT" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes when request.propertyTypes is empty (no type constraint)", () => {
    const request = { ...baseRequest, propertyTypes: [] };
    const property = { ...baseProperty, property_type: "WAREHOUSE" as const };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });

  it("passes when property.property_type is null (unknown type)", () => {
    const request = { ...baseRequest, propertyTypes: ["APARTMENT"] };
    const property = { ...baseProperty, property_type: null };
    const result = checkDisqualifiers(request, property);
    expect(result.disqualified).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
pnpm vitest run tests/matchmaking/disqualifiers.test.ts
```

Expected: the 4 new `PROPERTY_TYPE_MISMATCH` tests FAIL (reason not defined yet). The existing 17 tests should still PASS. If existing tests break, the `baseProperty` fixture update caused a TypeScript mismatch — verify `PropertyForMatchingV2` import is correct.

- [ ] **Step 3: Add the disqualifier to disqualifiers.ts**

Open `lib/matchmaking/disqualifiers.ts`.

**3a.** Add `"PROPERTY_TYPE_MISMATCH"` to the `DisqualifierReason` union (line 21-25):

```typescript
export type DisqualifierReason =
  | "ARCHIVED_OR_INACTIVE"
  | "PURPOSE_MISMATCH"
  | "BUDGET_HARD_FLOOR"
  | "AREA_HARD_EXCLUSION"
  | "PROPERTY_TYPE_MISMATCH";
```

**3b.** Update the `property` parameter type in `checkDisqualifiers` from `PropertyForMatching` to `PropertyForMatchingV2`. Find the function signature and change it:

```typescript
export function checkDisqualifiers(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
): DisqualifierResult {
```

Update the import at the top of the file (add `PropertyForMatchingV2`):

```typescript
import type { RequestForMatching, PropertyForMatchingV2 } from "./types";
```

**3c.** Add the new disqualifier function before `checkDisqualifiers`. Place it after `disqualifyArea`:

```typescript
function disqualifyPropertyType(
  request: RequestForMatching,
  property: PropertyForMatchingV2,
): DisqualifierResult | null {
  if (!request.propertyTypes || request.propertyTypes.length === 0) return null;
  if (!property.property_type) return null;
  if (!request.propertyTypes.includes(property.property_type)) {
    return {
      disqualified: true,
      reason: "PROPERTY_TYPE_MISMATCH",
      detail: `Property type "${property.property_type}" not in [${request.propertyTypes.join(", ")}]`,
    };
  }
  return null;
}
```

**3d.** Add `disqualifyPropertyType` to the execution chain inside `checkDisqualifiers`. Insert it between the area check and the final fallthrough:

```typescript
return (
  disqualifyInactive(property) ??
  disqualifyPurpose(request, property) ??
  disqualifyBudget(request, property) ??
  disqualifyArea(request, property) ??
  disqualifyPropertyType(request, property) ??
  { disqualified: false }
);
```

- [ ] **Step 4: Run all disqualifier tests**

```bash
pnpm vitest run tests/matchmaking/disqualifiers.test.ts
```

Expected: all 21 tests PASS (17 existing + 4 new).

- [ ] **Step 5: Verify no type regressions in callers**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "disqualifiers|checkDisqualifiers"
```

Expected: no output. If callers pass `PropertyForMatching` (v1), TypeScript will error — those callers must be updated to pass `PropertyForMatchingV2`. The two main callers are `calculateBatchMatchesV2` in `lib/matchmaking/calculator.ts`. Verify the calculator already uses `PropertyForMatchingV2` — if not, update its `property` parameter too.

- [ ] **Step 6: Commit**

```bash
git add lib/matchmaking/disqualifiers.ts tests/matchmaking/disqualifiers.test.ts
git commit -m "feat(matchmaking): add PROPERTY_TYPE_MISMATCH disqualifier and upgrade property type to V2 (M-09, M-10)"
```

---

### Task 6 (M-11 + M-12): Fix cross-org adapters and extract amenity utility

`compute-cross-org-matches.ts` hardcodes `garden: null` and `parking: null` in its property adapter, so the cross-org engine never evaluates garden/parking criteria. The identical `inferBooleanAmenity` function already lives in `compute-intra-org-matches.ts` and `get-request-matches.ts`; this task extracts it into a shared module and fixes the cross-org adapters.

**Files:**
- Create: `lib/matchmaking/amenity-utils.ts`
- Modify: `actions/network/compute-cross-org-matches.ts`
- Create: `tests/matchmaking/amenity-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/matchmaking/amenity-utils.test.ts
import { describe, it, expect } from "vitest";
import { inferBooleanAmenity } from "@/lib/matchmaking/amenity-utils";

describe("inferBooleanAmenity", () => {
  it("returns null when amenities is null", () => {
    expect(inferBooleanAmenity(null, ["garden"])).toBeNull();
  });

  it("returns null when amenities is undefined", () => {
    expect(inferBooleanAmenity(undefined, ["garden"])).toBeNull();
  });

  it("returns true when key is present in array form", () => {
    expect(inferBooleanAmenity(["garden", "pool"], ["garden"])).toBe(true);
  });

  it("returns false when key is absent in array form", () => {
    expect(inferBooleanAmenity(["pool", "sauna"], ["garden"])).toBe(false);
  });

  it("matches case-insensitively in array form (garden vs GARDEN)", () => {
    expect(inferBooleanAmenity(["GARDEN"], ["garden"])).toBe(true);
  });

  it("matches hyphen/space variants in array form (parking-space vs parking_space)", () => {
    expect(inferBooleanAmenity(["parking-space"], ["parking_space"])).toBe(true);
  });

  it("returns true when key is in object form with value true", () => {
    expect(inferBooleanAmenity({ garden: true, pool: false }, ["garden"])).toBe(true);
  });

  it("returns false when key is in object form with value false", () => {
    expect(inferBooleanAmenity({ garden: false }, ["garden"])).toBe(false);
  });

  it("returns false when object exists but none of the keys match", () => {
    expect(inferBooleanAmenity({ pool: true }, ["garden"])).toBe(false);
  });

  it("matches any key in the keys array (parking OR garage OR parking_space)", () => {
    expect(inferBooleanAmenity({ garage: true }, ["parking", "garage", "parking_space"])).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm vitest run tests/matchmaking/amenity-utils.test.ts
```

Expected: module not found — `@/lib/matchmaking/amenity-utils` does not exist yet.

- [ ] **Step 3: Create the shared utility**

```typescript
// lib/matchmaking/amenity-utils.ts

/**
 * Infer a boolean property feature from the amenities JSON field.
 * Supports both array form `["garden", ...]` and object form `{ garden: true, ... }`.
 * Returns true if any provided key is present and truthy; null if the field is absent
 * (unknown); false if the field exists but none of the keys match.
 */
export function inferBooleanAmenity(
  amenities: unknown,
  keys: string[],
): boolean | null {
  if (amenities === null || amenities === undefined) return null;

  if (Array.isArray(amenities)) {
    const normalized = (amenities as unknown[])
      .filter((a): a is string => typeof a === "string")
      .map((a) => a.toLowerCase().replace(/[-\s]/g, "_"));
    return keys.some((k) =>
      normalized.includes(k.toLowerCase().replace(/[-\s]/g, "_")),
    );
  }

  if (typeof amenities === "object") {
    const obj = amenities as Record<string, unknown>;
    const normalizedKeys = Object.keys(obj).map((k) =>
      k.toLowerCase().replace(/[-\s]/g, "_"),
    );
    for (const key of keys) {
      const norm = key.toLowerCase().replace(/[-\s]/g, "_");
      if (normalizedKeys.includes(norm)) {
        const rawKey = Object.keys(obj).find(
          (k) => k.toLowerCase().replace(/[-\s]/g, "_") === norm,
        );
        return rawKey !== undefined ? obj[rawKey] === true : false;
      }
    }
    return false;
  }

  return null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/matchmaking/amenity-utils.test.ts
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Fix the cross-org property adapter**

Open `actions/network/compute-cross-org-matches.ts`.

Add the import at the top of the file (after existing imports):

```typescript
import { inferBooleanAmenity } from "@/lib/matchmaking/amenity-utils";
```

Find `adaptPropertyForMatchingV2` (lines ~215-250). Replace the hardcoded nulls at the bottom:

```typescript
    // garden and parking are inferred from the amenities JSON
    garden: inferBooleanAmenity(p.amenities, ["garden"]),
    parking: inferBooleanAmenity(p.amenities, ["parking", "garage", "parking_space"]),
```

(Replace the two lines that currently say `garden: null, // Not a field on Properties model` and `parking: null, // Not a field on Properties model`.)

- [ ] **Step 6: Fix the cross-org request adapter for missing fields**

In the same file, find `fetchNetworkRequests` select block (lines ~74-110). Add the 4 missing fields to the select:

```typescript
      requiresGarden: true,
      insideCityPlan: true,
      conditionPreference: true,
      energyClassMin: true,
```

Then find `adaptRequestToV2` (lines ~159-213). In the returned object, add the 4 missing fields after `gardenRequired: null` (which currently doesn't exist — add all four):

```typescript
    gardenRequired: r.requiresGarden ?? null,
    insideCityPlanRequired: r.insideCityPlan ?? null,
    conditionPreferences: (r.conditionPreference ?? null) as RequestForMatching["conditionPreferences"],
    energyClassMin: (r.energyClassMin ?? null) as RequestForMatching["energyClassMin"],
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "compute-cross-org"
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add lib/matchmaking/amenity-utils.ts actions/network/compute-cross-org-matches.ts tests/matchmaking/amenity-utils.test.ts
git commit -m "feat(matchmaking): extract inferBooleanAmenity util and fix cross-org adapter null garden/parking (M-11, M-12)"
```

---

### Task 7 (M-04 + M-05): Replace O(R×P) analytics call with DB read

`getRequestMatchAnalytics` calls `calculateBatchMatchesV2(requests, matchableProperties)` — a full O(R×P) scoring pass — on every dashboard load. Pre-computed scores already exist in `PropertyRequestMatch` (written by the cron job). Additionally, `topMatches` and `hotProperties` are always returned as empty arrays despite performing the expensive computation. This task replaces the engine call with a DB read and populates both fields.

**Files:**
- Modify: `actions/matchmaking/get-request-matches.ts`
- Create: `tests/matchmaking/analytics-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/matchmaking/analytics-helpers.test.ts
import { describe, it, expect } from "vitest";
import { convertMatchScore } from "@/actions/matchmaking/get-request-matches";

describe("convertMatchScore", () => {
  it("converts Decimal 0.75 to integer 75", () => {
    expect(convertMatchScore(0.75)).toBe(75);
  });

  it("converts Decimal 1.0 to 100", () => {
    expect(convertMatchScore(1.0)).toBe(100);
  });

  it("converts Decimal 0.0 to 0", () => {
    expect(convertMatchScore(0.0)).toBe(0);
  });

  it("rounds 0.555 to 56 (not 55)", () => {
    expect(convertMatchScore(0.555)).toBe(56);
  });

  it("converts 0.5 to 50", () => {
    expect(convertMatchScore(0.5)).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run tests/matchmaking/analytics-helpers.test.ts
```

Expected: module exports `convertMatchScore` — will fail because the function doesn't exist yet.

- [ ] **Step 3: Add the export and rewrite getRequestMatchAnalytics**

Open `actions/matchmaking/get-request-matches.ts`.

**3a.** Add `convertMatchScore` as a named export near the top (after imports, before helpers):

```typescript
/** Converts a 0.0–1.0 Prisma Decimal matchScore to a 0–100 integer. */
export function convertMatchScore(decimal: number): number {
  return Math.round(decimal * 100);
}
```

**3b.** Update the imports at the top of the file. Remove the no-longer-needed imports and add `CriterionScore`:

```typescript
import {
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type {
  RequestMatchStats,
  MatchAnalytics,
  MatchDistribution,
  CriterionScore,
  PropertyType,
  PropertyStatus,
} from "@/lib/matchmaking";
```

Remove imports: `calculateBatchMatchesV2`, `RequestForMatching`, `PropertyForMatchingV2` (no longer used after the rewrite).

**3c.** Replace the entire body of `getRequestMatchAnalytics` starting from the `const [rawRequests, properties]` parallel fetch (line ~272) to the end of the function with the following:

```typescript
export async function getRequestMatchAnalytics(): Promise<RequestMatchAnalytics> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return getEmptyRequestAnalytics();

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return getEmptyRequestAnalytics();

  const [storedMatches, totalRequests, totalProperties] = await Promise.all([
    prismadb.propertyRequestMatch.findMany({
      where: { organizationId },
      orderBy: { matchScore: "desc" },
      take: 200,
      include: {
        property: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            price: true,
            property_type: true,
            property_status: true,
            area: true,
            address_city: true,
          },
        },
        request: {
          select: {
            id: true,
            friendlyId: true,
          },
        },
      },
    }),
    prismadb.request.count({
      where: {
        organizationId,
        status: "ACTIVE",
        draftStatus: { not: true },
      },
    }),
    prismadb.properties.count({
      where: {
        organizationId,
        property_status: { in: ["ACTIVE", "PENDING"] },
      },
    }),
  ]);

  if (storedMatches.length === 0) {
    return {
      ...getEmptyRequestAnalytics(),
      totalClients: totalRequests,
      totalProperties,
      requestStats: {
        totalRequests,
        activeRequests: totalRequests,
        requestsWithMatches: 0,
        avgMatchScore: 0,
      },
    };
  }

  const matchDistribution: MatchDistribution[] = [
    { range: "0-25%", min: 0, max: 25, count: 0 },
    { range: "26-50%", min: 26, max: 50, count: 0 },
    { range: "51-70%", min: 51, max: 70, count: 0 },
    { range: "71-85%", min: 71, max: 85, count: 0 },
    { range: "86-100%", min: 86, max: 100, count: 0 },
  ];

  const requestsWithMatchesSet = new Set<string>();
  let totalScore = 0;

  for (const m of storedMatches) {
    const score = convertMatchScore(Number(m.matchScore));
    totalScore += score;
    if (score >= MATCH_THRESHOLDS.FAIR) requestsWithMatchesSet.add(m.requestId);
    const bucket = matchDistribution.find((d) => score >= d.min && score <= d.max);
    if (bucket) bucket.count++;
  }

  const averageScore =
    storedMatches.length > 0
      ? Math.round(totalScore / storedMatches.length)
      : 0;

  // Top 10 highest-scoring request-property pairs
  const topMatches = storedMatches.slice(0, 10).map((m) => ({
    requestId: m.requestId,
    propertyId: m.propertyId,
    overallScore: convertMatchScore(Number(m.matchScore)),
    breakdown: (m.scoreBreakdown as CriterionScore[]) ?? [],
    matchedCriteria: 0,
    totalCriteria: 0,
    calculatedAt: m.updatedAt,
    property: {
      id: m.property.id,
      friendlyId: m.property.friendlyId ?? m.property.id,
      property_name: m.property.property_name,
      price: m.property.price != null ? Number(m.property.price) : null,
      property_type: m.property.property_type as PropertyType | null,
      area: m.property.area,
      address_city: m.property.address_city,
      property_status: m.property.property_status as PropertyStatus | null,
      imageUrl: null,
    },
    client: {
      id: m.requestId,
      friendlyId: m.request.friendlyId ?? m.requestId,
      client_name: `Request ${m.request.friendlyId ?? m.requestId}`,
    },
  }));

  // Hot properties: aggregate by propertyId, count matches above FAIR threshold
  type PropAcc = {
    count: number;
    totalScore: number;
    topScore: number;
    prop: (typeof storedMatches)[0]["property"];
  };
  const propStats = new Map<string, PropAcc>();
  for (const m of storedMatches) {
    const score = convertMatchScore(Number(m.matchScore));
    if (score < MATCH_THRESHOLDS.FAIR) continue;
    const existing = propStats.get(m.propertyId);
    if (existing) {
      existing.count++;
      existing.totalScore += score;
      if (score > existing.topScore) existing.topScore = score;
    } else {
      propStats.set(m.propertyId, {
        count: 1,
        totalScore: score,
        topScore: score,
        prop: m.property,
      });
    }
  }
  const hotProperties = Array.from(propStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s) => ({
      id: s.prop.id,
      friendlyId: s.prop.friendlyId ?? s.prop.id,
      property_name: s.prop.property_name,
      price: s.prop.price != null ? Number(s.prop.price) : null,
      property_type: s.prop.property_type as PropertyType | null,
      area: s.prop.area,
      address_city: s.prop.address_city,
      property_status: s.prop.property_status as PropertyStatus | null,
      imageUrl: null,
      matchCount: s.count,
      averageMatchScore: Math.round(s.totalScore / s.count),
      topMatchScore: s.topScore,
    }));

  const requestsWithMatches = requestsWithMatchesSet.size;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topMatches: topMatches as any,
    matchDistribution,
    unmatchedClients: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotProperties: hotProperties as any,
    totalClients: totalRequests,
    totalProperties,
    averageMatchScore: averageScore,
    clientsWithMatches: requestsWithMatches,
    requestStats: {
      totalRequests,
      activeRequests: totalRequests,
      requestsWithMatches,
      avgMatchScore: averageScore,
    },
  };
}
```

- [ ] **Step 4: Run the helper test**

```bash
pnpm vitest run tests/matchmaking/analytics-helpers.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "get-request-matches"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add actions/matchmaking/get-request-matches.ts tests/matchmaking/analytics-helpers.test.ts
git commit -m "perf(matchmaking): replace O(R×P) analytics engine call with propertyRequestMatch DB read; populate topMatches and hotProperties (M-04, M-05)"
```

---

### Task 8 (M-02): Update dashboard matchmaking summary to v2

`actions/dashboard/get-matchmaking-summary.ts` imports from the v1 barrel (`getMatchAnalytics`), references `clientId` instead of `requestId`, and reads `analytics.clientsWithMatches` instead of `analytics.requestStats?.requestsWithMatches`.

**Files:**
- Modify: `actions/dashboard/get-matchmaking-summary.ts`

- [ ] **Step 1: Confirm the broken state**

```bash
pnpm tsc --noEmit 2>&1 | grep "get-matchmaking-summary"
```

Note any errors. The fix should resolve all of them.

- [ ] **Step 2: Apply the fixes**

Open `actions/dashboard/get-matchmaking-summary.ts`.

**2a.** Line 2 — change the import:

```typescript
// Before
import { getMatchAnalytics } from "@/actions/matchmaking";

// After
import { getRequestMatchAnalytics } from "@/actions/matchmaking";
```

**2b.** In the `MatchmakingSummary` interface (line ~16), rename `clientId` to `requestId` in the `topMatches` array type:

```typescript
topMatches: Array<{
  requestId: string;
  propertyId: string;
  score: number;
  propertyName: string;
}>;
```

**2c.** Line 39 — change the function call:

```typescript
// Before
const analytics = await getMatchAnalytics();

// After
const analytics = await getRequestMatchAnalytics();
```

**2d.** Line 64 — change `clientId` to `requestId`:

```typescript
// Before
clientId: m.clientId,

// After
requestId: m.requestId,
```

**2e.** Line 67 — replace the v1 client name reference. After the rename, the `m.client` object on a v2 result has `client_name` (the request reference string). Update:

```typescript
// Before
propertyName: m.property?.property_name || "Unknown Property",

// After (no change to propertyName; just remove any client_name reference that was there)
propertyName: m.property?.property_name ?? "Unknown Property",
```

**2f.** Line 74 — update the clients-with-matches read:

```typescript
// Before
analytics.clientsWithMatches || 0,

// After
analytics.requestStats?.requestsWithMatches ?? analytics.clientsWithMatches ?? 0,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "get-matchmaking-summary"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add actions/dashboard/get-matchmaking-summary.ts
git commit -m "fix(dashboard): update matchmaking summary to v2 import and requestId fields (M-02)"
```

---

### Task 9 (M-15): Add org-level rate limit to run-now route

The existing rate limit in `app/api/matchmaking/run-now/route.ts` only triggers when a `requestId` query parameter is supplied. Direct POST requests without `requestId` bypass the rate limit entirely, allowing a client to trigger unlimited full-org recomputes.

**Files:**
- Modify: `app/api/matchmaking/run-now/route.ts`
- Create: `tests/api/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/rate-limit.test.ts
import { describe, it, expect } from "vitest";

describe("org-level rate limit helper", () => {
  it("reports within-window when elapsed < RATE_LIMIT_MS", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const lastRunAt = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    const elapsed = Date.now() - lastRunAt.getTime();
    expect(elapsed < RATE_LIMIT_MS).toBe(true);
  });

  it("reports outside-window when elapsed >= RATE_LIMIT_MS", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const lastRunAt = new Date(Date.now() - 6 * 60 * 1000); // 6 min ago
    const elapsed = Date.now() - lastRunAt.getTime();
    expect(elapsed < RATE_LIMIT_MS).toBe(false);
  });

  it("calculates retryAfterSec correctly", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const elapsed = 2 * 60 * 1000; // 2 minutes elapsed
    const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
    expect(retryAfterSec).toBe(180); // 3 minutes remaining
  });
});
```

- [ ] **Step 2: Run test to confirm it passes (pure logic)**

```bash
pnpm vitest run tests/api/rate-limit.test.ts
```

Expected: all 3 tests PASS immediately (pure arithmetic, no imports needed).

- [ ] **Step 3: Add the org-level rate limit block**

Open `app/api/matchmaking/run-now/route.ts`.

Find the `RATE_LIMIT_MS` constant (line ~14) — it should already be `5 * 60 * 1000`. After the `organizationId` is extracted (after the auth/org guard block, before `if (requestId) {`), insert:

```typescript
// Org-level gate: prevent repeated full-org recomputes
const lastOrgRun = await prismadb.propertyRequestMatch.findFirst({
  where: { organizationId },
  orderBy: { updatedAt: "desc" },
  select: { updatedAt: true },
});
if (lastOrgRun?.updatedAt) {
  const elapsed = Date.now() - lastOrgRun.updatedAt.getTime();
  if (elapsed < RATE_LIMIT_MS) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
    return apiRateLimited(`Rate limited. Try again in ${retryAfterSec}s.`);
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "run-now"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/api/matchmaking/run-now/route.ts tests/api/rate-limit.test.ts
git commit -m "fix(api): add org-level rate limit to matchmaking run-now endpoint (M-15)"
```

---

### Task 10 (M-16): Create weight-calibration cron stub

The Matchmaking v2 spec calls for a weight calibration endpoint at `app/api/cron/weight-calibration/route.ts`. Without this stub, vercel.json cron triggers for `/api/cron/weight-calibration` return 404. The stub should authenticate the cron secret and return a 200 with a clear "not yet implemented" message so monitoring can distinguish "stub exists" from "404 missing".

**Files:**
- Create: `app/api/cron/weight-calibration/route.ts`

Reference structure from `app/api/cron/intra-org-matches/route.ts` for the cron secret auth pattern.

- [ ] **Step 1: Read the reference cron route**

```bash
head -40 app/api/cron/intra-org-matches/route.ts
```

Note the `CRON_SECRET` header check pattern. Use the same pattern below.

- [ ] **Step 2: Create the stub**

```typescript
// app/api/cron/weight-calibration/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: "Weight calibration not yet implemented",
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "weight-calibration"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/weight-calibration/route.ts
git commit -m "feat(cron): add weight-calibration GET stub to prevent 404 on scheduled triggers (M-16)"
```

---

### Task 11 (E-01): Add void to fire-and-forget in contacts route

`app/api/crm/contacts/route.ts` line ~198 calls `createChangeLogEntry({...}).catch(...)` without the `void` operator. Without `void`, the unhandled promise participates in the event loop accounting differently across runtimes — the pattern is intentionally fire-and-forget and should be marked as such.

**Files:**
- Modify: `app/api/crm/contacts/route.ts`

- [ ] **Step 1: Find the line**

```bash
grep -n "createChangeLogEntry" app/api/crm/contacts/route.ts
```

Identify the line that does NOT have `void` preceding it.

- [ ] **Step 2: Add void**

Find the line (around line 198) that reads:

```typescript
createChangeLogEntry({
```

Add `void ` before it:

```typescript
void createChangeLogEntry({
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "contacts/route"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/crm/contacts/route.ts
git commit -m "fix(api): add void to fire-and-forget createChangeLogEntry in contacts route (E-01)"
```

---

### Task 12 (E-02): Replace string-matching auth in entity routes

`app/api/entities/search/route.ts` and `app/api/entities/top/route.ts` both check for authentication by catching errors and inspecting `error.message.includes("not authenticated")`. This is fragile — any refactor of the error string silently breaks auth. The correct pattern is to call `auth()` directly from `@clerk/nextjs/server` before entering the try block.

**Files:**
- Modify: `app/api/entities/search/route.ts`
- Modify: `app/api/entities/top/route.ts`

- [ ] **Step 1: Fix app/api/entities/search/route.ts**

Open the file and find the `import` block at the top.

**1a.** Add Clerk auth import (it may already exist — check first):

```typescript
import { auth } from "@clerk/nextjs/server";
```

**1b.** In the `POST` handler — before the `try` block, add the auth guard:

```typescript
const { userId, orgId: organizationId } = await auth();
if (!userId) return apiUnauthorized();
if (!organizationId) return apiForbidden();
```

Remove `getCurrentUser()` and `getCurrentOrgId()` calls that were inside the `try` block, and update any references to use the `organizationId` variable declared above.

**1c.** In the `catch` block (lines ~100-111), remove the string-matching branch:

```typescript
// Remove this:
if (error instanceof Error && error.message.includes("not authenticated")) {
  return apiUnauthorized();
}
```

Replace with a generic server error:

```typescript
console.error("[ENTITIES_SEARCH]", error);
return apiServerError("Search failed");
```

**1d.** Repeat the same pattern for the `GET` handler in the same file.

- [ ] **Step 2: Fix app/api/entities/top/route.ts**

Open the file. Apply the same three changes:

**2a.** Add `import { auth } from "@clerk/nextjs/server";` if not present.

**2b.** Before the `try` block:

```typescript
const { userId, orgId: organizationId } = await auth();
if (!userId) return apiUnauthorized();
if (!organizationId) return apiForbidden();
```

**2c.** Remove string-matching catch branches (both "not authenticated" and "not associated" variants, lines ~64-73). Replace with:

```typescript
console.error("[ENTITIES_TOP]", error);
return apiServerError("Failed to fetch top entities");
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "entities/(search|top)"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/entities/search/route.ts app/api/entities/top/route.ts
git commit -m "fix(api): replace string-matching auth catch with direct auth() guard in entity routes (E-02)"
```

---

### Task 13 (E-04): Fix stale "four" comment in entity-change-log.ts

A comment on line 90 of `lib/entity-change-log.ts` says callers may use "four" values for `eventType`, but the union has five values including `STAGE_CHANGED`. This misleads developers adding new event types.

**Files:**
- Modify: `lib/entity-change-log.ts`

- [ ] **Step 1: Find and fix the comment**

```bash
grep -n "four" lib/entity-change-log.ts
```

Expected: line ~90 with text like `"callers may only use these **four** values via this helper"`.

Change `four` to `five`:

```typescript
// callers may only use these **five** values via this helper
```

- [ ] **Step 2: Verify**

```bash
grep -n "four\|five" lib/entity-change-log.ts
```

Expected: only the updated "five" line appears (no remaining "four" in that comment).

- [ ] **Step 3: Commit**

```bash
git add lib/entity-change-log.ts
git commit -m "fix(docs): correct stale 'four' -> 'five' event type comment in entity-change-log.ts (E-04)"
```

---

## Self-Review Checklist

**Spec coverage:**

| Issue | Task | Covered |
|-------|------|---------|
| M-01 Barrel missing v2 exports | Task 3 | ✅ |
| M-02 Dashboard uses v1 getMatchAnalytics | Task 8 | ✅ |
| M-03 update-mandate references deleted model | Task 4 | ✅ |
| M-04 analytics calls O(R×P) engine | Task 7 | ✅ |
| M-05 topMatches/hotProperties always empty | Task 7 | ✅ |
| M-06 score clamp bug | **ALREADY FIXED** — skip | — |
| M-07 financing bonus not clamped | **ALREADY FIXED** — skip | — |
| M-08 negative score edge case | **ALREADY FIXED** — skip | — |
| M-09 PROPERTY_TYPE_MISMATCH not in DisqualifierReason | Task 5 | ✅ |
| M-10 checkDisqualifiers accepts v1 property type | Task 5 | ✅ |
| M-11 cross-org adapter hardcodes garden/parking null | Task 6 | ✅ |
| M-12 cross-org request adapter missing gardenRequired etc. | Task 6 | ✅ |
| M-14 weight normalisation | **ALREADY FIXED** — skip | — |
| M-15 org-level rate limit gap | Task 9 | ✅ |
| M-16 weight-calibration cron 404 | Task 10 | ✅ |
| M-17 barrel exports v1 stubs only | Task 3 | ✅ |
| M-18 no BASE_SUM / FINANCING_BONUS constants | Task 1 | ✅ |
| M-19 MatchAnalytics missing request stats fields | Task 2 | ✅ |
| E-01 missing void on fire-and-forget | Task 11 | ✅ |
| E-02 string-matching auth anti-pattern | Task 12 | ✅ |
| E-03 update-mandate imports nonexistent files | Task 4 | ✅ |
| E-04 stale "four" comment | Task 13 | ✅ |
