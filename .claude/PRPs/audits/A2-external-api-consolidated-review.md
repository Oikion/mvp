# A2 — External API & Webhook Security — Consolidated Review

**Status:** NICE (pushed to staging)
**Date:** 2026-05-15
**Iterations:** 3 + 1 escalation round
**Branch:** staging

---

## Scope

- `lib/external-api-middleware.ts` — Auth wrapper, rate limiting, validateOrgUser
- `app/api/v1/n8n/webhook/route.ts` — n8n webhook receiver
- `app/api/v1/crm/clients/route.ts` — CRM clients external API
- `app/api/v1/crm/contacts/route.ts` — CRM contacts external API
- `app/api/v1/mls/properties/route.ts` — MLS properties external API
- `app/api/v1/webhooks/route.ts` — Webhook endpoint management API

---

## Issues Found & Fixed

### Round 1
- `app/api/v1/n8n/webhook/route.ts` — HMAC timing attack: `timingSafeEqual` was comparing variable-length hex strings. Fixed: double-hash both values to fixed-length SHA256 digests before compare.
- `app/api/v1/n8n/webhook/route.ts` — Full `body`/`data` payloads in `console.log`. Fixed: stripped to event type and non-sensitive fields only.
- `app/api/v1/crm/clients/route.ts` — No Zod validation on POST body. Fixed: added `createClientApiSchema` with `.strict()`.
- `app/api/v1/crm/clients/route.ts` — GET `status` filter passed to Prisma without enum validation. Fixed: `z.nativeEnum(ContactStatus).safeParse()` gate with 400 on failure.
- `app/api/v1/crm/contacts/route.ts` — Same status filter gap. Fixed: same pattern.
- `app/api/v1/mls/properties/route.ts` — GET enum filters unvalidated. Fixed: enum guards for `status`, `type`, `transactionType`.
- `app/api/v1/webhooks/route.ts` — Manual if-checks instead of Zod. Fixed: `createWebhookApiSchema` with `.strict()`.

### Round 2
- All three write routes — `assignedTo`/`assignedAgentId` checked for existence only, not org membership. Fixed: added `validateOrgUser` to `lib/external-api-middleware.ts` using Clerk `users.getOrganizationMembershipList` (user-side query).
- `app/api/v1/crm/contacts/route.ts` GET — `filters.category` passed unvalidated to Prisma. Fixed: `z.nativeEnum(ContactCategory).safeParse()` gate.
- `app/api/v1/crm/clients/route.ts` GET — Same gap plus wrong query shape (`scalar` instead of `{has:}`). Fixed: enum guard + `where.category = { has: typeParsed.data }`.

### Round 3
- `app/api/v1/n8n/webhook/route.ts` — Mutation events could proceed without `organizationId` → `updateMany({ where: { id, organizationId: undefined } })` would scope-escape. Fixed: hard reject all non-health-check events missing `organizationId`.
- `app/api/v1/n8n/webhook/route.ts` — `JSON.parse` returning 500 for malformed input. Fixed: inner try/catch returning 400.
- `app/api/v1/crm/clients/route.ts` — `type: z.string()` cast to `ContactCategory` without enum check. Fixed: `z.nativeEnum(ContactCategory)`.
- `app/api/v1/crm/contacts/route.ts` — `category: z.array(z.string())` cast without enum check. Fixed: `z.array(z.nativeEnum(ContactCategory))`.
- `app/api/v1/mls/properties/route.ts` — `parseInt()` on price filter → silent NaN. Fixed: `Number()` + `isNaN` guard returning 400.
- `app/api/v1/mls/properties/route.ts` — `||` for nullable numeric fields drops `0`. Fixed: `??` throughout POST create block.

### Escalation Round
- `lib/external-api-middleware.ts` — `validateOrgUser` used org-side `getOrganizationMembershipList` (default page 10) → false negatives for large orgs. Fixed: switched to user-side `users.getOrganizationMembershipList({ userId })` — users belong to very few orgs, no pagination issue.
- `app/api/v1/n8n/webhook/route.ts` — No Zod validation on body subfields; `data.blogPostId` etc. cast with `as string`. Fixed: `webhookBodySchema.strict()` with typed `WebhookData` type; all handler `as` casts removed.
- `app/api/v1/n8n/webhook/route.ts` — 503 response leaked env var name. Fixed: generic "Webhook endpoint is not configured".
- All POST routes — `req.json()` without try/catch → 500 for malformed JSON. Fixed: inner try/catch returning 400.
- `app/api/v1/mls/properties/route.ts` — `if (filters.minPrice)` falsy guard. Fixed: explicit `!== undefined` check (semantic correctness; `"0"` is a truthy string so functional impact was zero, but guard is now correct by design).

---

## Known Acknowledged Risks (Not Fixed)

| ID | Description | Tracking |
|----|-------------|----------|
| H-04 | n8n webhook uses a global HMAC secret that doesn't bind to a specific org. Existence check is not authorization — any holder of the secret can target any org's data. Fix requires per-org webhook secrets stored in DB. | pre-launch-audit-2026-04-22 finding H-04 |

---

## Commits
- `fix: address santa-loop A2 review findings (round 1)` — initial Zod, timing, logging
- `fix: address santa-loop A2 review findings (round 2)` — validateOrgUser, enum filters
- `fix: address santa-loop A2 review findings (round 3)` — orgId required, json 400, enum types, ?? coalescing
- `fix: address santa-loop A2 escalated findings` — pagination, Zod body schema, env leak, req.json wrapping
