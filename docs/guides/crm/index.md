# CRM Guide

Client and mandate management for Greek real estate agencies.

> Content to be developed. This stub covers key code paths and conventions.

## Overview

The CRM module manages:
- **Clients** — contacts (buyers, sellers, renters, investors, referral partners)
- **Mandates** — listings entrusted to the agency by a client (buy/sell/rent)
- **Matching** — linking mandates to suitable properties (see [matchmaking](../matchmaking/index.md))

## Key Code Paths

| Area | Path |
|------|------|
| Server actions | `actions/crm/` |
| API routes (internal) | `app/api/crm/` |
| Page routes | `app/[locale]/app/(routes)/crm/` |
| Validation schemas | `lib/validations/crm.ts` |
| SWR hooks | `hooks/swr/` (`useClients`, `useMandates`, etc.) |

## Client Model

Clients are tenant-scoped (`organizationId`). Key fields:
- `client_type`: `BUYER | SELLER | RENTER | INVESTOR | REFERRAL_PARTNER`
- `visibility`: `HIDDEN | PRIVATE | SECURE | PUBLIC` (default `PRIVATE`)
- Encrypted fields: `primary_email`, `primary_phone`, `full_name`, and others — see `lib/model-encryption.ts`

## Mandate Model

Mandates link a client to a property intent (buy/sell/rent). Key relations:
- `clientId` — the client who gave the mandate
- `propertyId` — linked property (optional at creation)
- `status`: `ACTIVE | COMPLETED | CANCELLED | EXPIRED`

## Creating Records

Use server actions for all mutations:

```typescript
import { createClient } from '@/actions/crm/create-client'
import { createMandate } from '@/actions/crm/create-mandate'

// Always pass organizationId implicitly via getCurrentOrgId() inside the action
const result = await createClient(validatedInput)
```

All write paths call `encryptClientForOrg(data, organizationId)` before persisting — do not bypass this.

## Permissions

| Action | Minimum Role |
|--------|-------------|
| `crm:read` | VIEWER |
| `crm:create` | AGENT |
| `crm:update` | AGENT (own records) / ADMIN (all) |
| `crm:delete` | ADMIN |

## Quick Add Components

- `app/[locale]/app/(routes)/crm/components/QuickAddClient.tsx`
- `app/[locale]/app/(routes)/crm/components/QuickAddMandate.tsx`

## Related Guides

- [Matchmaking](../matchmaking/index.md) — mandate-to-property matching
- [Import/Export](../import-export/index.md) — bulk client/mandate import
- [Forms and Validation](../forms-and-validation.md) — form patterns used throughout CRM
