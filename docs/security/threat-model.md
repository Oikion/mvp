# Threat Model

## Overview

Oikion is a multi-tenant SaaS for Greek real estate agencies. The primary threats are cross-tenant data access, privilege escalation, and denial-of-service attacks against shared infrastructure.

## Attack Surfaces

### 1. Messaging API

**Threats:**
- Cross-tenant message creation: attacker uses a valid auth token to POST messages to a channel from another org
- Cross-tenant message reading: GET requests without org-scoped filtering leak messages across tenants
- Notification DoS: sending messages to large channels triggers unbounded email sends

**Mitigations (implemented 2026-02-07):**
- All channel/conversation lookups include `organizationId` in WHERE clause
- Membership verification required before read or write
- Notification batched via `Promise.allSettled()`, capped at 100 recipients
- `burst` rate limit tier: 30 req/10s on messaging endpoints
- Content limited to 10 KB; attachments capped at 10; mentions capped at 50

**Residual risk:** Low. Tenant isolation enforced at query level.

### 2. External API (`/api/v1/*`)

**Threats:**
- API key theft enables full org data access within the key's scopes
- Scope escalation: client-supplied IDs could reference other orgs' resources
- Rate limit bypass via distributed key usage

**Mitigations:**
- All external API routes wrapped in `withExternalApi()` which validates the API key and extracts `organizationId` from the key record (not from the request)
- Linked entity IDs (`clientIds`, `propertyIds`) verified to belong to the caller's org before use
- Rate limit: 100 req/min per API key enforced in `proxy.ts`
- Keys prefixed `oik_` and stored hashed; plaintext shown only at creation

**Residual risk:** Medium. Key exfiltration via developer machines or CI secrets remains a risk; mitigated by quarterly rotation policy.

### 3. Multi-Tenancy

**Threats:**
- Missing `organizationId` filter on a DB query exposes all tenants' data
- IDOR via guessable friendly IDs (e.g., `CLI-0001`)
- Admin endpoint accessed by non-admin user

**Mitigations:**
- Org ID is always sourced from Clerk auth context (`auth().orgId`), never from client input
- External API org ID sourced from the API key record, not the request body
- Friendly IDs are sequential but queries always also filter by `organizationId`
- Platform admin routes check `isPlatformAdmin` in Clerk privateMetadata
- PostgreSQL RLS policies as second layer of defense on critical tables

**Residual risk:** Medium. Legacy code paths predate security hardening; full audit required (see [audit-log.md](./audit-log.md)).

### 4. Authentication and Session

**Threats:**
- Stolen Clerk session tokens
- Organization membership manipulation
- Webhook replay attacks

**Mitigations:**
- Clerk handles session management (short-lived JWTs, rotation on logout)
- Organization membership changes invalidate active sessions via Clerk webhooks
- Outgoing webhooks signed with HMAC-SHA256; timestamp checked to prevent replay

### 5. Data Encryption

**Threats:**
- Database breach exposes PII (client names, emails, phones, tax IDs)
- Insider access to database bypasses application-level controls

**Mitigations:**
- Per-org Data Encryption Keys (DEK) stored separately; encrypted with platform master key
- `lib/model-encryption.ts` is the single source of truth for encrypted fields
- Encrypted fields: client PII fields, property `primary_email` and `communication_notes`, mandate `title` and `notes`
- Format: `iv:auth:ct` (AES-256-GCM, colon-separated hex)

**Residual risk:** Low for covered fields. Fields not in `ENCRYPTED_*_FIELDS` constants are stored in plaintext.

### 6. File Uploads

**Threats:**
- SVG upload containing embedded JavaScript (XSS)
- Oversized uploads causing storage/memory DoS
- Path traversal in file names

**Mitigations:**
- File type validation on upload; SVGs sanitized or rejected
- File size limits enforced before processing
- Files stored in S3/Vercel Blob with random keys; original filenames not used as storage paths

**Residual risk:** Medium. SVG handling identified as HIGH in 2026-03-13 audit; verify current implementation.

## GDPR Considerations

- Clients must have `gdpr_consent: true` to receive marketing communications
- GDPR deletion pathway: user departure triggers `handleUserDeparture()` which nullifies references (data stays with org)
- No automated data subject deletion for CRM client records — manual process required
- Cookie consent banner not yet implemented (MEDIUM finding, 2026-03-13 audit)

## Security Contacts

For suspected vulnerabilities, open a GitHub Issue with the `security` label or contact the platform admin directly.
