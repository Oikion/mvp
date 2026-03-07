# Mandate Entity Linking — Full Triangle Design

**Date:** 2026-03-06
**Status:** Approved

## Goal

Complete the entity linking triangle: Mandates must link to both Properties and Clients with M:N relationships, matching the existing Client ↔ Property pattern. All three detail pages (Client, Property, Mandate) should show and manage their linked entities bidirectionally.

## Current State

| Relationship | Type | Mechanism |
|---|---|---|
| Client ↔ Property | M:N junction | `Client_Properties` table, `LinkEntityDialog`, `LinkedEntitiesPanel` |
| Mandate → Client | 1:1 FK | `Mandate.clientId` + Combobox picker in MandateView |
| Mandate → Property | None | Only algorithmic matchmaking (read-only scores) |

## Target State

| Relationship | Type | Mechanism |
|---|---|---|
| Client ↔ Property | M:N junction | `Client_Properties` (unchanged) |
| Mandate ↔ Client | M:N junction | New `Mandate_Clients` table |
| Mandate ↔ Property | M:N junction | New `Mandate_Properties` table |

All three pairs use the same linking UI pattern: `LinkEntityDialog` for search + multi-select, `LinkedEntitiesPanel` for display + unlink.

## Database Schema Changes

### New Junction Tables

```prisma
model Mandate_Properties {
  id         String     @id @default(uuid())
  createdAt  DateTime   @default(now())
  mandateId  String
  propertyId String
  Mandate    Mandate    @relation(fields: [mandateId], references: [id], onDelete: Cascade)
  Properties Properties @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([mandateId, propertyId])
  @@index([mandateId])
  @@index([propertyId])
}

model Mandate_Clients {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  mandateId String
  clientId  String
  Mandate   Mandate  @relation(fields: [mandateId], references: [id], onDelete: Cascade)
  Clients   Clients  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([mandateId, clientId])
  @@index([mandateId])
  @@index([clientId])
}
```

### Model Relation Updates

- `Mandate` model: add `Mandate_Properties[]` and `Mandate_Clients[]` relations; remove `clientId`, `client_linked_at`, and `client` FK relation
- `Properties` model: add `Mandate_Properties Mandate_Properties[]`
- `Clients` model: add `Mandate_Clients Mandate_Clients[]`; remove back-relation `Mandate Mandate[]`

### Data Migration

A migration SQL script will:
1. Create both junction tables
2. Copy existing `Mandate.clientId` data into `Mandate_Clients` rows
3. Drop `clientId` and `client_linked_at` columns from `Mandate`

## API Design

### New Route: `/api/mandates/link-entities`

| Method | Direction | Body/Query |
|---|---|---|
| POST | Mandate → Properties | `{ mandateId, propertyIds: string[] }` |
| POST | Mandate → Clients | `{ mandateId, clientIds: string[] }` |
| DELETE | Unlink | `?mandateId=X&propertyIds=a,b` or `?mandateId=X&clientIds=a,b` |
| PUT | Property → Mandates | `{ propertyId, mandateIds: string[] }` |
| PUT | Client → Mandates | `{ clientId, mandateIds: string[] }` |

All operations verify org ownership. Uses upsert to prevent duplicates. Invalidates relevant SWR cache keys.

### Linked Entity Fetch Endpoints

Add `include` for linked entities in existing GET endpoints:
- `GET /api/mandates/[mandateId]` — include `Mandate_Properties.Properties` and `Mandate_Clients.Clients`
- `GET /api/mls/properties/[slug]` — include `Mandate_Properties.Mandate`
- `GET /api/crm/clients/[clientId]` — include `Mandate_Clients.Mandate`

## UI Changes

### Extend `LinkEntityDialog`

- Add `entityType: "mandate"` support
- Add `sourceType: "mandate"` support
- Requires `"mandate"` in `useUnifiedEntitySearch` EntityType

### Extend `LinkedEntitiesPanel`

- Add `type: "mandates"` support
- New `MandateCard` component showing: title, transaction type, budget range, status, urgency

### Mandate Detail Page (`MandateView`)

- Replace single-client Combobox with `LinkedEntitiesPanel` for clients
- Add `LinkedEntitiesPanel` for properties
- Both panels in the right sidebar

### Property Detail Page (`PropertyView`)

- Add "Linked Mandates" `LinkedEntitiesPanel` card in sidebar

### Client Detail Page (`ClientView`)

- Add "Linked Mandates" `LinkedEntitiesPanel` card in sidebar

## Unified Entity Search

Add `"mandate"` to `EntityType` union in `useUnifiedEntitySearch.ts`. Implement mandate search in `/api/search/entities` (or equivalent) returning mandate title, transaction type, budget, status.

## SWR Hooks

New hooks in `useLinkMutations.ts`:
- `useLinkPropertiesToMandate(mandateId)` / `useUnlinkPropertyFromMandate(mandateId)`
- `useLinkClientsToMandate(mandateId)` / `useUnlinkClientFromMandate(mandateId)`
- `useLinkMandatesToProperty(propertyId)` / `useUnlinkMandateFromProperty(propertyId)`
- `useLinkMandatesToClient(clientId)` / `useUnlinkMandateFromClient(clientId)`

## Scope Exclusions

- CalendarEvent ↔ Mandate linking (not requested)
- Document ↔ Mandate linking (not requested)
- Changes to the matchmaking engine (remains read-only analytics)
