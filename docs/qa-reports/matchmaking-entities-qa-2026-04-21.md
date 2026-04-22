# QA Report: Matchmaking v2 + Entities System
**Date:** 2026-04-21  
**Analyst:** Senior QA Review  
**Scope:** Matchmaking engine (v1→v2 migration), EntityChangeLog system  
**Codebase branch:** staging  

---

> *This report documents observed defects in the Matchmaking v2 and Entities systems as implemented. No fixes are recommended at this stage. Issues are classified as CRITICAL, HIGH, or MEDIUM.*

---

## Part I — Matchmaking System

### CRITICAL Issues

---

#### M-01 — Barrel only exports dead v1 stubs; v2 functions unreachable

**File:** `actions/matchmaking/index.ts`

The barrel re-exports `getClientMatches`, `getPropertyMatches`, `getMatchScore`, and `getMatchAnalytics` — all of which are deprecated v1 stubs that unconditionally return empty data. None of the new v2 functions (`getRequestMatchAnalytics`, `triggerIntraOrgMatches`, `getPersistedMatches`, etc.) appear in this index.

Any consumer that correctly imports from `@/actions/matchmaking` receives only the stubs. The v2 engine is effectively unreachable through the standard module surface.

---

#### M-02 — Dashboard matchmaking summary permanently returns zero data

**File:** `actions/dashboard/get-matchmaking-summary.ts`

This action imports `getMatchAnalytics` from `@/actions/matchmaking` — the barrel described in M-01, which routes to the deprecated v1 stub. The stub unconditionally returns `{ totalClients: 0, totalProperties: 0, matchesAbove50: 0, matchesAbove80: 0, averageScore: 0 }`.

The matchmaking dashboard tile will display zeros in production regardless of how many matches exist in the database.

---

#### M-03 — `update-mandate.ts` queries a model that no longer exists

**File:** `actions/mandates/update-mandate.ts`

This file calls `prismadb.mandate` directly. The `Mandate` Prisma model was removed from the schema in the Task 16 migration (`feat(schema): remove legacy Mandate/MandateComment models`). Every invocation of `updateMandate` will throw a runtime `TypeError: Cannot read properties of undefined` at the Prisma client level.

This is a silent regression: the code compiles cleanly (Prisma client types may still be cached or the TS build has a stale client), but fails at runtime on every call.

---

#### M-04 — `getRequestMatchAnalytics` re-runs the full scoring engine on every call

**File:** `actions/matchmaking/get-request-matches.ts`

Instead of reading from the persisted `PropertyRequestMatch` table, this function calls `calculateBatchMatchesV2` in-band for every analytics request. On an org with 50 active requests and 200 properties, this is 10,000 pairwise score computations per dashboard load.

The `PropertyRequestMatch` table was specifically designed to hold pre-computed scores populated by the cron job. This function bypasses the entire persistence layer.

---

#### M-05 — `topMatches` and `hotProperties` hardcoded to empty arrays

**File:** `actions/matchmaking/get-request-matches.ts`

Both `topMatches` and `hotProperties` fields in the returned `MatchAnalytics` object are set to `[]` unconditionally with inline comments acknowledging the data should be populated. These are prominent fields in the analytics/dashboard UI. They will never contain data regardless of what the scoring engine computes.

---

#### M-06 — Five scorer functions are stubs that return a constant

**File:** `lib/matchmaking/calculator.ts`

Four criteria in Layer 2 always return a constant value regardless of input:

- `scoreConditionV2` — always returns `50`. The `conditionPreference` field it attempts to read does not exist on the `RequestForMatching` type.
- `scoreTimelineV2` — always returns `80`. No comparison logic is implemented; the function body is a TODO.
- `scoreEnergyClassV2` — always returns `50`. The `energyClassMin` field it attempts to read does not exist on `RequestForMatching`.
- `scoreInsideCityPlanV2` — always returns `50`. No logic is implemented.

A fifth scorer, `scoreGardenV2`, reads `request.gardenRequired` which also does not exist on `RequestForMatching`, so the field resolves as `undefined` and the function falls through to a default constant.

These 5 criteria collectively carry weight in `MATCH_WEIGHTS_V2`. Every match score in the system is therefore wrong by a deterministic constant offset.

---

#### M-07 — `scoreBudgetV2` has inverted semantics for investment requests

**File:** `lib/matchmaking/calculator.ts`, `scoreBudgetV2` function

When `property.price < request.budgetMin`, the function returns `80` (a high score). For standard purchase/rental requests this is a disqualification scenario; the property is below minimum budget, not a good match. The spec's investment-request handling (where under-budget indicates positive discount opportunity) requires an explicit `purpose === 'INVESTMENT'` guard that is absent here. All request types receive the same treatment.

---

#### M-08 — `scoreBudgetV2` soft zone uses flat 60 instead of linear taper

**File:** `lib/matchmaking/calculator.ts`, `scoreBudgetV2` function

The spec describes a linear taper for the soft over-budget zone (properties priced 0–15% above `budgetMax` should score between 100 and some minimum proportionally). The implementation returns a flat `60` for any property in the soft zone, regardless of how close it is to `budgetMax`. A property at 1% over budget and one at 14% over budget receive the same score.

---

### HIGH Issues

---

#### M-09 — Missing Layer 1 disqualifier: `PROPERTY_TYPE_MISMATCH`

**File:** `lib/matchmaking/disqualifiers.ts`

The spec (section 5.1) lists five required Layer 1 hard disqualifiers. Only four are implemented: `ARCHIVED_OR_INACTIVE`, `PURPOSE_MISMATCH`, `BUDGET_HARD_FLOOR`, `AREA_HARD_EXCLUSION`. The fifth — `PROPERTY_TYPE_MISMATCH` — is absent. Properties of the wrong type are not eliminated before scoring; they proceed through Layer 2 with non-zero scores.

---

#### M-10 — Disqualifiers function accepts v1 type, called with v2 type

**File:** `lib/matchmaking/disqualifiers.ts`

The `checkDisqualifiers` function signature accepts `PropertyForMatching` (the v1 type). It is called from the v2 scoring engine with `PropertyForMatchingV2`. TypeScript does not flag this if structural compatibility is satisfied, but any field that exists on v2 but not v1 is invisible to the disqualifier logic. This is a type-safety bypass that becomes a logic error when v2 adds distinguishing fields.

---

#### M-11 — `garden` and `parking` hardcoded to `null` in all compute paths

**Files:**
- `actions/matchmaking/compute-intra-org-matches.ts`
- `actions/network/compute-cross-org-matches.ts`
- `actions/matchmaking/get-request-matches.ts`

All three match computation paths map the property to its scoring struct with `garden: null` and `parking: null` explicitly. These map to the `scoreGardenV2` and `scoreParkingV2` scorers in Layer 2, which receive null and return a default constant. Any preferences a request has for garden or parking are not evaluated.

---

#### M-12 — `preferredAmenities` hardcoded to empty array in cross-org path

**File:** `actions/network/compute-cross-org-matches.ts`

The cross-org property adapter sets `preferredAmenities: []` on all request structs. The `scoreAmenitiesV2` function receives an empty array and returns a constant default. Amenity preferences from requests are silently dropped when computing cross-org matches.

---

#### M-13 — Intra-org compute job does not clean up stale low-score rows

**File:** `actions/matchmaking/compute-intra-org-matches.ts`

The job upserts new match rows and updates existing ones but does not delete rows for request-property pairs that now score below threshold. A comment in the code acknowledges this and defers to "a future cleanup cron." No such cron exists in the codebase.

Over time, the `PropertyRequestMatch` table will accumulate stale rows for archived requests, removed properties, and score-decremented pairs. Any pagination or ranking query over this table will surface stale results.

---

#### M-14 — `scoreBedroomsV2` returns hardcoded constants regardless of weight

**File:** `lib/matchmaking/calculator.ts`, `scoreBedroomsV2` function

The function returns either `40` (partial mismatch) or `80` (match) with no graduation between them. The actual weight value from `MATCH_WEIGHTS_V2` for the BEDROOMS criterion is not consulted within the scorer — the caller multiplies by the weight afterward, so this is expected — but both fixed values are arbitrary round numbers with no documented basis. The spec describes graduated scoring within this criterion that is not present.

---

#### M-15 — `run-now` route rate-limits per request but triggers org-wide recompute

**File:** `app/api/matchmaking/run-now/route.ts`

The rate-limit check reads `request.lastMatchRunAt` on a single `PropertyRequest` record to gate the operation. But the operation it guards — `runIntraOrgMatches(organizationId)` — recomputes matches for all active requests in the org. The rate limit is checking the state of one resource while executing an action scoped to hundreds of resources. A user can bypass the intended org-level rate limit by passing any recently-reset `requestId`.

---

#### M-16 — Weight calibration schema exists with no populating mechanism

**Files:** Prisma schema (`OrgMatchWeights`, `WeightCalibrationReport` models); `app/api/cron/` directory

The schema contains `OrgMatchWeights` with per-criterion weight fields and `WeightCalibrationReport` with performance metrics. No cron route (`app/api/cron/weight-calibration/`) exists to populate these tables. The calibration reports and per-org weights will always be empty. Any UI or logic that reads `OrgMatchWeights` will silently fall back to system defaults.

---

### MEDIUM Issues

---

#### M-17 — Four deprecated v1 files remain after spec explicitly listed them for deletion

**Files:**
- `actions/matchmaking/get-client-matches.ts`
- `actions/matchmaking/get-property-matches.ts`
- `actions/matchmaking/get-match-score.ts`
- `actions/matchmaking/get-match-analytics.ts`

Spec section 6.3 lists these files for deletion as part of the v1→v2 migration. All four remain. Their presence means the barrel continues to export them (M-01), and they create a misleading surface for future developers.

---

#### M-18 — `MATCH_WEIGHTS_V2` base sum is 104, not 100

**File:** `lib/matchmaking/weights.ts`

The weights sum to 104 with a comment noting this is intentional (scores are clamped to 100 at output). This means the documented percentages (e.g., BUDGET listed as 20%) do not reflect actual proportional contribution (~19.2%). A developer reading the weights file in isolation will compute incorrect contribution percentages when reasoning about score behavior.

---

#### M-19 — `MatchAnalytics` interface carries v1-era fields into v2 context

**File:** `lib/matchmaking/types.ts`

The `MatchAnalytics` interface retains `unmatchedClients` and `totalClients` fields that are semantically v1 (client-based). The v2 system tracks requests, not clients. The deprecated `getMatchAnalytics` stub populates these with zeros; the new `getRequestMatchAnalytics` function returns `totalClients: 0` unconditionally. These fields either contain stale semantics or are permanently zero.

---

## Part II — Entities / EntityChangeLog System

### CRITICAL Issues

---

#### E-01 — Floating Promise on `createChangeLogEntry` in contacts route

**File:** `app/api/crm/contacts/route.ts`, line ~198

`createChangeLogEntry({...})` is called without `await` and without `void`. This is a floating Promise. In Next.js serverless/edge execution, a floating Promise may be garbage-collected before it resolves — the changelog entry for contact mutations may silently not be written. The `lib/entity-change-log.ts` module's own documentation specifies that callers must `void` fire-and-forget calls explicitly or `await` them.

---

### HIGH Issues

---

#### E-02 — Auth dispatch in entity routes uses string-matching on error messages

**Files:**
- `app/api/entities/search/route.ts`
- `app/api/entities/top/route.ts`

Both routes dispatch auth errors by checking `error.message.includes("not authenticated")`. This is brittle: if `getCurrentUser` ever changes its error message text (a refactor, a Clerk SDK upgrade), auth failures will fall through to the generic `catch` block and return a 500 instead of a 401. The pattern couples these route handlers to the internal string behavior of a dependency.

---

#### E-03 — `update-mandate.ts` bypasses project action response contract

**File:** `actions/mandates/update-mandate.ts`

The function uses `throw new Error("Unauthorized")` for auth failures rather than the project-standard `requireAction` guard + `actionError` return pattern defined in `actions/CLAUDE.md`. The `throw` causes the caller to receive an uncaught exception rather than a typed `ActionErrorResponse`. This also means the calling UI layer (which likely uses the `ActionResponse<T>` pattern to check `.success`) will silently receive an error it cannot inspect through the standard interface.

This issue compounds M-03: the function is broken at the Prisma level first, so this secondary defect may never be reached.

---

### MEDIUM Issues

---

#### E-04 — `ChangeLogInput.eventType` comment documents 4 values, union has 5

**File:** `lib/entity-change-log.ts`, line ~91

The inline comment reads "these four values" but the TypeScript union type includes five members: `CREATED`, `UPDATED`, `LINKED`, `UNLINKED`, and `STAGE_CHANGED`. This is a documentation inaccuracy introduced when `STAGE_CHANGED` was added. Not a runtime defect, but will mislead developers consulting the comment to understand the type's intended domain.

---

## Summary

| ID | Severity | System | Short Description |
|----|----------|--------|-------------------|
| M-01 | CRITICAL | Matchmaking | Barrel exports only dead v1 stubs |
| M-02 | CRITICAL | Matchmaking | Dashboard summary permanently zero via deprecated barrel |
| M-03 | CRITICAL | Matchmaking | `update-mandate.ts` queries removed Prisma model |
| M-04 | CRITICAL | Matchmaking | Analytics re-runs full engine instead of reading persistence layer |
| M-05 | CRITICAL | Matchmaking | `topMatches` / `hotProperties` hardcoded empty |
| M-06 | CRITICAL | Matchmaking | 5 Layer 2 scorer functions are constants, not logic |
| M-07 | CRITICAL | Matchmaking | `scoreBudgetV2` inverted semantics for under-budget case |
| M-08 | CRITICAL | Matchmaking | `scoreBudgetV2` flat soft-zone score instead of linear taper |
| M-09 | HIGH | Matchmaking | Missing `PROPERTY_TYPE_MISMATCH` Layer 1 disqualifier |
| M-10 | HIGH | Matchmaking | Disqualifiers accept v1 type, called with v2 type |
| M-11 | HIGH | Matchmaking | `garden` and `parking` hardcoded null in all compute paths |
| M-12 | HIGH | Matchmaking | `preferredAmenities` hardcoded empty in cross-org path |
| M-13 | HIGH | Matchmaking | Stale match rows never cleaned up |
| M-14 | HIGH | Matchmaking | `scoreBedroomsV2` returns arbitrary hardcoded constants |
| M-15 | HIGH | Matchmaking | run-now rate limit checks single request, triggers org-wide job |
| M-16 | HIGH | Matchmaking | Weight calibration schema exists, populating cron absent |
| M-17 | MEDIUM | Matchmaking | 4 v1 deprecated files not deleted per spec §6.3 |
| M-18 | MEDIUM | Matchmaking | Weight sum 104 makes documented percentages inaccurate |
| M-19 | MEDIUM | Matchmaking | `MatchAnalytics` type retains v1-era client fields |
| E-01 | CRITICAL | Entities | Floating Promise on `createChangeLogEntry` in contacts route |
| E-02 | HIGH | Entities | Auth dispatch uses error message string matching |
| E-03 | HIGH | Entities | `update-mandate.ts` throws instead of using `actionError` |
| E-04 | MEDIUM | Entities | `eventType` comment documents 4 values, union has 5 |

**Total: 23 issues — 8 CRITICAL, 9 HIGH, 6 MEDIUM**

---

*The Matchmaking v2 engine is not functional in production. The scoring engine contains multiple constant-returning stubs, the analytics layer bypasses persistence, and the primary consumer (dashboard) is wired to a permanently empty v1 stub. The Entities system is broadly functional but contains a silent data loss risk (floating Promise) and fragile auth handling that will silently degrade under dependency changes.*
