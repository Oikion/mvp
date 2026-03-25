# Security Overview

This section covers Oikion's security posture, policies, and audit history.

## Contents

- [Policies](./policies.md) — Credential rotation schedule, secret management, and verification procedures
- [Audit Log](./audit-log.md) — Past security audits and credential rotation history
- [Threat Model](./threat-model.md) — Attack surfaces, findings, and mitigations

## Core Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication | Clerk (JWT, MFA, SSO) |
| Multi-tenancy | `organizationId` filter on every DB query; PostgreSQL RLS policies |
| Data encryption | Per-org AES-256-GCM DEK for sensitive fields (`lib/model-encryption.ts`) |
| API auth | API keys (`oik_` prefix) + scope enforcement via `withExternalApi()` |
| Rate limiting | Tiered limits in `proxy.ts` (10–120 req/min depending on endpoint) |
| Secret scanning | Gitleaks on every push/PR (`.github/workflows/secret-scan.yml`) |
| Env validation | `lib/env.ts` — validates required vars at production startup |
| Input validation | Zod schemas on all API routes and server actions |

## Automated Checks

- **Secret scanning**: runs on push, PR, and daily at 04:00 UTC
- **Credential rotation reminders**: quarterly GitHub Issues (Jan 1, Apr 1, Jul 1, Oct 1)
- **Environment validation**: `ensureEnvValidated()` called in root layout on startup

## Reporting a Vulnerability

Open a GitHub Issue with the `security` label. For critical issues, contact the platform admin directly.

## Related Files

- `lib/env.ts` — Runtime env validation
- `lib/model-encryption.ts` — Field-level encryption
- `lib/key-management.ts` — DEK management
- `proxy.ts` — Rate limiting and auth middleware
- `.github/workflows/secret-scan.yml` — Gitleaks
- `.github/workflows/credential-rotation-reminder.yml` — Quarterly reminders
