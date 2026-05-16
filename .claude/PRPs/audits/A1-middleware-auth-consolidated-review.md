# Domain A1 — Middleware & Auth Flow Audit
**Date:** 2026-05-15  
**Branch:** staging  
**Final commits:** 87a9d02f → c4a93d30  
**Verdict:** NICE (3 rounds, all issues resolved)

---

## Scope

| File | Purpose |
|------|---------|
| `proxy.ts` | Middleware — Clerk auth, staging gate, app-access gate, platform-admin, CSRF, rate limiting, locale routing |
| `lib/permissions/action-guards.ts` | Server action permission guards |
| `lib/permissions/action-service.ts` | Action permission checking logic |
| `app/api/app-access/verify/route.ts` | App-access PIN verify endpoint |
| `app/api/staging-access/verify/route.ts` | Staging passcode verify endpoint |

---

## Issues Found & Fixed

### Round 1 — 8 issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | HIGH | proxy.ts | `/:locale/staging-access(.*)` missing from `isPublicRoute` — Clerk auth attempted on gate page | Added to `isPublicRoute` |
| 2 | HIGH | proxy.ts | `/api/health` and `/api/cron` missing from `isPublicRoute` — blocked by staging gate and auth | Added to `isPublicRoute` |
| 3 | HIGH | proxy.ts | `isStagingAccessApiRoute` only covered the verify API, not health/cron | Replaced with `isStagingExemptApiRoute` covering all three |
| 4 | MED | proxy.ts | `.json` in staging gate static-extension bypass regex — `.json` paths bypassed the gate | Removed `json` from regex |
| 5 | HIGH | proxy.ts | Platform-admin block called `checkPlatformAdmin()` (expensive Clerk API) **before** rate limiting — DoS amplification | Restructured: CSRF → rate limit → Clerk lookup |
| 6 | HIGH | proxy.ts | Platform-admin block returned early (lines 261-347) before the general CSRF block — admin mutations had no CSRF protection | Moved dedicated CSRF check inside the admin block, before rate limit |
| 7 | HIGH | lib/permissions/action-guards.ts | `requireAction()` returned `null` (allowed) when `result.requiresOwnership === true` — MEMBER could update any entity | Returns `FORBIDDEN` when `requiresOwnership` is true, forcing callers to use `requireActionOnEntity()` |
| 8 | MED | proxy.ts | `.json` in middleware matcher extension exclusion — any `.json` URL entirely bypassed middleware | Removed `json` from matcher regex |
| 9 | LOW | app/api/app-access/verify/route.ts | `console.warn` logging env var presence/absence on every disabled-gate request | Replaced with `console.error` on misconfiguration only |
| 10 | HIGH | app/api/app-access/verify/route.ts | When `APP_ACCESS_CODE` set but `APP_ACCESS_COOKIE_SECRET` missing — returns `{success:true}` without setting cookie (infinite lockout) | Returns 503 in partial-config case |
| 11 | HIGH | app/api/staging-access/verify/route.ts | Same partial-config bug — `STAGING_PASSCODE` set but `STAGING_PASSCODE_SECRET` missing | Returns 503 in partial-config case |

### Round 2 — 3 issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 12 | HIGH | proxy.ts | Staging gate blocked `/api/webhooks/*` — external webhooks (Clerk, Stripe, Resend, n8n) received 307 redirects to gate page | Added `/api/webhooks(.*)` to `isStagingExemptApiRoute` |
| 13 | MED | proxy.ts | Staging gate blocked `/api/app-access` — dual-gate scenario (both gates enabled) broke the access flow | Added `/api/app-access(.*)` to `isStagingExemptApiRoute` |
| 14 | HIGH | proxy.ts | Admin CSRF block only validated `Origin` when present — silently passed mutations with no `Origin` header; admin routes are browser-only so absent Origin should be rejected | Added explicit `!origin` check returning 403 for admin mutations |

### Round 3 — 1 issue

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 15 | MED | app/api/app-access/verify/route.ts, app/api/staging-access/verify/route.ts | `code.length === submitted.length && timingSafeEqual(a, b)` — JS `&&` short-circuits, skipping `timingSafeEqual` when lengths differ. Leaks secret length via response timing. | Evaluate `lengthMatch` and `bufferMatch` independently before AND-ing |

---

## Final State

All 12 rubric criteria pass:

| Criterion | Status |
|-----------|--------|
| 1. Public route completeness | ✅ PASS |
| 2. Clerk v6 async (`await auth()`) | ✅ PASS |
| 3. Platform admin guard order | ✅ PASS |
| 4. CSRF coverage | ✅ PASS |
| 5. Staging gate completeness | ✅ PASS |
| 6. Staging gate no static bypass | ✅ PASS |
| 7. organizationId source | ✅ PASS |
| 8. No sensitive console.logs | ✅ PASS |
| 9. No hardcoded secrets | ✅ PASS |
| 10. requireAction ownership check | ✅ PASS |
| 11. Partial config safety (503) | ✅ PASS |
| 12. Timing-safe comparisons | ✅ PASS |

---

## Non-Critical Suggestions (open, not blocking)

- `checkPlatformAdmin()` only checks `emailAddresses[0]` — consider iterating all verified addresses or using `user.primaryEmailAddress`.
- Admin page routes (non-API) do not rate-limit the Clerk lookup — a page hammering attack would amplify API calls. Low risk since page routes are rendered by browsers.
- `canPerformAction()` returns `{ allowed: true, requiresOwnership: true }` when `level === "own"` and no `ownerId` provided. Callers using `canPerformAction()` directly (not via the guard) could misread this as fully allowed. Consider returning `allowed: false` here.
- `requireOrg()` return shape differs from other guards — inconsistent API surface.

---

## Reviewers

| Round | Reviewer A | Reviewer B |
|-------|-----------|-----------|
| 1 | Claude Opus — FAIL (8 issues) | Claude Opus — FAIL (7 issues) |
| 2 | Claude Opus — FAIL (3 issues) | Claude Opus — FAIL (2 issues) |
| 3 | Claude Opus — FAIL (1 issue) | Claude Opus — PASS |
| Post-fix | N/A | N/A |

Note: Model diversity was not achieved (no `codex`/`gemini` CLI available). Both reviewers share the same model family; context isolation was enforced (no shared state between reviewers).