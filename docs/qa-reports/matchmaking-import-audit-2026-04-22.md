# Matchmaking Engine & Import System — Adversarial QA Audit
**Date:** 2026-04-22  
**Auditors:** Alpha (Matchmaking domain), Beta (Import domain)  
**Method:** Phase 1 independent parallel audits → Phase 2 adversarial cross-review (each agent reviewed the other's findings attributed to "GPT Codex" to eliminate deference bias) → Phase 3 consolidation  
**Branch:** staging  
**Scope:** `actions/matchmaking/`, `lib/matchmaking/`, `app/api/matchmaking/`, `app/api/cron/`, `lib/import/`, `app/api/import/`, `tests/matchmaking/`, `tests/import/`

---

## Executive Summary (Non-Technical)

A four-round adversarial audit of the two most complex subsystems in the Oikion platform found **2 Critical**, **7 High**, **6 Medium**, and **3 Low** confirmed issues. Three potential findings were investigated and ruled out as false positives.

The most urgent findings fall into three categories:

1. **Data integrity gap** — property amenity fields (`garden`, `parking`) are always reported as "unknown" in matchmaking regardless of actual data, potentially causing undermatching for requests that require gardens or parking.

2. **Security gaps** — two import API endpoints lack role permission guards, allowing a VIEWER-role user to execute bulk data imports (creating Contact, Property, and Request records). The cross-org cron job has a timing-oracle vulnerability that leaks CRON_SECRET length. Personal identifiers (phone numbers, tax IDs) may be echoed back in validation error responses.

3. **Staleness accumulation** — sold/off-market properties accumulate in the match table indefinitely and surface in UI lists; the rate gate protecting the "Run Matching Now" endpoint fails silently for new organizations.

All Critical and High issues have targeted fixes. No architectural changes are required.

---

## False Positives Confirmed (Do Not Fix)

| ID | Claim | Verdict |
|----|-------|---------|
| FP-01 | `lib/import/contact-import-config.ts` — addresses JSON stored unencrypted | FALSE POSITIVE — `e()` retrieves already-encrypted `iv:auth:ct` ciphertext from the encrypted object |
| FP-02 | `actions/matchmaking/get-request-matches.ts` — 4 fields missing from request Prisma select | FALSE POSITIVE — `requiresGarden`, `insideCityPlan`, `conditionPreference`, `energyClassMin` ARE selected (lines 115–118) and mapped (lines 299–304); added in the recent amenity inference commit |
| FP-03 | `budgetMax` Prisma `Decimal` type causes silent comparison failure in disqualifier | FALSE POSITIVE — adapters convert `Decimal` to `number` before the property object reaches the disqualifier layer |

---

## Confirmed Findings

### CRITICAL

---

#### C-01 — Bare TypeScript cast bypasses all row validation in unified import route
**File:** [app/api/import/unified/route.ts:27](app/api/import/unified/route.ts#L27)  
**Severity:** Critical  
**Fix Complexity:** S  

**Description:**  
The unified import route accepts a POST body with `rows` and immediately casts it to `ValidatedRow[]` via a bare TypeScript assertion. There is zero runtime validation — any JSON array, including malformed or attacker-crafted payloads, is passed directly to `executeBatchImport()`, which writes to the database.

```typescript
// Current — no runtime check
const validatedRows = rows as ValidatedRow[];
```

The comment above it correctly states we should not re-run `validateImportData()` (which expects flat raw rows, not partitioned `ValidatedRow` objects), but the solution is NOT a bare cast — it's a lightweight Zod check on the envelope structure.

**Fix:** Add a Zod schema that validates the shape of each `ValidatedRow` object (presence of `rowIndex: number`, optional sub-objects of the right kind) before passing to `executeBatchImport`.

---

#### C-02 — No row count guard in unified import route allows unbounded transactions
**File:** [app/api/import/unified/route.ts:16](app/api/import/unified/route.ts#L16)  
**Severity:** Critical  
**Fix Complexity:** S  

**Description:**  
`app/api/import/validate/route.ts` enforces `MAX_ROWS = 5000` (line 6, line 25). The unified execution route at `/api/import/unified` has no equivalent guard. An attacker (or a client bug) can skip the validate step and POST directly to `/api/import/unified` with an arbitrarily large rows array, triggering a single unbounded Prisma `$transaction` over thousands of rows.

**Fix:** Add the same `MAX_ROWS = 5000` guard after the `Array.isArray(rows)` check, matching the validate route's pattern.

---

### HIGH

---

#### H-01 — `garden` and `parking` hardcoded null in property adapter (matchmaking dead zone)
**File:** [actions/matchmaking/get-request-matches.ts:216-217](actions/matchmaking/get-request-matches.ts#L216-L217)  
**Severity:** High  
**Fix Complexity:** S  

**Description:**  
`adaptPropertyToV2()` sets `garden: null` and `parking: null` unconditionally, regardless of what the property's `amenities` JSON actually contains. A private copy of `inferBooleanAmenity()` exists in the same file (lines 45–74) but is never called from the adapter. When a request specifies `gardenRequired: true` or `parkingRequired: true`, the scoring engine always sees unknown/null — it cannot penalize or reward based on real data.

```typescript
// Current — always null
garden: null,
parking: null,
```

**Fix:** Call the local `inferBooleanAmenity` with the property's `amenities` field using the canonical key lists (`["garden", "private_garden"]`, `["parking", "private_parking", "garage"]`).

---

#### H-02 — Stale `PropertyRequestMatch` rows for SOLD/OFF_MARKET properties never deleted
**File:** [actions/matchmaking/compute-intra-org-matches.ts](actions/matchmaking/compute-intra-org-matches.ts)  
**Severity:** High  
**Fix Complexity:** M  

**Description:**  
`fetchActiveProperties()` correctly filters to `property_status: { in: ["ACTIVE", "PENDING"] }`. However, the cleanup pass at the end of the batch only deletes `PropertyRequestMatch` rows whose score falls below `DEFAULT_MIN_MATCH_SCORE` for the **current run's property–request pairs**. When a property transitions to SOLD or OFF_MARKET, it is no longer included in the current run — so its stale match rows are never cleaned up. Over time, the `PropertyRequestMatch` table accumulates rows for inactive listings that continue to appear in UI match lists.

**Fix:** After computing the current run's property set, issue a batch delete for any `PropertyRequestMatch` row belonging to this org whose `propertyId` is NOT in the active property set.

---

#### H-03 — Timing oracle in cross-org cron: length check leaks CRON_SECRET length
**File:** [app/api/cron/cross-org-matches/route.ts:9](app/api/cron/cross-org-matches/route.ts#L9)  
**Severity:** High (escalated from Medium — the intra-org route was already patched; this route was missed)  
**Fix Complexity:** S  

**Description:**  
`verifyAuthToken()` performs an early-exit length comparison before calling `timingSafeEqual`:

```typescript
if (expectedBuffer.length !== providedBuffer.length) return false;
return timingSafeEqual(expectedBuffer, providedBuffer);
```

When the attacker sends tokens of varying lengths and measures response time, the early exit for length mismatch is measurably faster than the `timingSafeEqual` path — leaking the expected buffer length and thus the length of `CRON_SECRET`. The intra-org cron route was already patched with an HMAC-SHA256 approach (both sides hashed to fixed 32-byte digests before comparison); this route was missed.

**Fix:** Replace with the same HMAC-SHA256 pattern used by the intra-org route: hash both `provided` and `expected` to fixed-length digests before calling `timingSafeEqual`.

---

#### H-04 — Stale mandate entity keys in fuzzy-matcher ENTITY_IDENTIFIER_MAP
**File:** [lib/import/fuzzy-matcher.ts:49-53](lib/import/fuzzy-matcher.ts#L49-L53)  
**Severity:** High  
**Fix Complexity:** S  

**Description:**  
`ENTITY_IDENTIFIER_MAP` contains three entries pointing to the entity type `"mandate"`, which no longer exists after the Mandate→Request rename (Phase 2 of entity architecture migration):

```typescript
Εντολής: "mandate",   // line 49
Εντολή:  "mandate",   // line 50
Mandate: "mandate",   // line 53
```

When a user imports a file with headers like "Εντολή Τιμή" (request price), composite matching resolves to entity `"mandate"`, which matches no field definitions. The composite scorer returns null, and the column falls through to unassigned.

**Fix:** Replace `"mandate"` with `"request"` for all three entries. Optionally add `"Request": "request"` for English headers.

---

#### H-05 — Missing `requireAction("import:create")` guard on unified import route
**File:** [app/api/import/unified/route.ts:8](app/api/import/unified/route.ts#L8)  
**Severity:** High  
**Fix Complexity:** S  

**Description:**  
`app/api/import/validate/route.ts` correctly calls `requireAction("import:create")` (line 10) before any processing. The unified execution route only calls `getCurrentUser()` and `getCurrentOrgId()` — these confirm authentication but not authorization. A VIEWER-role user (who cannot create contacts, properties, or requests) can bypass the validate step and POST directly to `/api/import/unified`, creating all three entity types in bulk.

**Fix:** Add `requireAction("import:create")` check at the top of the POST handler, before `getCurrentUser()`, following the pattern from the validate route.

---

#### H-06 — Import history POST lacks role guard and accepts unvalidated `importType`
**File:** [app/api/import/history/route.ts:77](app/api/import/history/route.ts#L77)  
**Severity:** High  
**Fix Complexity:** S  

**Description:**  
The POST handler records a new import batch. It has no `requireAction()` guard (any authenticated user can call it). The `importType` field is extracted from the request body and passed directly to `recordImport()` with only a presence check — it is cast to `ImportEntityType` in the GET handler at line 46 but the POST handler passes the raw string. An attacker with a valid session can forge import history records with arbitrary `importType` values.

**Fix:** Add `requireAction("import:create")` guard. Add a Zod schema validating `importType` against the `ImportEntityType` enum, `sourceFilename` as non-empty string, and `rowCount` as non-negative integer.

---

#### H-07 — Validation error response exposes PII via `rawValue` field
**File:** [app/api/import/validate/route.ts:35](app/api/import/validate/route.ts#L35)  
**Severity:** High (GDPR concern — personal identifiers echoed in response)  
**Fix Complexity:** S  

**Description:**  
`validateImportData(rows)` returns structured error objects that may include a `rawValue` field containing the user's submitted data. For rows with `primary_phone`, `primary_email`, or `afm` (Greek tax ID / AFM number) values, a validation failure echoes these identifiers back in the JSON error response. AFM is a nationally unique personal identifier; exposing it in API responses creates a GDPR data exposure risk.

**Fix:** After calling `validateImportData(rows)`, strip `rawValue` from all error objects in the result before returning. Alternatively, modify `validation-engine.ts` to accept a `stripRawValues: boolean` option.

---

### MEDIUM

---

#### M-01 — Golden Visa tier lookup fails for unaccented Greek input (diacritic normalization bug)
**File:** [lib/matchmaking/constants/golden-visa.ts:42](lib/matchmaking/constants/golden-visa.ts#L42)  
**Severity:** Medium  
**Fix Complexity:** S  

**Description:**  
`getGoldenVisaThreshold()` normalizes input with `.trim().toLowerCase()` only. The `GOLDEN_VISA_HIGH_TIER_REGIONS` set contains accented Greek forms (`"αθήνα"`, `"θεσσαλονίκη"`, etc.). User input from address fields is frequently stored without diacritics (e.g., `"Αθηνα"` → `"αθηνα"` after `.toLowerCase()`). The lookup fails to match — the function returns €400k instead of the correct €800k Tier A threshold for prime Athens properties, silently underscoring Golden Visa eligible matches.

**Fix:** Add `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` to the `normalize` function, AND strip diacritics from all Greek values in the `GOLDEN_VISA_HIGH_TIER_REGIONS` set literal.

---

#### M-02 — Persisted match list surfaces SOLD/OFF_MARKET properties (no status filter)
**File:** [actions/matchmaking/get-persisted-matches.ts:69](actions/matchmaking/get-persisted-matches.ts#L69)  
**Severity:** Medium  
**Fix Complexity:** S  

**Description:**  
`getPersistedMatches()` queries `PropertyRequestMatch` but the nested property select (lines 69–87) does not include `property_status`. There is no filter on `property.property_status` — stale rows for SOLD or OFF_MARKET properties surface in the UI match list indefinitely, even after H-02 is fixed and stale rows are cleaned from new batches. Historic rows created before the H-02 fix will remain.

**Fix:** Add `property_status: true` to the property select, and add a Prisma `where` relation filter (or post-query filter) to exclude rows where `property.property_status` is not `ACTIVE` or `PENDING`.

---

#### M-03 — Run-Now rate gate fails silently for orgs with no existing match rows
**File:** [app/api/matchmaking/run-now/route.ts:33](app/api/matchmaking/run-now/route.ts#L33)  
**Severity:** Medium  
**Fix Complexity:** M  

**Description:**  
The org-level rate gate uses `prismadb.propertyRequestMatch.findFirst({ where: { organizationId } })` to get the last run timestamp. For a new org (or an org whose match table has been cleared), no rows exist — `lastOrgRun` is null — and the guard condition `if (lastOrgRun?.updatedAt)` evaluates to false. The rate gate never engages, allowing unlimited concurrent invocations of the full-org recompute job.

The comment in the code acknowledges this: *"Best-effort: if runIntraOrgMatches produces zero upserts, the gate won't advance"* — but it does not address the new-org case.

**Fix:** Store the last-run timestamp in a dedicated column (e.g., `OrganizationSettings.lastMatchRunAt`) or a separate lightweight table, rather than inferring it from match row timestamps. Alternatively, create a sentinel row (or use a Redis/KV TTL key) to track the org's last run time independently of match existence.

---

#### M-04 — Import preflight record created with contradictory `COMPLETED` status
**File:** [lib/import/history.ts](lib/import/history.ts)  
**Severity:** Medium  
**Fix Complexity:** S  

**Description:**  
`createImportPreflight()` creates the history record with `status: "COMPLETED"` and `importPhase: "IMPORTING"` simultaneously. If `runUnifiedImport()` crashes after the preflight record is created, the record is stuck in a contradictory `IMPORTING/COMPLETED` state with no cleanup path. The UI shows it as completed when the import actually failed.

**Fix:** Set `status: "PROCESSING"` (or `"PENDING"`) on creation; update to `"COMPLETED"` or `"FAILED"` in a `finally` block after the import attempt.

---

#### M-05 — Deal count in impact route missing `organizationId` filter
**File:** [app/api/import/history/[id]/impact/route.ts:137](app/api/import/history/[id]/impact/route.ts#L137)  
**Severity:** Medium (cross-tenant data count leak)  
**Fix Complexity:** S  

**Description:**  
The impact route counts cascade-affected entities before a rollback. Every other count in this route includes `organizationId: orgId` in the `where` clause. The `deal` count at line 137–146 is missing this filter — it counts deals across all organizations that reference the targeted contacts or properties. This inflates the impact count for shared contacts/properties and could leak information about deal existence in other orgs.

```typescript
// Current — no organizationId filter
prismadb.deal.count({
  where: {
    OR: [
      { dealParties: { some: { contactId: { in: contactIds } } } },
      { propertyId: { in: propertyIds } },
    ],
  },
})
```

**Fix:** Add `organizationId: orgId` to the deal count `where` clause.

---

#### M-06 — Stale `mandate_Properties` mock in batch engine test (vacuous pass)
**File:** [tests/import/batch-engine.test.ts](tests/import/batch-engine.test.ts)  
**Severity:** Medium (test confidence)  
**Fix Complexity:** S  

**Description:**  
The mock in `batch-engine.test.ts` includes `mandate_Properties: { createMany: mockCreateMany }` — a reference to the `Mandate` model's relation, which was deleted in the Phase 2 entity architecture migration. The mock also does not include `propertyRequestMatch` which the current engine creates. Tests that exercise the full batch pipeline pass vacuously because the mock resolves successfully but the actual write shape is never validated.

**Fix:** Remove `mandate_Properties` from the mock; add `propertyRequestMatch: { createMany: mockCreateMany }` (or whatever the current engine writes).

---

### LOW

---

#### L-01 — Dead private copy of `inferBooleanAmenity` in `get-request-matches.ts`
**File:** [actions/matchmaking/get-request-matches.ts:45](actions/matchmaking/get-request-matches.ts#L45)  
**Severity:** Low  

The function is defined but never called from `adaptPropertyToV2` (which hardcodes null — see H-01). After H-01 is fixed, the private copy should be replaced by importing the shared utility.

---

#### L-02 — Dead private copy of `inferBooleanAmenity` in `compute-intra-org-matches.ts`
**File:** [actions/matchmaking/compute-intra-org-matches.ts:30](actions/matchmaking/compute-intra-org-matches.ts#L30)  
**Severity:** Low  

Same function duplicated. Should be extracted to `lib/matchmaking/amenity-utils.ts` (or equivalent) and imported by both callers. Divergence between copies is a future maintenance risk.

---

#### L-03 — `@ts-nocheck` on `preference-extractor.ts` disables type safety for full module
**File:** [lib/matchmaking/preference-extractor.ts:1](lib/matchmaking/preference-extractor.ts#L1)  
**Severity:** Low (not in hot scoring path)  

`// @ts-nocheck` suppresses all TypeScript errors for the module. Not an immediate runtime risk but masks any type errors introduced when adding scoring logic. Remove and fix errors before adding new code here.

---

#### L-04 — Misleading comment in `deleteImportBatch()` about junction cleanup
**File:** [lib/import/history.ts](lib/import/history.ts)  
**Severity:** Low  

A comment states "junctions were removed" implying manual cascade handling. In practice `ContactProperty` and `RequestContact` both have `onDelete: Cascade` FK constraints so Prisma handles deletion automatically. The comment creates false confidence about what is and isn't cleaned up.

---

## Summary Table

| ID | Severity | Domain | File | Fix Size |
|----|----------|--------|------|----------|
| C-01 | Critical | Import | `app/api/import/unified/route.ts:27` | S |
| C-02 | Critical | Import | `app/api/import/unified/route.ts:16` | S |
| H-01 | High | Matchmaking | `actions/matchmaking/get-request-matches.ts:216` | S |
| H-02 | High | Matchmaking | `actions/matchmaking/compute-intra-org-matches.ts` | M |
| H-03 | High | Matchmaking | `app/api/cron/cross-org-matches/route.ts:9` | S |
| H-04 | High | Import | `lib/import/fuzzy-matcher.ts:49-53` | S |
| H-05 | High | Import | `app/api/import/unified/route.ts:8` | S |
| H-06 | High | Import | `app/api/import/history/route.ts:77` | S |
| H-07 | High | Import | `app/api/import/validate/route.ts:35` | S |
| M-01 | Medium | Matchmaking | `lib/matchmaking/constants/golden-visa.ts:42` | S |
| M-02 | Medium | Matchmaking | `actions/matchmaking/get-persisted-matches.ts:69` | S |
| M-03 | Medium | Matchmaking | `app/api/matchmaking/run-now/route.ts:33` | M |
| M-04 | Medium | Import | `lib/import/history.ts` | S |
| M-05 | Medium | Import | `app/api/import/history/[id]/impact/route.ts:137` | S |
| M-06 | Medium | Import | `tests/import/batch-engine.test.ts` | S |
| L-01 | Low | Matchmaking | `actions/matchmaking/get-request-matches.ts:45` | S |
| L-02 | Low | Matchmaking | `actions/matchmaking/compute-intra-org-matches.ts:30` | S |
| L-03 | Low | Matchmaking | `lib/matchmaking/preference-extractor.ts:1` | S |
| L-04 | Low | Import | `lib/import/history.ts` | S |

**Totals:** 2 Critical · 7 High · 6 Medium · 4 Low  
**False Positives Ruled Out:** 3  
**Fix Complexity (S = ~1 file, <20 lines; M = 2–3 files or structural change):** 17× S, 2× M

---

## Fix Sequence (Phase 4)

Recommended order — each fix is independent:

1. H-05 + H-06 + C-01 + C-02 — import route permission and validation hardening (same file group)
2. H-03 + H-07 + M-05 — remaining security fixes
3. H-01 + L-01 + L-02 — amenity inference (extract shared utility, fix adapter)
4. H-04 + M-06 — stale mandate references
5. H-02 + M-02 — stale match row cleanup
6. M-01 — golden-visa diacritic normalization
7. M-03 + M-04 — operational reliability fixes
