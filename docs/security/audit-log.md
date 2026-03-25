# Security Audit Log

## Audit History

### 2026-03-13: Comprehensive Security Audit

**Auditor:** Claude Opus 4.6 (6-agent parallel automated audit)
**Scope:** Full-stack — auth, RBAC, multi-tenancy, APIs, XSS/CSRF/CSP, GDPR, dependencies

#### Finding Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| CRITICAL | 5 | Multi-tenancy bypass in legacy CRM routes, plaintext banking/tax data |
| HIGH | 22 | `is_admin` cross-org escalation, XSS via unsanitized HTML, rate limit bypass, missing input validation, SVG upload XSS, no GDPR deletion, no key rotation |
| MEDIUM | 24 | CSRF gaps, CSP `unsafe-inline`, error info disclosure, no cookie consent, IP logging, file upload validation |
| LOW | 16 | Info disclosure, consent cookie, logging |
| INFO | 22 | Positive findings confirming good practices |
| Snyk | 43 | Dependency vulnerabilities (19 HIGH, 15 MEDIUM across 169 paths) |

#### Core Architecture Assessment

Sound: Clerk auth, Prisma ORM parameterized queries, per-org AES-256-GCM encryption, well-designed permissions system. Issues concentrated in legacy code paths predating security hardening.

---

### 2026-02-07: Messaging API Security Audit

**Auditor:** Claude
**Scope:** `app/api/messaging/messages/route.ts`
**Status:** All CRITICAL and HIGH vulnerabilities fixed

#### Findings and Fixes

| Vulnerability | Severity | CWE | Status |
|--------------|----------|-----|--------|
| Cross-tenant message creation (POST without `channelId` org check) | CRITICAL | CWE-639 | Fixed |
| Cross-tenant message reading (GET without org filter) | CRITICAL | CWE-639 | Fixed |
| Notification spam / DoS (unbounded member fetch + sequential send) | HIGH | CWE-400 | Fixed |
| Cross-tenant message edit/delete (`findUnique` without org filter) | HIGH | CWE-639 | Fixed |
| Missing input validation (content length, attachment count, mention count) | MEDIUM | — | Fixed |
| Silent Ably failures | LOW | — | Fixed |

**Fixes applied:**
- `organizationId` added to all WHERE clauses for channel/conversation lookups
- Membership/participation verified before all read/write operations
- Notification batched with `Promise.allSettled()`, capped at 100 members
- Rate limiting added: messaging endpoints moved to `burst` tier (30 req/10s)
- Content max 10 KB, attachments max 10, mentions max 50

---

## Credential Rotation Log

| Date | Credential | Rotated By | Reason | Notes |
|------|-----------|------------|--------|-------|
| 2026-02-02 | All credentials | Platform Admin | Initial deployment | First-time setup |

### Next Scheduled Rotations

| Date | Credentials |
|------|------------|
| 2026-04-01 (Q2) | `DATABASE_URL`, `RESEND_API_KEY`, `ABLY_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |
| 2026-07-01 (Q3) | All of Q2 + `CLERK_SECRET_KEY` |
| 2026-10-01 (Q4) | `DATABASE_URL`, `RESEND_API_KEY`, `ABLY_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |

### Adding a Rotation Entry

After rotating credentials, add a row to the table above:
- Date in `YYYY-MM-DD` format
- Credential name (e.g., `DATABASE_URL`)
- Your name or team
- Reason: `Scheduled` for regular rotations, `Emergency` for compromises
- Relevant notes

Commit this file after each rotation.
