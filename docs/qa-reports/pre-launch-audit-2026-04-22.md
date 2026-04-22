# Pre-Launch Security & Quality Audit — 2026-04-22

**Methodology:** Two-round adversarial review (Alpha = Security/Auth, Beta = Stability/Business Logic). Each agent independently audited the full codebase, then reviewed the other's report framed as anonymous "GPT Codex output" to eliminate deference bias. Four reports consolidated here.

**Auditors:** Alpha P1, Beta P1, Alpha P2 (reviewed Beta P1), Beta P2 (reviewed Alpha P1)

---

## Executive Summary (Non-Technical)

- **5 production crash risks** are present: entire `/api/mandates/` directory and two action files call a database model (`Mandate`) that no longer exists in the schema. Any HTTP request to these endpoints causes an unhandled runtime error.
- **3 unauthenticated data exposure risks**: a public endpoint stores visitor contact form submissions without encryption, and three CRM action files return encrypted field values as raw ciphertext strings to the UI.
- **4 tenant isolation gaps**: routes accept `organizationId` from client-controlled input (request body), bypassing the server-side org boundary. One action file has zero tenant filter at all.
- **3 TOCTOU (time-of-check/time-of-use) vulnerabilities**: ownership is verified before a mutation, but the mutation itself omits the `organizationId` constraint — a concurrent actor could race the check.
- **2 storage access control gaps**: any authenticated user can enumerate all cloud storage buckets and enumerate the contents of any bucket by name.
- **1 schema migration required** (requires human approval): `AgentContactSubmission` table is missing an `organizationId` column.
- **Dead code cleanup**: 9 files targeting dropped models or superseded import paths should be deleted to prevent future regressions.

**Ship-blockers (must fix before public launch):** C-01 through C-07 (Critical), H-01 through H-10 (High). All have patches in Phase 4.

---

## Finding List

Sorted: Critical → High → Medium → Low. `S` = 1–2 hours, `M` = half day, `L` = full day, `XL` = requires human/migration.

---

### CRITICAL

#### C-01 — `/api/mandates/` directory: entire route tree calls dropped model
- **File:** `app/api/mandates/route.ts`, `app/api/mandates/draft/route.ts`, `app/api/mandates/[mandateId]/route.ts`, `app/api/mandates/[mandateId]/comments/route.ts`, `app/api/mandates/[mandateId]/linked/route.ts`, `app/api/mandates/link-entities/route.ts`, `app/api/mandates/import/route.ts`
- **Risk:** Every HTTP request to these routes triggers a Prisma runtime crash (`prismadb.mandate` — model does not exist). Active production traffic: `components/entity-selector/MandateSelector.tsx` (UnifiedEntitySelector line 203) calls `/api/mandates?minimal=true` on every entity-selector render.
- **Fix:** Delete the entire `app/api/mandates/` directory. Update `UnifiedEntitySelector` to call `/api/requests` instead.
- **Complexity:** M

#### C-02 — `app/api/agent/[slug]/contact/route.ts`: public endpoint writes PII unencrypted + `@ts-nocheck`
- **File:** `app/api/agent/[slug]/contact/route.ts:1` (`// @ts-nocheck`), lines 69-78 (form data stored without `encryptAgentContactForOrg`)
- **Risk:** Visitor contact form submissions (name, email, phone, message) stored as plaintext. TypeScript disabled on a public unauthenticated POST endpoint — any type-safety bugs are invisible. Hard-coded fake UUID `"00000000-0000-0000-0000-000000000000"` used as `organizationId` in downstream notification call.
- **Fix:** Remove `@ts-nocheck`; resolve resulting type errors. Call `encryptAgentContactForOrg(data, organizationId)` before `prismadb.agentContactSubmission.create`. Fix the notification org ID.
- **Complexity:** M (paired with C-03 and ESCALATE-01)

#### C-03 — `actions/crm/form-submissions.ts`: all reads return raw ciphertext
- **File:** `actions/crm/form-submissions.ts:58-73, 98-118, 186-199, 237-244`
- **Risk:** Once C-02 is fixed, all read paths will return `iv:auth:ct` ciphertext strings to the UI. Even before C-02 is fixed, any previously encrypted submissions (if any exist) display as garbage strings.
- **Fix:** Call `decryptAgentContactForOrg(submission, organizationId)` in all four read functions before returning data. Must be deployed simultaneously with C-02.
- **Complexity:** S (paired with C-02)

#### C-04 — `app/api/crm/contacts/create-from-remote/route.ts`: org injection via request body
- **File:** `app/api/crm/contacts/create-from-remote/route.ts:47`
- **Risk:** Zod schema accepts `organizationId` from client body. Authentication uses a single shared `OIKION_TOKEN` (not per-org). Any token holder can inject contacts into any arbitrary organization. Also: no rate limiting (falls through to default 60 req/min).
- **Fix:** Remove `organizationId` from Zod schema. Derive org from a server-side lookup keyed to the authenticated token (env mapping or DB row). Add explicit rate limiting.
- **Complexity:** M

#### C-05 — `actions/crm/get-contacts-by-accountId.ts`: no "use server", no tenant filter
- **File:** `actions/crm/get-contacts-by-accountId.ts:1-27`
- **Risk:** Missing `"use server"` directive (can be imported and called from client context). `prismadb.contact.findMany({ where: { id: accountId } })` — zero `organizationId` filter. Any contact ID returns data across all tenants.
- **Fix:** Add `"use server"`. Add `requireAction("contact:read")`. Add `organizationId` to where clause.
- **Complexity:** S

#### C-06 — `actions/matchmaking/get-mandate-matches.ts`: calls dropped Mandate model
- **File:** `actions/matchmaking/get-mandate-matches.ts` (line 1 + throughout)
- **Risk:** `fetchActiveMandates()` calls `prismadb.mandate.findMany()` — runtime crash on any matchmaking job that uses this action. `decryptMandateForOrg()` uses wrong field names for the current Request model.
- **Fix:** Delete this file (superseded by `get-request-matches.ts`). Verify no remaining callers.
- **Complexity:** S

#### C-07 — `get-account.ts`, `get-accounts-by-contactId.ts`, `get-client-contacts.ts`: decrypt gap
- **Files:**
  - `actions/crm/get-account.ts` (returns `...data` spread without `decryptContactForOrg`)
  - `actions/crm/get-accounts-by-contactId.ts` (returns `...contact` spread without decrypt)
  - `actions/crm/get-client-contacts.ts` (returns `...p` spread without decrypt; also no `take` limit)
- **Risk:** All three return encrypted PII fields (`client_name`, `primary_email`, `primary_phone`, etc.) as raw `iv:auth:ct` ciphertext strings to callers and ultimately to the UI.
- **Fix:** Call `decryptContactForOrg(data, organizationId)` before returning in each function. Add `take: 100` limit to `get-client-contacts.ts`.
- **Complexity:** S

---

### HIGH

#### H-01 — `app/api/deals/[dealId]/route.ts`: TOCTOU on stage advance, PUT, DELETE
- **File:** `app/api/deals/[dealId]/route.ts:140-160, 192, 224`
- **Risk:** Ownership check `findFirst({ where: { id, organizationId } })` is correct, but the subsequent `deal.update({ where: { id } })` omits `organizationId`. Concurrent cross-tenant request can race between check and write.
- **Fix:** Change all three `deal.update` where clauses to `where: { id: dealId, organizationId }`.
- **Complexity:** S

#### H-02 — `actions/crm/update-client-visibility.ts`: TOCTOU + no logging + weak auth
- **File:** `actions/crm/update-client-visibility.ts:21, 27-29`
- **Risk:** `contact.update({ where: { id: clientId } })` omits `organizationId` — TOCTOU. Catch block `{ return { success: false, error: "..." } }` swallows errors with no logging. Uses raw `auth()` instead of `requireAction()` — no role check.
- **Fix:** Add `organizationId` to update where clause. Add `console.error("[UPDATE_CLIENT_VISIBILITY]", error)`. Replace `auth()` with `requireAction("contact:update")`.
- **Complexity:** S

#### H-03 — `lib/user-departure/index.ts`: departure audit log outside transaction
- **File:** `lib/user-departure/index.ts:118, 126-130`
- **Risk:** `prismadb.departureLog.create(...)` is called outside the cleanup transaction at step 7. If it fails post-departure, the user is departed with no audit trail. Also: fallback object at lines 126-130 uses stale `mandates: []` key (should be `requests: []`).
- **Fix:** Move `departureLog.create` inside the batch transaction at ~line 101. Rename `mandates` key to `requests` in fallback object.
- **Complexity:** S

#### H-04 — `app/api/v1/n8n/webhook/route.ts`: org injection + timing oracle
- **File:** `app/api/v1/n8n/webhook/route.ts:14, 85-90`
- **Risk:** `organizationId` taken from request body; global HMAC secret doesn't bind to a specific org (any valid HMAC payload can inject data into any org). HMAC comparison uses `===` (string equality) instead of `timingSafeEqual` — timing oracle for brute-force attacks.
- **Fix:** Per-org webhook secrets stored in DB, looked up by org. Replace `===` with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.
- **Complexity:** M

#### H-05 — `app/api/digitalocean/list-file-in-bucket/[bucketId]/route.ts`: bucket enumeration
- **File:** `app/api/digitalocean/list-file-in-bucket/[bucketId]/route.ts:1-29, 25`
- **Risk:** `bucketId` from URL path passed directly to `ListObjectsCommand({ Bucket: bucketId })` — any authenticated user can enumerate any S3/DO bucket by name. Raw S3 response (with `$metadata`, `RequestCharged`) leaked to caller. Catch block returns 401 for ALL errors (including S3 NoSuchBucket → should be 404).
- **Fix:** Validate `bucketId` against an org-scoped allowlist. Filter response to `{ key, size, lastModified }` only. Fix error status codes.
- **Complexity:** M

#### H-06 — `app/api/user/[userId]/updateprofile/route.ts`: raw Prisma object leaked
- **File:** `app/api/user/[userId]/updateprofile/route.ts:37`
- **Risk:** Returns full raw Prisma `users` object including `clerkUserId`, `is_admin`, `account_name`. Legacy route superseded by `update-profile/route.ts`.
- **Fix:** Delete this file entirely. Verify no remaining callers (expected: none).
- **Complexity:** S

#### H-07 — `app/api/digitalocean/list-buckets/route.ts`: no org scope or role check
- **File:** `app/api/digitalocean/list-buckets/route.ts:1-14`
- **Risk:** Only requires `getCurrentUser()`. Any authenticated user (including VIEWER role) can enumerate all cloud storage buckets across the account.
- **Fix:** Add `isPlatformAdmin()` guard before the S3 call. Return 403 for non-admins.
- **Complexity:** S

#### H-08 — `hooks/swr/useMandates.ts`, `useMandateComments.ts`, `useMandateLinked.ts`, `useMandatesPaginated.ts`: dead endpoints
- **Files:** `hooks/swr/useMandates.ts`, `hooks/swr/useMandateComments.ts`, `hooks/swr/useMandateLinked.ts`, `hooks/swr/useMandatesPaginated.ts`
- **Risk:** Target `/api/mandates/*` crash routes. Confirmed dead (not imported by main app). Risk: any future developer importing these hooks will hit the crash routes.
- **Fix:** Delete all four files.
- **Complexity:** S

#### H-09 — `lib/import/client-import-config.ts`, `client-import-schema.ts`, `mandate-import-config.ts`, `mandate-import-schema.ts`: stale import configs
- **Files:** `lib/import/client-import-config.ts`, `lib/import/client-import-schema.ts`, `lib/import/mandate-import-config.ts`, `lib/import/mandate-import-schema.ts`
- **Risk:** V1 field names and dropped Mandate model references. Confirmed dead (not imported anywhere in main codebase). Superseded by `contact-import-config.ts` and `request-import-config.ts`. Risk: accidental re-import triggers runtime error.
- **Fix:** Delete all four files.
- **Complexity:** S

#### H-10 — `prisma/schema.prisma.prisma`: schema divergence risk
- **File:** `prisma/schema.prisma.prisma` (untracked)
- **Risk:** Duplicate schema file contains the old `Mandate` model (line 1774) and `MandateComment` (line 1839). If accidentally used in any tooling command, regenerates old Prisma client with dropped models. Pure git noise.
- **Fix:** Delete this file.
- **Complexity:** S

---

### MEDIUM

#### M-01 — `actions/crm/get-contacts-by-accountId.ts`, `get-account.ts`, `get-accounts-by-contactId.ts`: missing `"use server"` directive
- **Files:** `actions/crm/get-contacts-by-accountId.ts:1`, `actions/crm/get-account.ts:1`, `actions/crm/get-accounts-by-contactId.ts:1`
- **Risk:** Without `"use server"`, these can be imported and executed in client bundles. Server secrets and DB access would be exposed.
- **Fix:** Add `"use server"` at the top of each file. Add `requireAction("contact:read")`.
- **Complexity:** S (partially overlaps with C-05, C-07 fixes)

#### M-02 — `actions/crm/get-shared-clients.ts:43`: `as any` on cross-org data access
- **File:** `actions/crm/get-shared-clients.ts:43`
- **Risk:** `prismadb.sharedEntity.findMany` result cast with `as any` — TypeScript safety bypassed for cross-org data access path. Mistyped fields will silently return `undefined` in production.
- **Fix:** Type the result properly using generated Prisma types.
- **Complexity:** S

#### M-03 — i18n namespace mismatch: `i18n.ts` vs `app/[locale]/layout.tsx`
- **Files:** `i18n.ts`, `app/[locale]/layout.tsx`
- **Risk:** `layout.tsx` references `conversion`, `onboarding`, `cookies` namespaces not registered in `i18n.ts`. `i18n.ts` has `legal` not in `layout.tsx`. Five unregistered locale JSON files: `ai.json`, `wizard.json`, `trust-score.json`, `achievements.json`, `assignments.json`. Results in silent missing-translation fallbacks or runtime errors.
- **Fix:** Reconcile both files. Register or remove the five JSON files.
- **Complexity:** S

#### M-04 — `actions/matchmaking/compute-intra-org-matches.ts`: no self-match guard
- **File:** `actions/matchmaking/compute-intra-org-matches.ts:~85`
- **Risk:** No guard for pairs where `request.assignedAgentId === property.assigned_to`. An agent's own request can match their own listing, creating noise in match results. Also: `inferBooleanAmenity` helper is duplicated in `get-request-matches.ts`.
- **Fix:** Add `if (request.assignedAgentId === property.assigned_to) continue;` guard. Extract shared helper to `lib/matchmaking/amenity-utils.ts`.
- **Complexity:** S

#### M-05 — `app/api/org/members/[userId]/access/route.ts`: GET requires no elevated role
- **File:** `app/api/org/members/[userId]/access/route.ts`
- **Risk:** Any VIEWER can query any member's access level within the org. Access level data (role, permissions) is sensitive for privilege-escalation reconnaissance.
- **Fix:** Add `ADMIN` or `ORG_OWNER` role requirement to GET handler.
- **Complexity:** S

#### M-06 — `app/api/v1/crm/clients/route.ts:110-155`: POST lacks Zod strict + enum validation
- **File:** `app/api/v1/crm/clients/route.ts:110-155`
- **Risk:** POST handler manually destructures body without `.strict()`. No enum validation — invalid enum strings cause Prisma to throw with internal error details exposed to external API callers.
- **Fix:** Add Zod schema with `.strict()` and explicit enum validation for `client_type`, `visibility`, etc.
- **Complexity:** S

#### M-07 — `actions/referrals/apply-to-referral-programme.ts:122`: timing oracle on token verify
- **File:** `actions/referrals/apply-to-referral-programme.ts:122`
- **Risk:** `verifyActionToken` uses `!==` string comparison (not `timingSafeEqual`) for HMAC signature check.
- **Fix:** Replace `!==` with `!crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.
- **Complexity:** S

#### M-08 — Silent catch blocks: missing error logging throughout
- **Files:** `app/api/cron/reminders/route.ts:162-168`, `app/api/v1/webhooks/route.ts`, multiple others
- **Risk:** Errors swallowed silently make production diagnosis impossible. Catch blocks returning `{ success: false }` without `console.error` hide root causes.
- **Fix:** Add `console.error("[CONTEXT_TAG]", error)` to all bare catch blocks. Do not expose error details in response bodies.
- **Complexity:** S

---

### LOW

#### L-01 — `actions/deals/index.ts:133-140`: DealStageLog hardcodes `fromStage: "INTEREST"`
- **File:** `actions/deals/index.ts:133-140`
- **Risk:** When a deal is created with a non-INTEREST initial stage, the first stage log entry records wrong `fromStage`. Audit trail is incorrect from creation.
- **Fix:** Pass `initialStage` value as `fromStage` instead of hardcoded `"INTEREST"`.
- **Complexity:** S

#### L-02 — `lib/rate-limit.ts`: rate limit identifier uses spoofable `x-forwarded-for`
- **File:** `lib/rate-limit.ts`
- **Risk:** `x-forwarded-for` header is client-controlled off-Vercel. Rate limit can be bypassed by rotating spoofed IPs. Safe only when deployed behind Vercel edge (which sets the real IP).
- **Fix:** Document the Vercel-only assumption with a comment. No code change needed if Vercel deployment is guaranteed.
- **Complexity:** S

---

### ESCALATE (Requires Human Approval — Schema Migration)

#### ESCALATE-01 — `AgentContactSubmission` missing `organizationId` column
- **File:** `prisma/schema.prisma` (`AgentContactSubmission` model)
- **Risk:** Public contact form submissions cannot be scoped to an organization. The hard-coded fake UUID in C-02 is a workaround for this gap. Fix for C-02 requires adding `organizationId String` to this model.
- **Action:** Create and review migration: `ALTER TABLE "AgentContactSubmission" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT ''`. Backfill existing rows. Then run `pnpm prisma migrate dev --name add_org_id_to_agent_contact_submission`.
- **Complexity:** XL

---

## Fix Summary by Complexity

| Complexity | Count | Finding IDs |
|---|---|---|
| XL (migration) | 1 | ESCALATE-01 |
| M (half day) | 4 | C-01, C-04, H-04, H-05 |
| S (hours) | 22 | C-02, C-03, C-05, C-06, C-07, H-01, H-02, H-03, H-06, H-07, H-08, H-09, H-10, M-01 through M-08, L-01, L-02 |

**Estimated total (Critical + High, excluding XL migration): ~2 person-days**

---

*Generated by: 2-round adversarial audit (Alpha P1 + Beta P1, Alpha P2 cross-review, Beta P2 cross-review)*
*Consolidation: Orchestrator 2026-04-22*
