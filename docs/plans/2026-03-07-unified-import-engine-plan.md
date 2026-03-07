# Unified Import Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a configuration-driven import engine that handles clients, properties, and mandates with proper encryption, batch performance (<200ms/100 items), and full localization.

**Architecture:** Single `executeImport()` function in `lib/import/engine.ts` takes an entity config object. Three thin API routes dispatch to it. Four-phase pipeline: validate, batch ID gen, encrypt, createMany.

**Tech Stack:** Next.js 16, Prisma (createMany), Zod, AES-256-GCM encryption, next-intl

---

### Task 1: Create Import Engine Types and Core

**Files:**
- Create: `lib/import/engine.ts`

**Step 1: Write the engine module**

The engine exports:
- `ImportEntityConfig<T>` interface with fields: `prismaModel`, `entityIdType`, `importSchema`, `normalizeEnums`, `encryptWithDek`, `toPrismaData`
- `ImportError` and `ImportResult` types
- `executeImport<T>(config, rows, orgId, userId)` async function

Pipeline phases:
1. Validate: loop rows, call `config.normalizeEnums(row)` then `config.importSchema.safeParse()`, collect valid items and errors
2. Batch ID gen: split into user-provided IDs vs auto-generate. Auto: call `generateFriendlyIds(prismadb, config.entityIdType, count, orgId)`. User-provided: batch `findMany` to check conflicts, resolve with suffixes in memory
3. Encrypt: fetch DEK once via `getOrgDek(orgId)`, apply `config.encryptWithDek(data, dek)` per record
4. Batch insert: transform via `config.toPrismaData()`, single `prisma[model].createMany({ data, skipDuplicates: true })`. Fallback to individual creates if batch fails.

Key imports: `prismadb` from `@/lib/prisma`, `generateFriendlyIds` from `@/lib/friendly-id`, `getOrgDek` from `@/lib/key-management`

Helper functions to include in the module:
- `normalizeId(id: string): string` — lowercase, trim, replace spaces with dashes, remove special chars
- `resolveUserProvidedIds(ids, orgId, prismaModel)` — batch-query existing, assign suffixes for conflicts, returns `Map<originalId, resolvedId>`

**Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

Message: `feat(import): add unified import engine with batch pipeline`

---

### Task 2: Create Client Import Config

**Files:**
- Create: `lib/import/client-import-config.ts`

**Step 1: Write the client config**

Export `clientImportConfig: ImportEntityConfig<ClientImportData>` with:
- `prismaModel: "clients"`, `entityIdType: "Clients"`
- `importSchema: clientImportSchema`, `normalizeEnums: normalizeClientEnums`
- `encryptWithDek`: encrypt the 23 CLIENT_ENCRYPTED_FIELDS (matching `lib/model-encryption.ts` CLIENT_ENCRYPTED_STRING_FIELDS) using `encryptWithKey` from `@/lib/encryption`
- `toPrismaData`: map all fields from validated item, using encrypted values where available, with defaults like `client_status: "LEAD"`, `draft_status: false`, booleans default to `false`

Mirror the exact field mapping from the current `app/api/crm/clients/import/route.ts:122-166` but use encrypted values for encrypted fields.

**Step 2: Commit**

Message: `feat(import): add client import config for unified engine`

---

### Task 3: Create Property Import Config

**Files:**
- Create: `lib/import/property-import-config.ts`

**Step 1: Write the property config**

Export `propertyImportConfig: ImportEntityConfig<PropertyImportData>` with:
- `prismaModel: "properties"`, `entityIdType: "Properties"`
- `encryptWithDek`: only encrypt `primary_email` (properties have limited encryption)
- `toPrismaData`: include `toNumber()` and `toDateTime()` helpers (move from current route). Map all fields from current `app/api/mls/properties/import/route.ts:170-224`

**Step 2: Commit**

Message: `feat(import): add property import config for unified engine`

---

### Task 4: Create Mandate Import Schema and Field Definitions

**Files:**
- Create: `lib/import/mandate-import-schema.ts`

**Step 1: Write the mandate import schema**

Model after `client-import-schema.ts`. Reference `lib/validations/mandates.ts` for enums and the Prisma Mandate model for fields.

Zod schema (`mandateImportSchema`):
- Required: `title` (z.coerce.string().min(1))
- Optional enums: `status` (MandateStatusEnum), `urgency` (MandateUrgencyEnum), `timeline` (TimelineEnum), `transaction_type` (TransactionTypeEnum), `property_type` (PropertyTypeEnum), `property_purpose` (PropertyPurposeEnum), `energy_cert_min` (EnergyCertClassEnum), `furnished` (FurnishedStatusEnum)
- Array enums (arrive pre-split from normalizer): `condition` (z.array(PropertyConditionEnum).optional()), `heating_type` (z.array(HeatingTypeEnum).optional())
- Range numbers: `budget_min/max`, `size_min/max_sqm`, `plot_size_min/max_sqm`, `bedrooms_min/max`, `bathrooms_min/max`, `floor_min/max`, `year_built_min/max` — all `z.coerce.number().optional().nullable()`
- Booleans: `ground_floor_only`, `elevator`, `parking`, `pets_allowed`, `inside_city_plan`, `legalization_ok` — `z.coerce.boolean().optional()`
- JSON arrays: `areas_of_interest`, `amenities` — `z.array(z.string()).optional().nullable()`
- Strings: `municipality`, `region`, `notes` — `z.coerce.string().optional().or(z.literal(""))`
- DateTime: `expires_at` — `z.coerce.string().optional().or(z.literal(""))`
- Optional ID: `id` — same pattern as client/property

Define Zod enums at the top: `MandateStatusEnum`, `MandateUrgencyEnum` (new). Reuse `PropertyTypeEnum`, `TransactionTypeEnum`, `HeatingTypeEnum`, `EnergyCertClassEnum`, `PropertyConditionEnum`, `FurnishedStatusEnum` from `property-import-schema.ts`. Reuse `PropertyPurposeEnum`, `TimelineEnum` from `client-import-schema.ts`.

Field definitions (`mandateImportFieldDefinitions`): ~35 fields with aliases, organized in 8 groups.

Key aliases examples:
- `title`: `["name", "mandate_name", "titlos", "onoma_entolis"]`
- `budget_min`: `["min_budget", "elachisto_budget", "minimum_budget"]`
- `condition`: `["katastasi", "property_condition", "state"]`
- `heating_type`: `["thermansi", "heating", "heat_type"]`
- `areas_of_interest`: `["areas", "perioxes", "locations"]`

**Step 2: Commit**

Message: `feat(import): add mandate import schema and field definitions`

---

### Task 5: Add Mandate Enum Normalizer

**Files:**
- Modify: `lib/import/enum-normalizer.ts`

**Step 1: Add `splitArrayField` utility** (after the `EnumMapping` type, before the first map)

```typescript
export function splitArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
```

**Step 2: Add `mandateStatusMap` and `mandateUrgencyMap`**

Place after the existing `leadSourceMap`. Include English and Greek variations:
- mandateStatusMap: draft, active, paused, fulfilled, expired, cancelled + Greek equivalents
- mandateUrgencyMap: low, medium, high, critical + Greek equivalents

**Step 3: Add `mandateEnumMappings` object and `normalizeMandateEnums` function**

`mandateEnumMappings` maps scalar enum fields to their maps (status, urgency, timeline, transaction_type, property_type, property_purpose, energy_cert_min, furnished). Reuses existing maps where possible.

`normalizeMandateEnums` function:
1. Normalize scalar enums via `mandateEnumMappings`
2. Split + normalize array enum fields (condition using propertyConditionMap, heating_type using heatingTypeMap)
3. Split non-enum array fields (areas_of_interest, amenities) into string arrays

**Step 4: Commit**

Message: `feat(import): add mandate enum normalizer with array field splitting`

---

### Task 6: Create Mandate Import Config

**Files:**
- Create: `lib/import/mandate-import-config.ts`

**Step 1: Write the mandate config**

Export `mandateImportConfig: ImportEntityConfig<MandateImportData>` with:
- `prismaModel: "mandate"`, `entityIdType: "Mandates"`
- `encryptWithDek`: encrypt `title` and `notes` (matching MANDATE_ENCRYPTED_STRING_FIELDS)
- `toPrismaData`: map all ~35 fields with `toNumber()` helpers for ranges, `toDateTime()` for expires_at, arrays pass through, booleans default to false, `status: "DRAFT"`, `urgency: "MEDIUM"`

Include local `toNumber` and `toDateTime` helpers (same as property config).

**Step 2: Commit**

Message: `feat(import): add mandate import config for unified engine`

---

### Task 7: Update Barrel Exports

**Files:**
- Modify: `lib/import/index.ts`

**Step 1: Add exports for engine, mandate schema, all configs, and new normalizer functions**

Add sections for:
- Mandate import schema exports (mandateImportSchema, mandateImportFieldDefinitions, types)
- Import engine exports (executeImport, ImportEntityConfig, ImportResult, ImportError)
- Entity config exports (clientImportConfig, propertyImportConfig, mandateImportConfig)
- New enum normalizer exports (normalizeMandateEnums, splitArrayField, mandateEnumMappings)

**Step 2: Commit**

Message: `feat(import): update barrel exports with engine, mandate schema, and configs`

---

### Task 8: Refactor Client Import API Route

**Files:**
- Modify: `app/api/crm/clients/import/route.ts`

**Step 1: Replace entire file with thin wrapper**

The new route:
1. Auth: `getCurrentUser()`, `getCurrentOrgId()`
2. Parse body, validate `clients` is non-empty array
3. Call `executeImport(clientImportConfig, clients, organizationId, user.id)`
4. `invalidateCache(["clients:list", "dashboard:accounts-count"])`
5. Return result

Remove all old code: `findAvailableIdWithSuffix`, validation loop, sequential creates.

**Step 2: Commit**

Message: `refactor(import): slim client import route to use unified engine`

---

### Task 9: Refactor Property Import API Route

**Files:**
- Modify: `app/api/mls/properties/import/route.ts`

**Step 1: Replace with thin wrapper**

Same pattern as Task 8: auth with `getCurrentOrgIdSafe`, body key `properties`, `propertyImportConfig`, invalidate `["properties:list"]`.

Remove all old code: `toNumber`, `toDateTime`, `normalizePropertyId`, `findAvailableIdWithSuffix`, validation loop, sequential creates.

**Step 2: Commit**

Message: `refactor(import): slim property import route to use unified engine`

---

### Task 10: Create Mandate Import API Route

**Files:**
- Create: `app/api/mandates/import/route.ts`

**Step 1: Write the route**

Same thin pattern: auth, body key `mandates`, `mandateImportConfig`, invalidate `["mandates:list"]`.

**Step 2: Commit**

Message: `feat(import): add mandate import API route`

---

### Task 11: Add Mandate Translations to Locale Files

**Files:**
- Modify: `locales/en/import.json`
- Modify: `locales/el/import.json`

**Step 1: Add English translations**

In `ImportWizard` section, add: `"titleMandates": "Import Mandates"`

In `ImportFields` section, add `"mandate"` object with:
- `groups`: 8 groups (basic, budget, size, rooms, building, features, location, other)
- `fields`: ~35 field display labels
- `enums`: 10 enum type display values (status, urgency, timeline, transaction_type, property_type, property_purpose, energy_cert_class, condition, heating_type, furnished)

**Step 2: Add Greek translations**

Mirror structure with Greek labels. `titleMandates: "Εισαγωγή Εντολών"`

**Step 3: Commit**

Message: `feat(i18n): add mandate import translations for en and el`

---

### Task 12: Widen ImportWizardSteps entityType

**Files:**
- Modify: `components/import/ImportWizardSteps.tsx:141`

**Step 1: Change `entityType` union**

Line 141, change `"client" | "property"` to `"client" | "property" | "mandate"`

**Step 2: Commit**

Message: `feat(import): widen entityType to include mandate`

---

### Task 13: Create Mandate Import Page and Wizard

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/import/page.tsx`
- Create: `app/[locale]/app/(routes)/mandates/import/components/MandateImportWizard.tsx`

**Step 1: Create page**

Copy pattern from `app/[locale]/app/(routes)/crm/clients/import/page.tsx`:
- Use `importDict.ImportWizard.titleMandates`
- Use `importDict.ImportFields.mandate` for fields dict
- Replace `{entity}` with `"mandates"` in description

**Step 2: Create wizard wrapper**

Copy pattern from `ClientImportWizard.tsx`:
- Import `mandateImportSchema` and `mandateImportFieldDefinitions` from `@/lib/import`
- `entityType="mandate"`
- `fieldsDict={dict.ImportFields.mandate}`
- Fetch endpoint: `/api/mandates/import`
- Body key: `{ mandates: data }`
- Navigate to `/${locale}/app/mandates` on complete/cancel

**Step 3: Commit**

Message: `feat(import): add mandate import page and wizard component`

---

### Task 14: Verify Encryption Export Compatibility

**Files:**
- Possibly modify: `lib/encryption.ts`

**Step 1: Check exports**

Read `lib/encryption.ts` and verify `encryptWithKey` and `isEncrypted` are exported. The configs need these to be importable from `@/lib/encryption`.

If not exported, add `export` keyword. Do NOT modify implementations.

**Step 2: Commit (only if changes needed)**

Message: `fix(encryption): export encryptWithKey and isEncrypted for import engine`

---

### Task 15: Build Verification

**Step 1: Run the build**

Run: `pnpm build 2>&1 | tail -30`

Expected: Build succeeds with no errors.

**Step 2: Fix any type errors**

Common issues to check:
- Missing exports from `lib/encryption.ts`
- Prisma model name: verify if it is `mandate` or `Mandate` in the generated Prisma client (check `prismadb.mandate` vs `prismadb.Mandate`)
- Import path mismatches

**Step 3: Commit any fixes**

Message: `fix(import): resolve build errors in unified import engine`

---

### Task 16: Final Verification

**Step 1: Run `pnpm build` one final time**

Confirm clean build with zero errors.

**Step 2: Run `pnpm lint`**

Fix any lint issues.

**Step 3: Recommend user run `/verify`**

The feature is complete when:
- `pnpm build` passes
- All 3 entity types have import configs
- API routes use the unified engine
- Encryption is applied during import (fixes the existing bug)
- Mandate import has full localization (en + el)
- `ImportWizardSteps` accepts `"mandate"` entity type
