# Unified Import Engine Design

**Date:** 2026-03-07
**Status:** Approved

## Problem

The current import system has three issues:

1. **No encryption on import** — both `/api/crm/clients/import` and `/api/mls/properties/import` write records directly without calling encryption functions. Imported data is stored as plaintext.
2. **Poor performance** — sequential `prisma.create()` calls (one DB round-trip per record) make imports slow. 100 records = 100 round-trips at ~2-5ms each = 200-500ms in network latency alone.
3. **No mandate import** — only clients and properties have import support.

## Non-Functional Requirements

- Import time per 100 items < 200ms (1,000 items in < 2s)
- Properly localized tokens across the entire import system for each entity type

## Solution: Configuration-Driven Import Engine

A single `ImportEngine` in `lib/import/engine.ts` that takes a configuration object per entity type. Three separate entry points (`/crm/clients/import`, `/mls/properties/import`, `/mandates/import`) share the engine underneath.

## Architecture

### Engine Configuration Type

```typescript
interface ImportEntityConfig<T> {
  entityType: "client" | "property" | "mandate";
  prismaModel: "clients" | "properties" | "mandate";
  entityIdType: EntityType; // "Clients" | "Properties" | "Mandates"

  importSchema: z.ZodSchema<T>;
  normalizeEnums: (raw: Record<string, unknown>) => Record<string, unknown>;
  fieldDefinitions: readonly FieldDefinition[];

  encryptWithDek: (data: Record<string, unknown>, dek: Buffer) => Record<string, unknown>;

  toPrismaData: (item: T, friendlyId: string, userId: string, orgId: string) => Record<string, unknown>;

  defaultValues: Record<string, unknown>;
  cacheKeys: string[];
}
```

### Engine Pipeline (4 phases)

```
Phase 1: Validate ──> Phase 2: Generate IDs ──> Phase 3: Encrypt ──> Phase 4: Batch Insert
  (sync, in-memory)     (1 DB round-trip)        (parallel CPU)       (1 createMany call)
```

**Phase 1 — Validate & Normalize** (~5ms per 100 items)
- For each row: `config.normalizeEnums(row)` then `config.importSchema.safeParse()`
- Collect valid items + error details for invalid ones
- No DB calls

**Phase 2 — Batch ID Generation** (~5ms, 1-2 DB queries)
- Auto-generate group: single call to `generateFriendlyIds(prisma, entityType, count, orgId)` — atomic SQL increment
- User-provided IDs: batch `findMany({ where: { friendlyId: { in: [...] } } })` then resolve conflicts in memory

**Phase 3 — Encrypt** (~10ms per 100 items)
- Fetch DEK once: `getOrgDek(orgId)`
- Apply `config.encryptWithDek(data, dek)` to all records via `Promise.all()`
- AES-256-GCM on short strings is microseconds each

**Phase 4 — Batch Insert** (~50-100ms per 100 items)
- Transform via `config.toPrismaData()`
- Single `prisma[model].createMany({ data: [...], skipDuplicates: true })`
- One SQL INSERT with N value tuples
- `invalidateCache(config.cacheKeys)`

**Estimated total: ~70-120ms per 100 items** (within 200ms budget)

### Mandate Import Schema

New file `lib/import/mandate-import-schema.ts`:

**Required:** `title` (min 1 char)

**Array field handling:** Comma-separated strings in CSV cells are split before Zod validation:
- `condition`: `"AUTONOMOUS,CENTRAL"` -> `["AUTONOMOUS", "CENTRAL"]`
- `heating_type`, `amenities`, `areas_of_interest`: same pattern

```typescript
function splitArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}
```

Each element goes through enum normalization individually.

**~35 fields** in 8 groups: basic, budget, size, rooms, building, features, location, other.

### Encryption Integration

The engine fetches the DEK once per batch via `getOrgDek(orgId)`, then uses lower-level `encryptFieldWithKey()` / `encryptJsonWithKey()` helpers. Each config provides an `encryptWithDek` function that accepts a pre-fetched DEK buffer.

This fixes the current bug where imported data bypasses encryption entirely.

### UI & Localization

- `ImportWizardSteps.tsx` `entityType` union extended to include `"mandate"`
- No changes to shared step components (already generic)
- New page + wizard wrapper for mandates
- Translation additions to `locales/{en,el}/import.json`:
  - `ImportWizard.titleMandates`
  - `ImportFields.mandate.groups` (8 groups)
  - `ImportFields.mandate.fields` (~35 labels)
  - `ImportFields.mandate.enums` (10 enum types)

## File Manifest

### New files (7)

| File | Purpose |
|------|---------|
| `lib/import/engine.ts` | Unified import engine |
| `lib/import/mandate-import-schema.ts` | Zod schema + field definitions for mandates |
| `lib/import/mandate-import-config.ts` | Mandate config object |
| `lib/import/client-import-config.ts` | Client config object (extracted from route) |
| `lib/import/property-import-config.ts` | Property config object (extracted from route) |
| `app/[locale]/app/(routes)/mandates/import/page.tsx` | Mandate import page |
| `app/[locale]/app/(routes)/mandates/import/components/MandateImportWizard.tsx` | Mandate wizard wrapper |

### Modified files (7)

| File | Change |
|------|--------|
| `app/api/crm/clients/import/route.ts` | Slim to auth + `executeImport(clientImportConfig)` |
| `app/api/mls/properties/import/route.ts` | Slim to auth + `executeImport(propertyImportConfig)` |
| `app/api/mandates/import/route.ts` | New route, same thin pattern |
| `lib/import/enum-normalizer.ts` | Add `mandateEnumMappings`, `normalizeMandateEnums()`, `splitArrayField()` |
| `lib/import/index.ts` | Export mandate schema, config, and engine |
| `locales/en/import.json` | Add `ImportFields.mandate` + `titleMandates` |
| `locales/el/import.json` | Greek translations |

### Unchanged

- All shared import UI components (already generic)
- `fuzzy-matcher.ts`
- `lib/model-encryption.ts` (we use existing helpers)
- `lib/friendly-id.ts` (`generateFriendlyIds` batch function already exists)

## Side-Effect Fixes

- Imported clients now encrypted (currently stored plaintext)
- Imported properties now encrypted (currently stored plaintext)

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Shared engine, separate entry points (B) | Preserves navigation discoverability, avoids mega-page |
| ID generation | Batch pre-generate with `createMany` (A) | Only path to <200ms; rare race handled by `skipDuplicates` |
| Array fields | Comma-separated in single cell (A) | Standard CSV convention, straightforward parse |
| Encryption | Server-side in API route (A) | Matches existing write paths, no DEK on client |
| Localization | Aliases in code, labels in locale files (A) | Aliases are universal matching dict, labels are locale-dependent |
