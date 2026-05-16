# D2 — Database Query Security Audit
**Date:** 2026-05-15  
**Branch:** staging  
**Method:** ecc:santa-loop — dual Opus reviewers, 3-round convergence  
**Final Verdict:** ✅ NICE (both reviewers PASS, Round 3)  
**Pushed:** Yes

---

## Scope

All internal API routes under `app/api/` (not `app/api/v1/`, which was covered in A2):
- `app/api/crm/clients/` (all route files)
- `app/api/mls/properties/[propertyId]/name/`
- `app/api/deals/`

## Rubric Applied

| # | Criterion |
|---|-----------|
| 1 | Every tenant-scoped query filters by `organizationId` |
| 2 | No `$executeRawUnsafe` / `$queryRawUnsafe` |
| 3 | `findFirst`/`findUnique` on tenant resources include `organizationId` in `where` |
| 4 | Prisma errors never leak raw error messages to client responses |
| 5 | No `console.log` with sensitive data (userId, orgId, email, token, stack traces) |
| 6 | Delete/update operations verify resource belongs to org before proceeding |
| 7 | No raw SQL string interpolation via `$queryRaw` or `$executeRaw` with user values |
| 8 | No `@ts-nocheck` directives (hide type errors that may mask security bugs) |
| 9 | Query params mapping to DB enum columns validated with Zod before query |

---

## Round 1 — NAUGHTY

### Issues Found (both reviewers)

| Issue | File | Severity |
|-------|------|----------|
| `@ts-nocheck` + uses removed `prismadb.clients` model | `clients/route.ts` | Critical |
| `@ts-nocheck` + `prismadb.property` (wrong model name) + `title` (wrong field) | `properties/[propertyId]/name/route.ts` | Critical |
| `@ts-nocheck` on name route | `clients/[clientId]/name/route.ts` | High |
| Raw `error.message` leaked in 3 catch blocks | `clients/route.ts` | High |
| `update({ where: { id } })` without `organizationId` (TOCTOU) | `clients/route.ts` | High |
| Zero-reference file using deleted legacy models | `clients/[clientId]/linked/route.ts` | High |
| `stage`/`dealType` query params unvalidated enum injection | `deals/route.ts` | High |

### Fixes Applied (Round 1 commit: `6d4a7031`)

- **Deleted** `app/api/crm/clients/[clientId]/linked/route.ts` — zero frontend references, all three legacy models (`prismadb.clients`, `prismadb.client_Properties`, `prismadb.mandate_Clients`) were removed in Entity Architecture v2
- **Rewrote** `app/api/crm/clients/route.ts` — full migration from `prismadb.clients` → `prismadb.contact`; legacy enum mappings (ClientType→ContactCategory, ClientStatus→ContactStatus, LeadSource→ContactSource); encryption pattern matching `contacts/route.ts`; `update({ where: { id, organizationId } })`; `dispatchClientWebhook` → `dispatchContactWebhook`; generic catch blocks
- **Removed `@ts-nocheck`** from `clients/[clientId]/name/route.ts`
- **Fixed** `properties/[propertyId]/name/route.ts` — removed `@ts-nocheck`, `prismadb.property` → `prismadb.properties`, `title` → `property_name`
- **Fixed** `deals/route.ts` GET — wire up existing `dealQuerySchema.safeParse(Object.fromEntries(searchParams))` (schema was imported but unused); replaced manual `parseInt` with schema-validated `limit`

---

## Round 2 — NAUGHTY

### Issues Found (both reviewers)

| Issue | File | Severity |
|-------|------|----------|
| `?status` param injected into Prisma `where` without Zod enum validation (schema disclosure on invalid values) | `clients/route.ts` GET | High |
| `notaryContactId` from request body written to `Deal` without verifying it belongs to org (IDOR cross-tenant reference) | `deals/route.ts` POST | High |

### Notes on Reviewer A extras (not actioned)
- `apiInternalError("...", error)` — verified safe: helper logs error server-side, returns only the generic `message` string to client. PASS.
- `users.findFirst({ where: { clerkUserId } })` without `organizationId` — Users model has no `organizationId` by design (Clerk manages org membership). PASS.

### Fixes Applied (Round 2 commit: `3c10824f`)

- **`clients/route.ts` GET** — `z.nativeEnum(ContactStatus).safeParse(status)`, returns 400 on invalid instead of passing raw string to Prisma
- **`deals/route.ts` POST** — added `contact.findFirst({ where: { id: notaryContactId, organizationId } })` guard, returns 400 if not found; `listingAgentId`/`buyerAgentId` remain unguarded (reference `Users` model which has no `organizationId` — org membership enforced by Clerk at session level)

---

## Round 3 — NICE

Both reviewers returned **PASS** on all 9 criteria.

### Reviewer A (Claude Opus) — PASS
All 9 criteria PASS. Suggestions (non-blocking): verify `listingAgentId`/`buyerAgentId` Clerk membership at request time; cursor param validation; DealStageLog within transaction.

### Reviewer B (Claude Opus) — PASS  
All 9 criteria PASS. Suggestions (non-blocking): error correlation IDs; `listingAgentId`/`buyerAgentId` Clerk membership; confirm `.strict()` on schemas.

### Agreement
- **Both flagged (Round 2):** `?status` unvalidated enum + `notaryContactId` cross-tenant risk — both fixed
- **Reviewer A only:** `apiInternalError` error passing — verified safe (helper strips error from response)
- **Reviewer B only:** `listingAgentId`/`buyerAgentId` (suggestion, not blocking)

---

## Remaining Non-Blocking Suggestions

These were raised by reviewers but do not block production. Logged for future hardening:

1. **`listingAgentId`/`buyerAgentId` Clerk membership verification** — validate these user IDs are members of the current Clerk org at request time. Currently relies on Clerk session enforcement.
2. **`cursor` param format validation** — validate UUID/cuid format before passing to Prisma pagination to prevent malformed-input 500s.
3. **`DealStageLog` within transaction** — wrap `deal.create` + `dealStageLog.create` in a `$transaction` to prevent orphaned deals on partial failure.
4. **In-memory post-decrypt search performance** — `minimal=true` returns up to 1000 decrypted records; consider a lower hard cap and/or server-side full-text search on non-encrypted fields.

---

## Files Changed This Audit

| File | Action |
|------|--------|
| `app/api/crm/clients/route.ts` | Fully rewritten |
| `app/api/crm/clients/[clientId]/linked/route.ts` | Deleted |
| `app/api/crm/clients/[clientId]/name/route.ts` | Removed @ts-nocheck |
| `app/api/mls/properties/[propertyId]/name/route.ts` | Removed @ts-nocheck, fixed model + field names |
| `app/api/deals/route.ts` | Enum validation + notaryContactId guard |

---

## Key Architectural Learnings

### Entity Architecture v2 Migration Debt
`clients/route.ts` was left behind when `prismadb.clients` → `prismadb.contact` was renamed. `@ts-nocheck` was added to suppress errors instead of migrating the route. Three routes were affected; one (`linked/`) had zero frontend references and was deleted.

### Prisma Union Type Constraint
Prisma generates mutually-exclusive union types for relation vs. scalar FK update inputs (`ContactCreateInput` vs `ContactUncheckedCreateInput`). The pattern that avoids TypeScript errors: pass only encryptable string fields to `encryptContactForOrg`, destructure the result, spread `...encryptedRest`, then list all non-encrypted fields explicitly. Matches the working `contacts/route.ts` pattern.

### Enum-Era Mismatch
The legacy `clients/` route uses `ClientType`, `ClientStatus`, `LeadSource` (pre-v2 enums) while the `Contact` model uses `ContactCategory`, `ContactStatus`, `ContactSource`. Explicit mapping tables with `Record<LegacyEnum, NewEnum>` are the correct fix — never `as ContactCategory` casts which would hide mapping gaps at compile time.