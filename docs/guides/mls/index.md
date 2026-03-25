# MLS Guide

Property management and listings for Greek real estate agencies.

> Content to be developed. This stub covers key code paths and conventions.

## Overview

The MLS (Multiple Listing System) module manages:
- **Properties** — real estate listings with full details, photos, and documents
- **Portal publishing** — push listings to xe.gr and other portals
- **Cross-org matching** — share properties with other agencies via Polis (see [matchmaking](../matchmaking/index.md))

## Key Code Paths

| Area | Path |
|------|------|
| Server actions | `actions/mls/` |
| API routes (internal) | `app/api/mls/` |
| External API | `app/api/v1/mls/properties/` |
| Page routes | `app/[locale]/app/(routes)/mls/` |
| Validation schemas | `lib/validations/mls.ts` |
| SWR hooks | `hooks/swr/` (`useProperties`, etc.) |

## Property Model

Properties are tenant-scoped (`organizationId`). Key fields:
- `status`: `DRAFT | ACTIVE | UNDER_OFFER | SOLD | RENTED | WITHDRAWN | ARCHIVED`
- `portalVisibility`: `HIDDEN | PRIVATE | SECURE | PUBLIC` (default `PRIVATE`)
- Encrypted fields: `primary_email`, `communication_notes` — see `lib/model-encryption.ts`
- Addresses are intentionally NOT encrypted (preserved for searchability)

## Creating Properties

```typescript
import { createProperty } from '@/actions/mls/create-property'

const result = await createProperty(validatedInput)
// organizationId is injected by getCurrentOrgId() inside the action
```

The wizard at `NewPropertyWizard.tsx` is the primary creation UI. Uses `<CardContent key={currentStep}>` to force React unmount/remount between steps — do not remove this.

## Visibility Rules

| Visibility | Matchmaking | Cross-org Polis | Portal publish |
|------------|------------|-----------------|----------------|
| HIDDEN | No | No | No |
| PRIVATE | Intra-org only | No | No |
| SECURE | Intra-org | Yes (bilateral) | No |
| PUBLIC | Intra-org | Yes | Yes (showcase) |

Downgrading to HIDDEN or PRIVATE atomically deletes `CrossOrgMatch` rows — see `lib/import/` actions.

## Portal Publishing

See [Portal Publishing Guide](../portal-publishing/index.md) for xe.gr integration details.

## External API

```bash
GET  /api/v1/mls/properties        # list (Bearer oik_xxx)
POST /api/v1/mls/properties        # create
PUT  /api/v1/mls/properties/:id    # update
```

Requires `mls:read` / `mls:write` API key scopes.

## Permissions

| Action | Minimum Role |
|--------|-------------|
| `mls:read` | VIEWER |
| `mls:create` | AGENT |
| `mls:update` | AGENT (own) / ADMIN (all) |
| `mls:delete` | ADMIN |
| `mls:publish` | ADMIN |

## Related Guides

- [Matchmaking](../matchmaking/index.md) — cross-org matching
- [Portal Publishing](../portal-publishing/index.md) — xe.gr publishing
- [Import/Export](../import-export/index.md) — bulk property import
