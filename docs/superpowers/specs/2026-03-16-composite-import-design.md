# Composite Import System Design

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Properties schema cleanup + composite Property+Mandate and Client+Mandate import

---

## Background

The Oikion data model separates property/client identity from transactional intent. Mandates carry the intent (price, transaction type, buyer requirements). Until this change, the `Properties` model still holds `price`, `price_type`, and `transaction_type` as legacy fields — and the import system has no concept of cross-entity creation.

This spec covers two tightly coupled changes:
1. Remove mandate-related fields from `Properties` with a data-preserving migration
2. Redesign the import system so a single upload can create both a primary entity (Property or Client) and a linked Mandate in one flow

---

## Part 1 — Schema Migration

### Fields removed from `Properties`

| Field | Type | Reason |
|---|---|---|
| `price` | `Decimal?` | Asking price belongs on Mandate (`budget_min`) |
| `price_type` | `PriceType?` | Price framing belongs on Mandate |
| `transaction_type` | `TransactionType?` | Transaction intent belongs on Mandate |

### Data migration strategy

Run as a single Prisma migration with raw SQL before the column drop:

1. Select all properties where `price IS NOT NULL OR transaction_type IS NOT NULL`
2. For each such property:
   - Generate a UUID for the new Mandate `id`
   - Generate a `friendlyId` following the existing pattern
   - Determine title:
     - `transaction_type = 'SALE'` → `"Sale mandate for <property_name>"`
     - `transaction_type = 'RENTAL'` → `"Rental mandate for <property_name>"`
     - `transaction_type = 'SHORT_TERM'` → `"Short-term mandate for <property_name>"`
     - `transaction_type = 'EXCHANGE'` → `"Exchange mandate for <property_name>"`
     - `transaction_type = 'AUCTION'` → `"Auction mandate for <property_name>"`
     - fallback → `"Mandate for <property_name>"`
   - INSERT into `Mandate`: `title`, `transaction_type`, `budget_min` (← `price`), `organizationId`, `createdBy`, `updatedBy`, `status = 'ACTIVE'`, `visibility = 'PRIVATE'`
   - INSERT into `Mandate_Properties`: `mandateId`, `propertyId`
3. DROP COLUMN `price`, `price_type`, `transaction_type` from `Properties`

The migration runs inside a single transaction. If any step fails, the entire migration rolls back.

### Prisma schema change

Remove from `model Properties`:
```prisma
price            Decimal?
price_type       PriceType?
transaction_type TransactionType?
```

No new fields added. No other models are affected.

---

## Part 2 — Composite Import Engine

### Architecture

The existing `lib/import/engine.ts` is **not modified**. A new orchestration module is added:

```
lib/import/
  engine.ts                    ← unchanged
  composite-engine.ts          ← NEW: orchestration layer
  property-import-config.ts    ← updated: remove price/price_type/transaction_type; add mandate field definitions
  property-composite-config.ts ← NEW: composite config for Property+Mandate
  client-import-config.ts      ← updated: add mandate field definitions
  client-composite-config.ts   ← NEW: composite config for Client+Mandate
  property-import-schema.ts    ← updated: remove mandate fields; add mandate section fields
  client-import-schema.ts      ← updated: add mandate section fields
```

### `executeImport` — small additive change

The existing function signature gains one addition to its return type:

```ts
export interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: ImportError[]
  insertedIds?: string[]   // ← NEW: friendlyIds of successfully inserted records
}
```

This is backward-compatible — existing callers that don't need IDs ignore the field.

### `CompositeImportConfig<TPrimary>`

```ts
export interface CompositeImportConfig<TPrimary> {
  // The primary entity config (delegates to existing ImportEntityConfig)
  primaryConfig: ImportEntityConfig<TPrimary>

  // Set of field keys that belong to the mandate, not the primary entity
  mandateFields: Set<string>

  // Build a Mandate prisma record from one row's mandate-side data
  buildMandateData: (
    mandateRow: Record<string, unknown>,
    primaryFriendlyId: string,
    orgId: string,
    userId: string,
    mandateFriendlyId: string
  ) => Record<string, unknown>

  // Auto-generate mandate title from the parsed primary item
  buildMandateTitle: (primaryItem: TPrimary) => string

  // Which junction table to use
  junctionModel: "Mandate_Properties" | "Mandate_Clients"

  // FK column name on the junction table pointing to the primary entity
  junctionForeignKey: "propertyId" | "clientId"
}
```

### `executeCompositeImport` flow

```
Input: rows[], orgId, userId, compositeConfig

1. PARTITION
   For each row, split into:
     primaryRow  = all fields NOT in compositeConfig.mandateFields
     mandateRow  = only fields in compositeConfig.mandateFields
   Mark row as "composite" if mandateRow has ≥1 non-empty value

2. PRIMARY INSERT
   Call executeImport(primaryConfig, allPrimaryRows, orgId, userId)
   → receives ImportResult with insertedIds[]

3. MANDATE CREATION (only for composite rows)
   - Generate friendlyIds for N mandates (where N = composite row count)
   - Encrypt mandate fields via mandateImportConfig.encryptWithDek
   - Build mandate prisma records using buildMandateData for each composite row
     (title auto-generated via buildMandateTitle(parsedPrimaryItem))
   - Batch insert: prismadb.mandate.createMany({ data: mandateRecords, skipDuplicates: true })

4. LINK
   - For each successfully inserted composite pair (primary + mandate):
     INSERT into junctionModel: { mandateId, [junctionForeignKey]: primaryId }
   - Batch insert via prismadb[junctionModel].createMany({ skipDuplicates: true })

5. RETURN CompositeImportResult
   {
     imported: number          // primary entities created
     mandatesCreated: number   // mandates created
     linked: number            // junction rows inserted
     failed: number
     errors: ImportError[]
   }
```

---

## Part 3 — Field Split Definitions

### Property import — mandate fields

These columns are **removed** from the property schema and added to a new `"mandate"` group in the property field definitions:

| CSV column | Maps to Mandate field | Notes |
|---|---|---|
| `price` | `budget_min` | Asking price as mandate minimum |
| `price_type` | *(inference only)* | Used to infer `transaction_type` if not mapped; not stored directly |
| `transaction_type` | `transaction_type` | Moved entirely to Mandate |

Auto-generated mandate title: `"<TransactionType label> mandate for <property_name>"`, e.g. `"Sale mandate for Διαμέρισμα Κολωνάκι"`. Falls back to `"Mandate for <property_name>"` if no `transaction_type`.

### Client import — mandate fields

These columns are **added** to the client import schema as a new `"mandate"` group (they previously existed on Client but were removed in the March 2026 cleanup):

| CSV column | Maps to Mandate field |
|---|---|
| `transaction_type` | `transaction_type` |
| `property_type` | `property_type` |
| `property_purpose` | `property_purpose` |
| `budget_min` | `budget_min` |
| `budget_max` | `budget_max` |
| `timeline` | `timeline` |
| `urgency` | `urgency` |
| `size_min_sqm` | `size_min_sqm` |
| `size_max_sqm` | `size_max_sqm` |
| `bedrooms_min` | `bedrooms_min` |
| `bedrooms_max` | `bedrooms_max` |
| `areas_of_interest` | `areas_of_interest` |
| `municipality` | `municipality` |
| `region` | `region` |
| `expires_at` | `expires_at` |
| `mandate_notes` | `notes` |

Auto-generated mandate title: `"Mandate for <client_name>"`.

### Detection rule

A mandate is created for a given row if and only if **at least one** mandate-group field has a non-empty value after column mapping. Rows with no mandate fields create only the primary entity — no mandate, no junction row.

---

## Part 4 — UI Changes

### Wizard steps — unchanged structure

The existing 5-step wizard (Upload → Mapping → Validation → Review → Complete) is preserved. All changes are additive.

### Mapping step

- Mandate fields appear in a dedicated `"Mandate Info"` group in the field selector dropdown, visually separated from property/client fields
- A contextual banner renders at the top of the mapping step if any mandate-group column is auto-matched:
  > *"Columns mapped to Mandate Info will automatically create and link a Mandate for each row."*
- No new step is introduced

### Validation step

- Mandate field validation errors surface in the same error table alongside primary entity errors
- Error rows display the mandate field name and value as usual

### Review step

Two count lines replace the single count, conditional on mandate detection:

```
42 Properties will be created
38 Mandates will be created and linked   ← shown only if ≥1 mandate field is mapped
```

### Complete step

Result summary:

```
42 properties imported
38 mandates created and linked           ← shown only if mandatesCreated > 0
N rows failed
```

### Routes and pages

No new routes or pages. Changes in-place:
- `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`
- `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`
- `app/api/mls/properties/import/route.ts` — switches `executeImport` → `executeCompositeImport`
- `app/api/crm/clients/import/route.ts` — switches `executeImport` → `executeCompositeImport`

The Mandate import (`/mandates/import`) is **unchanged**.

---

## Files Created / Modified

### New files
- `lib/import/composite-engine.ts`
- `lib/import/property-composite-config.ts`
- `lib/import/client-composite-config.ts`
- `prisma/migrations/YYYYMMDD_remove_price_fields_from_properties/migration.sql`

### Modified files
- `prisma/schema.prisma` — remove 3 fields from Properties
- `lib/import/engine.ts` — add `insertedIds` to `ImportResult`
- `lib/import/property-import-schema.ts` — remove price/price_type/transaction_type; add mandate group fields
- `lib/import/property-import-config.ts` — remove those 3 fields from `toPrismaData`
- `lib/import/client-import-schema.ts` — add mandate group fields
- `lib/import/client-import-config.ts` — no change to toPrismaData (mandate fields never reach it)
- `lib/import/index.ts` — export new composite configs and `executeCompositeImport`
- `app/api/mls/properties/import/route.ts`
- `app/api/crm/clients/import/route.ts`
- `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`
- `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`
- `components/import/ImportWizardSteps.tsx` — review/complete step count display

---

## Error Handling

- If the primary insert partially fails (some rows bad), only composite rows that **successfully inserted** proceed to mandate creation
- If mandate creation fails for a specific row, the primary entity still exists but no mandate/link is created; the error is reported in `errors[]` with the row number
- If the junction insert fails, the mandate exists but is unlinked; this is reported as an error (the mandate can be manually linked later)
- The `CompositeImportResult` distinguishes between `failed` (primary failures) and individual step errors

---

## Out of Scope

- Migrating `price`/`transaction_type` display in existing property views (separate task)
- Updating property cards/listings that currently show price (separate task)
- The standalone Mandate import flow (unchanged)
- Import of `Mandate_Properties` links in the standalone mandate import (not required)
