# Mandates (Αναθέσεις) Module — Design Document

**Date:** 2026-03-04
**Status:** Approved
**Author:** Claude Code

## Overview

Mandates represent a buyer's or renter's brief — what a client is looking for. A Mandate is a first-class entity that can optionally be linked to a Client (one-to-many). The module follows the same architecture as Clients and Properties modules.

## Key Decisions

1. **One-to-many Client→Mandates**: A client can have multiple active mandates
2. **Mandates can exist without clients**: Unlinked mandates are valid
3. **Matchmaking integration**: New "Mandate Matches" tab in existing dashboard, separate from client-property matching
4. **Encryption**: Server-side per-org DEK encryption on sensitive fields (notes, communication_notes, title)
5. **Navigation**: Under Core Business, sharing `crm` moduleId permission

## Data Model

### New Enums

```
MandateStatus: DRAFT | ACTIVE | PAUSED | FULFILLED | EXPIRED | CANCELLED
MandateUrgency: LOW | MEDIUM | HIGH | CRITICAL
```

### Mandate Model

Core fields:
- `id` (String, friendly ID: "MND-001")
- `organizationId` (String, tenant isolation)
- `title` (String, encrypted)
- `transaction_type` (TransactionType — reuses existing enum)
- `property_type` (PropertyType? — reuses existing enum)
- `property_purpose` (PropertyPurpose? — reuses existing enum)

Location preferences:
- `areas_of_interest` (Json — String[])
- `municipality`, `region` (String?)

Size preferences:
- `size_min_sqm`, `size_max_sqm`, `plot_size_min_sqm`, `plot_size_max_sqm` (Decimal?)

Budget:
- `budget_min`, `budget_max` (Decimal?)

Rooms & features:
- `bedrooms_min`, `bedrooms_max`, `bathrooms_min`, `bathrooms_max` (Int?)
- `floor_min`, `floor_max` (Int?), `ground_floor_only` (Boolean?)

Condition & quality:
- `condition` (PropertyCondition[] — multi-select)
- `year_built_min`, `year_built_max` (Int?)

Features:
- `heating_type` (HeatingType[] — multi-select)
- `energy_cert_min` (EnergyCertClass?)
- `furnished` (FurnishedStatus?), `elevator`, `parking`, `pets_allowed` (Boolean?)
- `amenities` (Json — String[])

Legal:
- `inside_city_plan` (Boolean?), `legalization_ok` (Boolean?)

Status:
- `status` (MandateStatus, default DRAFT)
- `urgency` (MandateUrgency?, default MEDIUM)
- `timeline` (Timeline? — reuses existing enum)
- `expires_at` (DateTime?)
- `notes` (String?, encrypted)
- `communication_notes` (Json?, encrypted)

Client link:
- `clientId` (String?, FK → Clients, nullable)
- `client_linked_at` (DateTime?, set when client is linked)

Draft:
- `draft_status` (Boolean?, default false)

Assignment:
- `assigned_to` (String?, FK → Users)

### MandateComment Model

Same pattern as ClientComment/PropertyComment.

## Encryption

Server-side encrypted fields (per-org DEK in `lib/model-encryption.ts`):
- `title` — may reference client name
- `notes` — agent observations, potentially PII
- `communication_notes` — internal notes (JSON)

New functions: `encryptMandateForOrg()`, `decryptMandateForOrg()`

E2EE passphrase layer applies if org has it enabled (same infrastructure as clients).

## File Structure

### Pages
```
app/[locale]/app/(routes)/mandates/
  ├── page.tsx                    # List page (force-dynamic)
  ├── loading.tsx                 # Suspense fallback
  ├── [slug]/
  │   ├── page.tsx                # Detail page
  │   └── components/
  │       ├── MandateView.tsx
  │       ├── EditMandateForm.tsx
  │       └── MandateComments.tsx
  └── components/
      └── NewMandateWizard.tsx    # 5-step wizard
```

### Components
```
app/[locale]/app/(routes)/mandates/components/
  ├── MandatesPageView.tsx
  ├── MandateCard.tsx
  ├── QuickAddMandate.tsx
  └── table-components/
      ├── columns.tsx
      ├── data-table.tsx
      ├── data-table-toolbar.tsx
      ├── data-table-pagination.tsx
      └── MandateFilterDrawer.tsx
```

### Backend
```
actions/mandates/
  ├── get-mandates.ts
  ├── get-mandate.ts
  └── update-mandate.ts

app/api/mandates/
  ├── route.ts               # GET, POST, PUT
  ├── draft/route.ts          # POST (autosave)
  └── [mandateId]/
      ├── route.ts            # GET, DELETE
      ├── comments/route.ts
      └── link-client/route.ts  # POST, DELETE
```

### Hooks & Validation
```
hooks/swr/
  ├── useMandates.ts
  ├── useMandatesPaginated.ts
  └── useMandateComments.ts

lib/validations/mandates.ts
```

### Translations
```
locales/en/mandates.json
locales/el/mandates.json
```

### Matchmaking
```
actions/matchmaking/get-mandate-matches.ts
app/[locale]/app/(routes)/matchmaking/components/MandateMatchesTab.tsx
```

## Navigation

Added under Core Business group in `config/navigation.tsx`, after CRM.
Uses `crm` moduleId — no permissions system changes needed.
Icon: ClipboardListIcon (new icon component following existing icon pattern).

## Wizard Steps (5 steps)

1. **Basics** — title, transaction_type, property_type, property_purpose, status, urgency
2. **Location & Size** — areas_of_interest, municipality, region, size ranges, plot size ranges
3. **Requirements** — bedrooms, bathrooms, floor, budget, timeline, year_built ranges
4. **Features** — condition, heating, energy cert, furnished, elevator, parking, pets, amenities, legal
5. **Assignment** — assigned_to, client link (optional), notes, expires_at

## Client Linking UX

- List view: Unlinked mandates show "No client" badge (muted styling)
- Detail page: "Link Client" button → searchable client selector (reuses `useClients()` hook)
- On link: sets `clientId` and `client_linked_at = now()`
- On unlink: clears `clientId` and `client_linked_at`

## Matchmaking Integration

- New "Mandate Matches" tab in `MatchmakingDashboard.tsx`
- Server action `getMandateMatchAnalytics()` fetches active mandates, adapts to `ClientForMatching` shape, runs through existing `calculateMatchScore`
- Separate statistics from client-property matching
- Tab shows: top mandate-property matches, unmatched mandates, match distribution
