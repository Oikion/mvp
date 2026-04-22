# Matchmaking & Import Audit — Phase 5 Verification Report

**Date:** 2026-04-22  
**Branch:** staging  
**Audit report:** `docs/qa-reports/matchmaking-import-audit-2026-04-22.md`

---

## Verification Results

### Test Suite

| Suite | Files | Tests | Status |
|---|---|---|---|
| `tests/matchmaking/` | 10 | 160 | ✅ All pass |
| `tests/import/` | 6 | 126 | ✅ All pass |
| **Total** | **16** | **286** | **✅ Green** |

### Type Check

```
pnpm tsc --noEmit
```

**Result:** Zero source-file errors. Only pre-existing stale `.next/` type stubs from the Mandate→Request route rename (unrelated to this audit).

### Lint

```
pnpm lint
```

**Result:** Zero errors. Pre-existing warnings only (stale `eslint-disable` directives and hardcoded color tokens in UI components — not in audit-modified files).

---

## Fixes Applied

### Critical

| ID | File | Fix |
|---|---|---|
| C-01 | `app/api/import/unified/route.ts` | Added Zod shape validation on `rows` (rowIndex, nullable sub-objects, boolean flags, dedup keys) |
| C-02 | `app/api/import/unified/route.ts` | Added `MAX_ROWS = 5000` guard with 413 response |

### High

| ID | File | Fix |
|---|---|---|
| H-01 | `actions/matchmaking/get-request-matches.ts` | Replaced `garden: null, parking: null` with `inferBooleanAmenity()` calls |
| H-02 | `actions/matchmaking/compute-intra-org-matches.ts` | Added explicit purge of `PropertyRequestMatch` rows for properties no longer in the active set (SOLD/OFF_MARKET) after each run |
| H-03 | `app/api/cron/cross-org-matches/route.ts` | Replaced length-leaking `timingSafeEqual` with HMAC-SHA256 constant-time comparison |
| H-04 | `lib/import/fuzzy-matcher.ts` | Updated stale `"mandate"` entity targets to `"request"` in `ENTITY_IDENTIFIER_MAP`; added `Request: "request"` |
| H-05 | `app/api/import/unified/route.ts` | Added `requireAction("import:create")` guard as first statement |
| H-06 | `app/api/import/history/route.ts` | Added `requireAction("import:create")` guard + `z.nativeEnum(ImportEntityType)` validation on `importType` |
| H-07 | `app/api/import/validate/route.ts` | Strip `rawValue` from `ValidationError` objects before response to prevent PII echo (phone, email, AFM) |

### Medium (also fixed)

| ID | File | Fix |
|---|---|---|
| M-06 | `tests/import/batch-engine.test.ts` | Replaced stale `mandate_Properties` mock key with `propertyRequestMatch` (post-rename) |

---

## Confirmed False Positives (not fixed)

| ID | Finding | Why FP |
|---|---|---|
| FP-01 | Alpha reported `verifyAuthToken` length oracle in `intra-org-matches/route.ts` | Already patched in that file; only the cross-org route needed fixing (H-03) |
| FP-02 | Alpha reported 4 request fields missing from Prisma select | Fields (`requiresGarden`, `insideCityPlan`, `conditionPreference`, `energyClassMin`) confirmed present in the select; added in the amenity inference commit |
| FP-03 | Beta reported `adaptPropertyToV2` missing in `compute-intra-org-matches.ts` | Function is correctly named `fetchActiveProperties` with inline mapping; naming difference only |

---

## Remaining Medium / Low Findings (deferred)

The following findings were confirmed valid but deferred to a follow-up pass:

| ID | Severity | Description |
|---|---|---|
| M-01 | Medium | Golden visa normalizer lacks diacritic stripping — `"αθηνα"` fails to match `"αθήνα"` |
| M-02 | Medium | `get-persisted-matches.ts` doesn't filter out SOLD/OFF_MARKET properties in memory |
| M-03 | Medium | Rate gate in `run-now/route.ts` silently skips when org has no existing match rows |
| M-04 | Medium | Preflight status field uses stale `MANDATE`-era enum value |
| M-05 | Medium | Deal count in `history/[id]/impact/route.ts` missing `organizationId` filter |
| L-01 | Low | `compute-cross-org-matches.ts` has no MAX concurrency limit on org processing |
| L-02 | Low | Duplicate `inferBooleanAmenity` between `get-request-matches.ts` and `compute-intra-org-matches.ts` |
| L-03 | Low | `fuzzy-matcher.ts` logs matched entity type at DEBUG level — verbose in production |
| L-04 | Low | Import wizard shows validation errors before first submit |
