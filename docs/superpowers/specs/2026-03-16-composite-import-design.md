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
| `price` | `Decimal?` | Asking price belongs on Mandate (`budget_min`/`budget_max`) |
| `price_type` | `PriceType?` | Price framing belongs on Mandate |
| `transaction_type` | `TransactionType?` | Transaction intent belongs on Mandate |

### Data migration strategy — two-step process

Because `friendlyId` generation requires calling `generateFriendlyIds()` (a TypeScript function that atomically increments the `IdSequence` table), a pure SQL migration cannot be used for the data step. The migration is split into two stages:

**Stage A — TypeScript data migration script** (`scripts/migrate-property-prices-to-mandates.ts`):

Runs once before the Prisma schema migration. Uses `prismadb` directly:

1. Query all properties where `(price IS NOT NULL OR transaction_type IS NOT NULL)` **AND** there is no existing `Mandate_Properties` row for that `propertyId` — this makes the script idempotent on re-run after partial failure:
   ```ts
   const existingLinks = await prismadb.mandate_Properties.findMany({ select: { propertyId: true } })
   const alreadyLinked = new Set(existingLinks.map(l => l.propertyId))
   const properties = (await prismadb.properties.findMany({
     where: { OR: [{ price: { not: null } }, { transaction_type: { not: null } }] },
     select: { id, property_name, price, price_type, transaction_type, organizationId }
   })).filter(p => !alreadyLinked.has(p.id))
   ```
2. Group remaining properties by `organizationId`; for each org call `generateFriendlyIds(prismadb, "Mandates", count, orgId)` **outside** the transaction — `generateFriendlyIds` accepts `PrismaClient`, not `TransactionClient`, so it cannot run inside `$transaction`
3. For each property, determine mandate title:
   - `SALE` → `"Sale mandate for <property_name>"`
   - `RENTAL` → `"Rental mandate for <property_name>"`
   - `SHORT_TERM` → `"Short-term mandate for <property_name>"`
   - `EXCHANGE` → `"Exchange mandate for <property_name>"`
   - `AUCTION` → `"Auction mandate for <property_name>"`
   - no `transaction_type` → `"Mandate for <property_name>"`
4. Map `price` → both `budget_min` AND `budget_max` (equal values representing a fixed asking price; the Mandate model has no dedicated `asking_price` field)
5. INSERT mandates and junction rows inside a single `prismadb.$transaction`:
   - Mandate records: `{ id: crypto.randomUUID(), friendlyId, title, transaction_type, budget_min, budget_max, organizationId, createdBy: null, updatedBy: null, status: 'ACTIVE', visibility: 'PRIVATE' }`
     - Use `crypto.randomUUID()` (Node built-in) — do not add a `uuid` npm import
     - `createdBy`/`updatedBy` set to `null` (both `String?`; no user context available in a migration script)
   - Junction rows into `mandate_Properties`: `{ mandateId, propertyId }`
     - The `id` field on `mandate_Properties` has `@default(uuid())` — do NOT supply it manually; Prisma auto-populates it
   - If any step fails, the transaction rolls back
   - Transaction atomicity guarantees that mandate and junction rows are always created together. The idempotency guard (checking `mandate_Properties.propertyId`) is therefore sufficient — if a junction row exists, the mandate also exists. There is no partial state between them.

**Stage B — Prisma schema migration** (standard `prisma migrate dev`):

After Stage A completes successfully, run the Prisma migration that removes the three columns:

```prisma
// Remove from model Properties:
price            Decimal?     ← DROP
price_type       PriceType?   ← DROP
transaction_type TransactionType?  ← DROP
```

Stage B is a pure DDL migration with no data step.

### Application-layer updates required alongside schema migration

Dropping `price`, `price_type`, and `transaction_type` from `Properties` will cause TypeScript compile errors in the following files, which must be updated as part of this work:

- `app/api/mls/properties/route.ts` — POST/PUT handlers write these fields
- `app/api/v1/mls/properties/route.ts` — external API reads/writes all three
- `app/api/export/mls/route.ts` — XML export reads price and transaction_type
- `app/api/export/crm/route.ts` — may reference transaction_type
- `actions/mls/` — any action that selects or writes these fields
- `components/` — property cards, filters, listing views that display price or transaction_type
- `app/[locale]/app/(routes)/mls/properties/components/NewPropertyWizard.tsx` — form fields
- Any other component or hook that references `property.price`, `property.price_type`, or `property.transaction_type`

**Strategy for these files:** Remove the field references from Prisma selects and form payloads. Display components that showed price should either be removed or read the linked Mandate's `budget_min`/`budget_max` instead (out of scope for this task — see Part 5).

**CRITICAL deployment constraint:** `property-import-config.ts` `toPrismaData` currently writes `price`, `price_type`, and `transaction_type` to the Properties insert payload. These assignments MUST be removed in the same deployment unit as Stage B. If Stage B runs before these assignments are removed, any property import (standalone or composite) will throw a Prisma runtime error trying to write to non-existent columns.

---

## Part 2 — Composite Import Engine

### Architecture

The existing `lib/import/engine.ts` is **not modified at all**. A new orchestration module is added:

```
lib/import/
  engine.ts                    ← unchanged
  composite-engine.ts          ← NEW: orchestration layer
  property-import-config.ts    ← updated: remove price/price_type/transaction_type from toPrismaData
  property-composite-config.ts ← NEW: composite config for Property+Mandate
  client-import-config.ts      ← no change to toPrismaData (mandate fields never reach it)
  client-composite-config.ts   ← NEW: composite config for Client+Mandate
  property-import-schema.ts    ← updated: remove mandate fields; add mandate group fields
  client-import-schema.ts      ← updated: add mandate group fields
```

### `executeImport` — no changes

`engine.ts` is left completely untouched. The composite engine does not call `executeImport` — it performs its own validate → ID-gen → encrypt → individual-create loop, matching the engine's existing fallback path. This gives exact per-row success/failure tracking without relying on `createMany({ skipDuplicates: true })`, which cannot distinguish a newly inserted row from a pre-existing one.

### Per-row insert tracking

The composite engine tracks each successful primary insert as:
```ts
type InsertedPrimary = { rowIndex: number; friendlyId: string; uuid: string }
```

Each row is attempted individually via `prismadb[primaryModel].create({ data })`. On success the returned record's `id` (UUID) and `friendlyId` are captured. On failure the error is recorded against `rowIndex`. This gives the composite engine a precise map of which rows to proceed with for mandate creation.

### `CompositeImportConfig<TPrimary>`

```ts
export interface CompositeImportConfig<TPrimary> {
  // The primary entity config — used for schema validation, ID type, encryption, and toPrismaData
  primaryConfig: ImportEntityConfig<TPrimary>

  // Set of CSV field keys that belong to the mandate, not the primary entity
  mandateFields: Set<string>

  // Build a Mandate prisma record directly — bypasses mandateImportSchema validation
  // (mandate rows have no title column; title is injected via buildMandateTitle)
  buildMandateData: (
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    orgId: string,
    userId: string
  ) => Record<string, unknown>

  // Auto-generate the mandate title from the parsed primary item
  buildMandateTitle: (primaryItem: TPrimary) => string

  // Which junction table to use
  // Must match Prisma client accessor exactly (lowercase m): "mandate_Properties" | "mandate_Clients"
  junctionModel: "mandate_Properties" | "mandate_Clients"

  // FK column name on the junction table pointing to the primary entity
  junctionForeignKey: "propertyId" | "clientId"
}
```

The primary Prisma model accessor is derived from `primaryConfig.prismaModel` — no separate field needed. `primaryConfig.prismaModel` is `"properties"` for the property composite config and `"clients"` for the client composite config, matching the Prisma client accessors `prismadb.properties` and `prismadb.clients` directly.

```ts
```

### `executeCompositeImport` flow

```
Input: rows[], orgId, userId, compositeConfig

1. PARTITION
   For each row, split into:
     primaryRow  = { fields NOT in compositeConfig.mandateFields }
     mandateRow  = { fields IN compositeConfig.mandateFields }
   isComposite(row) = mandateRow has ≥1 field passing the emptiness check (see §3)

2. VALIDATE
   Run each primaryRow through primaryConfig.importSchema.safeParse()
   Collect validItems[] and errors[] (same logic as engine.ts)

   EARLY EXIT: if validItems is empty, return
   { imported: 0, mandatesCreated: 0, linked: 0, failed: rows.length, errors }

3. ID GENERATION (primary entity only — mandate IDs are generated separately in step 6)
   Mirror the existing engine logic for the primary entity:
   - Items with a user-provided `id` field → batch-resolve via resolveUserProvidedIds
     (normalise, check DB for collisions, append -N suffixes against primaryConfig.prismaModel)
   - Items without a user-provided `id` → generateFriendlyIds(prismadb, primaryConfig.entityIdType, count, orgId)
   Both calls are on the outer prismadb client, never inside a transaction.

4. ENCRYPT + BUILD PRIMARY DATA
   Fetch orgDek via getOrgDek(orgId) — fetched ONCE and reused for both primary encryption
   (step 4) and mandate encryption (step 6); do not call getOrgDek twice.
   For each validItem: encryptedFields = primaryConfig.encryptWithDek(raw, dek)
   primaryData = primaryConfig.toPrismaData(parsed, encryptedFields, friendlyId, userId, orgId)

5. PRIMARY INSERT — individual creates
   primaryModel = primaryConfig.prismaModel  (derived — no separate field needed)
   For each primaryData record:
     try: record = await prismadb[primaryModel].create({ data: primaryData[i] })
          → capture { rowIndex: i, friendlyId, uuid: record.id }
     catch (err):
       if Prisma error code P2002 (unique constraint) → classify as "skipped", do NOT add to errors[]
       else → append to errors[]
   Collect insertedPrimaries: InsertedPrimary[]
   Note: unlike executeImport's createMany+skipDuplicates which silently absorbs duplicates,
   individual creates throw P2002 on constraint violations — handle explicitly.

   EARLY EXIT: if insertedPrimaries is empty, return
   { imported: 0, mandatesCreated: 0, linked: 0, failed: rows.length, errors }

6. MANDATE CREATION (composite rows only)
   Filter insertedPrimaries to those where the original row isComposite
   compositeInserted = [...] (N rows)

   If N === 0: skip to step 8

   Generate N mandate friendlyIds:
     mandateFriendlyIds = generateFriendlyIds(prismadb, "Mandates", N, orgId)

   For each composite row i:
     title = compositeConfig.buildMandateTitle(parsedPrimaryItem)
     GUARD: if title.trim() === "" → title = "Mandate for [entity]" (never store empty title)
     mandateData = compositeConfig.buildMandateData(mandateRow, title, mandateFriendlyIds[i], orgId, userId)
     — buildMandateData MUST set title as plaintext (unencrypted) in the returned object.
       The encrypt step below reads mandateData.title as a plaintext string and replaces it.
       If buildMandateData pre-encrypts the title, the encrypt step will double-encrypt it
       (the isEncrypted() guard would prevent this, but it is cleaner to never pre-encrypt).
     Encrypt: encryptedMandateFields = mandateImportConfig.encryptWithDek(mandateData, dek)
     finalMandateData = { ...mandateData, ...encryptedMandateFields }
     — mandateData is inserted DIRECTLY, bypassing mandateImportSchema (no title column in CSV)

   Individual mandate creates:
     try: record = await prismadb.mandate.create({ data: mandateData[i] })
          → capture { compositeIndex: i, mandateUuid: record.id }
     catch: append to errors[] with row number; no junction row for this pair

7. LINK
   For each successfully inserted (primary, mandate) pair:
     junctionRow = { mandateId: mandateUuid, [junctionForeignKey]: primaryUuid }
     — do NOT supply the junction id field; it is @default(uuid()) and auto-populated by Prisma

   Individual junction creates (to surface per-row errors):
     try: await prismadb[junctionModel].create({ data: junctionRow })
     catch: append error noting mandate exists but is unlinked

8. RETURN CompositeImportResult
   {
     imported: insertedPrimaries.length
     mandatesCreated: number of successful mandate creates
     linked: number of successful junction creates
     failed: rows.length - insertedPrimaries.length
     skipped: number of P2002-classified rows
     errors: ImportError[]
   }
```

**`CompositeImportResult` and the API routes:** The existing import routes return `ImportResult`. The composite import API routes (`/api/mls/properties/import/route.ts`, `/api/crm/clients/import/route.ts`) are updated to call `executeCompositeImport` and return `CompositeImportResult`. The wizard `CompleteStep` and `ReviewStep` components read the response shape — they must be updated to handle both `ImportResult` (standalone mandate import) and `CompositeImportResult` (property/client imports). The cleanest approach is to make `CompositeImportResult` a superset of `ImportResult` (all base fields present, plus `mandatesCreated` and `linked` as optional additions). The wizard renders the mandate count line only when `mandatesCreated > 0`.

**Note on `bathrooms_min`/`bathrooms_max`:** These Mandate fields are `Int?` in Prisma. `buildMandateData` must apply `Math.floor()` to these values before inserting to avoid a Prisma type error on fractional CSV inputs (e.g., `"1.5"`).

---

## Part 3 — Field Split Definitions

### Property import — mandate fields

These columns are **removed** from the property import schema and added as a `"mandate"` group in the property field definitions. They are stripped from the `primaryRow` during partitioning and never reach `property-import-config.ts`'s `toPrismaData`.

| CSV column | Maps to Mandate field | Notes |
|---|---|---|
| `price` | `budget_min` AND `budget_max` | Both set to same value — fixed asking price |
| `price_type` | *(inference only — not stored)* | See inference table below |
| `transaction_type` | `transaction_type` | Fully moved to Mandate |

**`price_type` → `transaction_type` inference:**

`price_type` is used **only as a fallback** when `transaction_type` is absent or null. If a row has both columns mapped, `transaction_type` takes precedence and `price_type` is ignored entirely.

| `PriceType` value | Inferred `TransactionType` |
|---|---|
| `SALE` | `SALE` |
| `RENTAL` | `RENTAL` |
| `PER_ACRE` | `null` — no equivalent, ignored |
| `PER_SQM` | `null` — no equivalent, ignored |

`price_type` is never stored on the Mandate record regardless of outcome. Inside `buildMandateData` (property composite config), `price_type` is read from `mandateRow` solely to infer `transaction_type` when that field is absent, then discarded — it is not included in the returned prisma data object.

**Accepted edge case:** When `price` is set but `transaction_type` is absent AND `price_type` is `PER_ACRE` or `PER_SQM` (which have no `TransactionType` equivalent), the resulting mandate will have `transaction_type: null` with `budget_min/max` set. This is a valid database state — the mandate will be created with no transaction type. This is acceptable behavior for the import flow; agents can manually set the transaction type afterward.

Auto-generated mandate title uses the resolved `transaction_type` (from direct mapping or inference). Falls back to `"Mandate for <property_name>"` if `transaction_type` is ultimately null.

### Client import — mandate fields

These columns are **added** to the client import schema as a `"mandate"` group. They do not exist on the client schema and are stripped from `primaryRow` during partitioning.

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
| `notes` | `notes` |

The field definition key is `notes` (matching the Mandate model field). The alias `mandate_notes` appears in the field definition's `aliases[]` list for fuzzy auto-matching against CSV columns named "mandate_notes", "client_notes", etc. After mapping and partitioning, the key in `mandateRow` is always `notes` — `buildMandateData` does not need to rename anything.

Auto-generated mandate title: `"Mandate for <client_name>"`.

### Detection rule

A mandate is created for a given row if and only if **at least one** mandate-group field has a non-empty value after column mapping. Rows with no mandate fields create only the primary entity — no mandate, no junction row.

**Emptiness check** uses strict inequality — NOT JavaScript truthiness — to avoid suppressing valid zero values (e.g., `bedrooms_min: 0`):

```ts
function isMandateFieldNonEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ""
}
```

A row is composite if `Object.values(mandateRow).some(isMandateFieldNonEmpty)`.

---

## Part 4 — UI Changes

### Wizard steps — unchanged structure

The existing 5-step wizard (Upload → Mapping → Validation → Review → Complete) is preserved. All changes are additive.

### Mapping step

- Mandate fields appear in a dedicated `"Mandate Info"` group in the field selector dropdown, visually separated from property/client fields
- A contextual banner renders at the top of the mapping step when at least one mandate-group column is mapped (auto or manual):
  > *"Columns mapped to Mandate Info will automatically create and link a Mandate for each row."*
- No new step is introduced

### Validation step

- Mandate field validation errors surface in the same error table alongside primary entity errors
- Error rows display the mandate field name and value as usual

### Review step

Two count lines, conditional on whether any mandate field is mapped:

```
42 Properties will be created
38 Mandates will be created and linked   ← shown only if ≥1 mandate field is mapped
```

### Complete step

```
42 properties imported
38 mandates created and linked           ← shown only if mandatesCreated > 0
N rows failed
```

### Routes and pages

No new routes or pages. Changes in-place:
- `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`
- `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`
- `app/api/mls/properties/import/route.ts` — switches to `executeCompositeImport`
- `app/api/crm/clients/import/route.ts` — switches to `executeCompositeImport`

The Mandate import (`/mandates/import`) is **unchanged**.

---

## Part 5 — Out of Scope (follow-on tasks)

The following are explicitly deferred and tracked separately:

- **Property view/card price display** — components that showed `property.price` need to read the linked Mandate's `budget_min`/`budget_max` instead. This requires updating property detail pages, cards, and filters.
- **`transaction_type` filtering** — property list filters that used `transaction_type` on Properties must move to filtering via linked Mandates or be removed.
- **External API (`/api/v1/`)** — the v1 external API currently exposes `price` and `transaction_type` on property responses. This needs a versioned update.
- **Portal export** — XML/CSV export files that include price or transaction_type need updating.
- **Standalone Mandate import** — the existing `/mandates/import` flow is unchanged and still works independently.

---

## Files Created / Modified

### New files
- `scripts/migrate-property-prices-to-mandates.ts` — Stage A data migration script
- `lib/import/composite-engine.ts`
- `lib/import/property-composite-config.ts`
- `lib/import/client-composite-config.ts`

### Modified files
- `prisma/schema.prisma` — remove 3 fields from Properties model
- `prisma/migrations/YYYYMMDD_remove_price_fields_from_properties/migration.sql` — Stage B DDL
- `lib/import/engine.ts` — **no changes** (composite engine is fully independent)
- `lib/import/property-import-schema.ts` — remove price/price_type/transaction_type; add mandate group fields
- `lib/import/property-import-config.ts` — remove those 3 fields from `toPrismaData`
- `lib/import/client-import-schema.ts` — add mandate group fields
- `lib/import/index.ts` — export composite configs and `executeCompositeImport`
- `app/api/mls/properties/import/route.ts`
- `app/api/crm/clients/import/route.ts`
- `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`
- `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`
- `components/import/ImportWizardSteps.tsx` — review/complete step count display
- All files referencing `Properties.price`, `Properties.price_type`, `Properties.transaction_type` (see Part 1 for list)

---

## Error Handling

- **All primary rows fail validation:** Steps 3–5 are skipped; returns `{ imported: 0, mandatesCreated: 0, linked: 0, failed: N, errors }`
- **Partial primary failures:** Only rows captured in `insertedPrimaries[]` proceed to mandate creation; failed primary rows produce no mandate
- **Mandate creation failure for a row:** Primary entity still exists; error reported in `errors[]` with row number; no junction row created
- **Junction insert failure:** Mandate exists but is unlinked; error reported; mandate can be manually linked later
- **`CompositeImportResult`** distinguishes `failed` (primary failures) from mandate/link errors which appear in `errors[]`
