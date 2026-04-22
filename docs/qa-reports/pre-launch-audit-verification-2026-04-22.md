# Pre-Launch Audit — Verification Report

**Date:** 2026-04-22  
**Branch:** staging  
**Audit report:** `docs/qa-reports/pre-launch-audit-2026-04-22.md`

---

## Verification Summary

All Critical and High findings from the adversarial two-round audit have been patched. Post-fix verification confirms zero TypeScript errors in source, zero lint errors, and a clean test suite (690/690 passing).

---

## Phase 5 Verification Results

### TypeScript (`pnpm tsc --noEmit`)

```
Exit code: 0
Source errors: 0
```

`.next/types/` cache artifacts were present but are not source errors — confirmed by filtering with `grep -v "^\.next/"`.

### Lint (`pnpm lint`)

```
Exit code: 0
Errors: 0
Warnings: 661 (pre-existing — all `no-explicit-any`, none introduced by this audit)
```

### Tests (`pnpm vitest run`)

```
Test Files: 48 passed (48)
Tests:      690 passed (690)
Duration:   ~1.5s
```

Previously failing test `tests/lib/user-departure/departure.test.ts` now passes (3/3).

---

## Critical Findings — Disposition

| ID | Title | Fix |
|----|-------|-----|
| C-01 | `/api/mandates/` routes reference dropped `mandate` model | Deleted 7 files in `app/api/mandates/` |
| C-02 | Agent contact form stores plaintext PII | Added `encryptAgentContactForOrg()` in `app/api/agent/[slug]/contact/route.ts` |
| C-03 | `getFormSubmissions` returns ciphertext to client | Added `decryptAgentContactForOrg()` in `actions/crm/form-submissions.ts` |
| C-04 | `get-mandate-matches.ts` calls dropped `mandate` model | Deleted `actions/matchmaking/get-mandate-matches.ts` |
| C-05 | `/api/user/[userId]/updateprofile/` exposes full Prisma row | Deleted legacy route |
| C-06 | `get-contacts-by-accountId.ts` missing `organizationId` filter | Added `organizationId` to `findMany` where clause |
| C-07 | SWR hooks targeting dead `/api/mandates/*` routes | Deleted 4 stale hooks (`useMandates`, `useMandateComments`, `useMandateLinked`, `useMandatesPaginated`) |

---

## High Findings — Disposition

| ID | Title | Fix |
|----|-------|-----|
| H-01 | TOCTOU on deal mutations | Added `organizationId` to `where` in 3 deal mutations (`app/api/deals/[dealId]/route.ts`) |
| H-02 | TOCTOU on `update-client-visibility` | Added `organizationId` to `contact.update` where clause |
| H-03 | N8n webhook uses `===` for HMAC comparison | Replaced with `crypto.timingSafeEqual` + length pre-check |
| H-04 | N8n webhook org existence not verified | Added `organizationSettings.findUnique` guard → 404 on unknown org |
| H-05 | `/api/digitalocean/list-buckets` unauthenticated | Added `isPlatformAdmin()` guard → 403 |
| H-06 | Referral HMAC uses string `!==` | Replaced with `crypto.timingSafeEqual` |
| H-07 | `departureLog.create` outside transaction | Moved into `$transaction([notifs, invitees, departureLog.create])` |
| H-08 | Initial deal stage hardcoded `"INTEREST"` | Changed to `initialStage` variable |
| H-09 | Stale import schemas referencing dropped models | Deleted 4 files in `lib/import/` |
| H-10 | `prisma/schema.prisma.prisma` stale duplicate | Deleted |

---

## Medium / Low Findings — Disposition

| ID | Title | Fix |
|----|-------|-----|
| M-01 | `get-account`, `get-accounts*`, `get-client-contacts` missing `"use server"` + permission guard | Added `requireAction("contact:read")` + decrypt on all 3 |
| M-02 | `create-from-remote` accepts client-supplied `organizationId` | Removed from Zod schema; derive from env server-side |
| M-03 | `list-file-in-bucket` leaks raw S3 metadata | Filtered response to `{key, size, lastModified}`; added bucket allowlist |
| M-04 | `compute-cross-org-matches.ts` `adaptRequestToV2` missing 4 fields | Added `conditionPreferences`, `energyClassMin`, `gardenRequired`, `insideCityPlanRequired` null fields |
| M-05 | `ts-nocheck` in agent contact route | Removed; fixed underlying type errors |
| L-01 | `get-client-contacts` unbounded query | Added `take: 100` |

---

## Escalated Finding — Pending

| ID | Title | Status |
|----|-------|--------|
| E-01 | N8n HMAC is global, not per-org | SECURITY TODO added in `app/api/v1/n8n/webhook/route.ts`. Requires product decision on per-org secret rotation. Not blocking launch — current implementation is still authenticated. |

---

## Files Deleted (Dead Code / Crash Routes)

```
app/api/mandates/route.ts
app/api/mandates/draft/route.ts
app/api/mandates/[mandateId]/route.ts
app/api/mandates/[mandateId]/comments/route.ts
app/api/mandates/[mandateId]/linked/route.ts
app/api/mandates/link-entities/route.ts
app/api/mandates/import/route.ts
app/api/user/[userId]/updateprofile/route.ts
actions/matchmaking/get-mandate-matches.ts
hooks/swr/useMandates.ts
hooks/swr/useMandateComments.ts
hooks/swr/useMandateLinked.ts
hooks/swr/useMandatesPaginated.ts
lib/import/client-import-config.ts
lib/import/client-import-schema.ts
lib/import/mandate-import-config.ts
lib/import/mandate-import-schema.ts
prisma/schema.prisma.prisma
```

---

## Test Fix (Root Cause Documentation)

`tests/lib/user-departure/departure.test.ts` — The second `mockTransaction.mockResolvedValueOnce` previously returned `[{count:5}, {count:2}]` (2 elements). After moving `departureLog.create` inside the `$transaction` array as the 3rd op, the mock needed a third element. Fixed by adding `{id: "dep-1"}` as the third element, matching the production transaction's op count.

---

*Audit methodology: 4-agent adversarial review (Alpha=Security/Auth, Beta=Stability/Logic, then cross-review round) → orchestrator consolidation → targeted patch agents → Phase 5 verification.*
