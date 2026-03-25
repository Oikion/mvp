# Composite Import System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable property and client CSV imports to automatically create and link Mandates when mandate-related fields are present, then migrate legacy price/transaction_type data off the Properties model.

**Architecture:** A new `composite-engine.ts` orchestrates: partition row into primary + mandate fields → validate primary → insert primary → generate mandate from mandate fields → link via junction table. The existing `engine.ts` is untouched. Two entity-specific composite configs define the field splits and title generation. The schema migration runs as a separate deployment phase after the composite engine ships.

**Tech Stack:** TypeScript, Prisma ORM, Zod validation, React (shadcn/ui), Next.js API routes

**Spec:** `docs/superpowers/specs/2026-03-16-composite-import-design.md`

---

## Deployment Phases

This plan has two independent deployment phases:

- **Phase A (Chunks 1–6):** Composite import engine — no breaking changes, can merge independently
- **Phase B (Chunks 7–9):** Schema migration — removes `price`, `price_type`, `transaction_type` from Properties. Must deploy atomically (Stage A script → Stage B DDL → app code cleanup in the same release)

Phase A MUST merge before Phase B. Phase B depends on Phase A.

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `lib/import/composite-engine.ts` | `CompositeImportConfig` type, `executeCompositeImport()`, `CompositeImportResult` type, `isMandateFieldNonEmpty()` helper |
| `lib/import/property-composite-config.ts` | Property+Mandate composite config: `mandateFields` set, `buildMandateData`, `buildMandateTitle` with price_type→transaction_type inference |
| `lib/import/client-composite-config.ts` | Client+Mandate composite config: `mandateFields` set, `buildMandateData`, `buildMandateTitle` |
| `scripts/migrate-property-prices-to-mandates.ts` | Stage A: data migration script (Phase B) |

### Modified files
| File | Change |
|------|--------|
| `lib/import/property-import-schema.ts` | Move `price`, `price_type`, `transaction_type` field defs from their current groups to a new `"mandate"` group |
| `lib/import/client-import-schema.ts` | Add 15 mandate group field definitions (budget, size, timeline, etc.) |
| `lib/import/index.ts` | Export composite configs, `executeCompositeImport`, `CompositeImportResult` |
| `components/import/ReviewStep.tsx` | Handle `mandate` entityType, display mandate count, fix entity label |
| `components/import/CompleteStep.tsx` | Display `mandatesCreated` count, fix entity label |
| `components/import/ImportWizardSteps.tsx` | Add `mandateCount` to ReviewStep, surface `CompositeImportResult` fields |
| `components/import/TableMappingStep.tsx` | Add contextual banner when mandate fields are mapped |
| `app/api/mls/properties/import/route.ts` | Switch to `executeCompositeImport` |
| `app/api/crm/clients/import/route.ts` | Switch to `executeCompositeImport` |
| `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx` | Pass composite result through |
| `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx` | Pass composite result through |
| `prisma/schema.prisma` | Remove `price`, `price_type`, `transaction_type` from Properties (Phase B) |
| `lib/import/property-import-config.ts` | Remove those 3 fields from `toPrismaData` (Phase B) |

---

## Chunk 1: Composite Engine Core

### Task 1: Create CompositeImportConfig type and CompositeImportResult

**Files:**
- Create: `lib/import/composite-engine.ts`

- [ ] **Step 1: Create composite-engine.ts with types and helper**

```ts
// lib/import/composite-engine.ts
import type { ImportEntityConfig, ImportError } from "./engine";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";
import { mandateImportConfig } from "./mandate-import-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompositeImportResult {
  imported: number;
  skipped: number;
  failed: number;
  mandatesCreated: number;
  linked: number;
  errors: ImportError[];
}

export interface CompositeImportConfig<TPrimary> {
  /** The primary entity config — used for validation, ID type, encryption, toPrismaData */
  primaryConfig: ImportEntityConfig<TPrimary>;
  /** CSV field keys that belong to the mandate, not the primary entity */
  mandateFields: Set<string>;
  /** Build a Mandate prisma record directly — title is plaintext, encrypt step handles it */
  buildMandateData: (
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    orgId: string,
    userId: string
  ) => Record<string, unknown>;
  /** Auto-generate the mandate title from the parsed primary item */
  buildMandateTitle: (primaryItem: TPrimary) => string;
  /** Junction table accessor: "mandate_Properties" | "mandate_Clients" */
  junctionModel: "mandate_Properties" | "mandate_Clients";
  /** FK column name on the junction table pointing to the primary entity */
  junctionForeignKey: "propertyId" | "clientId";
}

type InsertedPrimary = { rowIndex: number; friendlyId: string; uuid: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strict non-empty check — preserves 0 and false as valid values */
export function isMandateFieldNonEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function isCompositeRow(mandateRow: Record<string, unknown>): boolean {
  return Object.values(mandateRow).some(isMandateFieldNonEmpty);
}

/** Normalise a user-provided ID (mirrors engine.ts) */
function normalizeId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve user-provided IDs against DB + in-batch collisions (mirrors engine.ts) */
async function resolveUserProvidedIds(
  ids: string[],
  orgId: string,
  prismaModel: "clients" | "properties" | "mandate"
): Promise<string[]> {
  const model = prismadb[prismaModel] as any;
  const existing: Array<{ friendlyId: string }> = await model.findMany({
    where: { organizationId: orgId, friendlyId: { in: ids } },
    select: { friendlyId: true },
  });
  const existingSet = new Set(existing.map((r: { friendlyId: string }) => r.friendlyId));
  const usedInBatch = new Set<string>();
  const resolved: string[] = [];
  for (const id of ids) {
    let candidate = id;
    let suffix = 1;
    while (existingSet.has(candidate) || usedInBatch.has(candidate)) {
      candidate = `${id}-${suffix}`;
      suffix++;
    }
    usedInBatch.add(candidate);
    resolved.push(candidate);
  }
  return resolved;
}
```

- [ ] **Step 2: Add executeCompositeImport function**

Append to the same file, after the helpers:

```ts
// ---------------------------------------------------------------------------
// Main composite import function
// ---------------------------------------------------------------------------

export async function executeCompositeImport<TPrimary>(
  config: CompositeImportConfig<TPrimary>,
  rows: Record<string, unknown>[],
  orgId: string,
  userId: string
): Promise<CompositeImportResult> {
  const errors: ImportError[] = [];
  const { primaryConfig } = config;

  // ── 1. PARTITION ────────────────────────────────────────────────────────
  const primaryRows: Record<string, unknown>[] = [];
  const mandateRows: Record<string, unknown>[] = [];
  const compositeFlags: boolean[] = [];

  for (const row of rows) {
    const primaryRow: Record<string, unknown> = {};
    const mandateRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (config.mandateFields.has(key)) {
        mandateRow[key] = value;
      } else {
        primaryRow[key] = value;
      }
    }
    primaryRows.push(primaryRow);
    mandateRows.push(mandateRow);
    compositeFlags.push(isCompositeRow(mandateRow));
  }

  // ── 2. VALIDATE ─────────────────────────────────────────────────────────
  const validItems: { index: number; raw: Record<string, unknown>; parsed: TPrimary }[] = [];

  for (let i = 0; i < primaryRows.length; i++) {
    const normalized = primaryConfig.normalizeEnums(primaryRows[i]);
    const result = primaryConfig.importSchema.safeParse(normalized);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: i + 2,
          field: issue.path.join(".") || "unknown",
          error: issue.message,
          value: String(normalized[issue.path[0] as string] ?? ""),
        });
      }
    } else {
      validItems.push({ index: i, raw: normalized, parsed: result.data });
    }
  }

  if (validItems.length === 0) {
    return { imported: 0, skipped: 0, failed: rows.length, mandatesCreated: 0, linked: 0, errors };
  }

  // ── 3. ID GENERATION (primary only) ─────────────────────────────────────
  const withUserId: { idx: number; id: string }[] = [];
  const withoutUserId: number[] = [];

  for (let i = 0; i < validItems.length; i++) {
    const rawId = (validItems[i].parsed as any).id;
    if (rawId && typeof rawId === "string" && rawId.trim()) {
      withUserId.push({ idx: i, id: normalizeId(rawId) });
    } else {
      withoutUserId.push(i);
    }
  }

  const friendlyIds: string[] = new Array(validItems.length);

  if (withUserId.length > 0) {
    const rawIds = withUserId.map((w) => w.id);
    const resolved = await resolveUserProvidedIds(rawIds, orgId, primaryConfig.prismaModel);
    for (let i = 0; i < withUserId.length; i++) {
      friendlyIds[withUserId[i].idx] = resolved[i];
    }
  }

  if (withoutUserId.length > 0) {
    const generated = await generateFriendlyIds(
      prismadb, primaryConfig.entityIdType, withoutUserId.length, orgId
    );
    for (let i = 0; i < withoutUserId.length; i++) {
      friendlyIds[withoutUserId[i]] = generated[i];
    }
  }

  // ── 4. ENCRYPT + BUILD PRIMARY DATA ─────────────────────────────────────
  const dek = await getOrgDek(orgId);
  const primaryDataList = validItems.map((item, i) => {
    const encryptedFields = primaryConfig.encryptWithDek(item.raw, dek);
    return primaryConfig.toPrismaData(item.parsed, encryptedFields, friendlyIds[i], userId, orgId);
  });

  // ── 5. PRIMARY INSERT — individual creates ──────────────────────────────
  const primaryModel = prismadb[primaryConfig.prismaModel] as any;
  const insertedPrimaries: InsertedPrimary[] = [];
  let skipped = 0;

  for (let i = 0; i < primaryDataList.length; i++) {
    try {
      const record = await primaryModel.create({ data: primaryDataList[i] });
      insertedPrimaries.push({
        rowIndex: validItems[i].index,
        friendlyId: friendlyIds[i],
        uuid: record.id,
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        skipped++;
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: validItems[i].index + 2, field: "", error: msg });
      }
    }
  }

  if (insertedPrimaries.length === 0) {
    return {
      imported: 0,
      skipped,
      failed: rows.length - skipped,
      mandatesCreated: 0,
      linked: 0,
      errors,
    };
  }

  // ── 6. MANDATE CREATION (composite rows only) ──────────────────────────
  const compositeInserted = insertedPrimaries.filter((p) => compositeFlags[p.rowIndex]);
  let mandatesCreated = 0;
  let linked = 0;

  if (compositeInserted.length > 0) {
    const mandateFriendlyIds = await generateFriendlyIds(
      prismadb, "Mandates", compositeInserted.length, orgId
    );

    // Build O(1) lookup to avoid O(n²) find() inside the loop
    const validItemsByIndex = new Map(validItems.map((v) => [v.index, v]));
    const mandateUuids: (string | null)[] = [];

    for (let i = 0; i < compositeInserted.length; i++) {
      const rowIdx = compositeInserted[i].rowIndex;
      const parsedItem = validItemsByIndex.get(rowIdx)!.parsed;

      let title = config.buildMandateTitle(parsedItem);
      if (!title || title.trim() === "") title = "Mandate";

      const mandateRow = mandateRows[rowIdx];
      const mandateData = config.buildMandateData(
        mandateRow, title, mandateFriendlyIds[i], orgId, userId
      );

      // Encrypt mandate fields (title, notes) using the SAME dek
      const encryptedMandateFields = mandateImportConfig.encryptWithDek(mandateData, dek);
      const finalMandateData = { ...mandateData, ...encryptedMandateFields };

      try {
        const record = await prismadb.mandate.create({ data: finalMandateData as any });
        mandateUuids.push(record.id);
        mandatesCreated++;
      } catch (err) {
        mandateUuids.push(null);
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowIdx + 2, field: "mandate", error: `Mandate creation failed: ${msg}` });
      }
    }

    // ── 7. LINK ─────────────────────────────────────────────────────────────
    const junctionModel = prismadb[config.junctionModel] as any;

    for (let i = 0; i < compositeInserted.length; i++) {
      const mandateUuid = mandateUuids[i];
      if (!mandateUuid) continue;

      const junctionRow = {
        mandateId: mandateUuid,
        [config.junctionForeignKey]: compositeInserted[i].uuid,
      };

      try {
        await junctionModel.create({ data: junctionRow });
        linked++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          row: compositeInserted[i].rowIndex + 2,
          field: "junction",
          error: `Link failed (mandate exists but unlinked): ${msg}`,
        });
      }
    }
  }

  // ── 8. RETURN ────────────────────────────────────────────────────────────
  return {
    imported: insertedPrimaries.length,
    skipped,
    failed: rows.length - validItems.length + (validItems.length - insertedPrimaries.length - skipped),
    mandatesCreated,
    linked,
    errors,
  };
}
```

- [ ] **Step 3: Verify file compiles**

Run: `npx tsc --noEmit lib/import/composite-engine.ts 2>&1 | head -20`

Expected: No errors (or only ambient import issues that resolve in full build)

- [ ] **Step 4: Commit**

```bash
git add lib/import/composite-engine.ts
git commit -m "feat(import): add composite import engine with mandate auto-creation"
```

---

## Chunk 2: Property Composite Config

### Task 2: Create property composite config

**Files:**
- Create: `lib/import/property-composite-config.ts`

- [ ] **Step 1: Create the property composite config**

The key logic: `price` → `budget_min` AND `budget_max`. `price_type` is used ONLY as a fallback to infer `transaction_type` when it's absent. `price_type` is never stored.

```ts
// lib/import/property-composite-config.ts
import type { CompositeImportConfig } from "./composite-engine";
import { propertyImportConfig } from "./property-import-config";
import type { PropertyImportData } from "./property-import-schema";
import { normalizeEnumValue } from "./enum-normalizer";

// Canonical enum maps for normalization (handles Greek, aliases, case variants)
// These are inline rather than imported from enum-normalizer to keep the
// dependency explicit — they map raw user input to valid Prisma enum values.
const transactionTypeMap: Record<string, string> = {
  sale: "SALE", "for sale": "SALE", "πώληση": "SALE", "polisi": "SALE",
  rental: "RENTAL", rent: "RENTAL", "ενοικίαση": "RENTAL", "enoikiasi": "RENTAL",
  "short_term": "SHORT_TERM", "short term": "SHORT_TERM", "βραχυχρόνια": "SHORT_TERM",
  exchange: "EXCHANGE", "ανταλλαγή": "EXCHANGE",
  auction: "AUCTION", "πλειστηριασμός": "AUCTION",
};

const priceTypeMap: Record<string, string> = {
  sale: "SALE", rental: "RENTAL", rent: "RENTAL", monthly: "RENTAL",
  "per_acre": "PER_ACRE", "per acre": "PER_ACRE",
  "per_sqm": "PER_SQM", "per sqm": "PER_SQM", "ανά τμ": "PER_SQM",
};

// The PriceType → TransactionType inference map (spec §3)
const PRICE_TYPE_TO_TRANSACTION: Record<string, string | null> = {
  SALE: "SALE",
  RENTAL: "RENTAL",
  PER_ACRE: null,
  PER_SQM: null,
};

// Title prefix per transaction type
const TRANSACTION_TITLE_PREFIX: Record<string, string> = {
  SALE: "Sale mandate for",
  RENTAL: "Rental mandate for",
  SHORT_TERM: "Short-term mandate for",
  EXCHANGE: "Exchange mandate for",
  AUCTION: "Auction mandate for",
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export const propertyCompositeConfig: CompositeImportConfig<PropertyImportData> = {
  primaryConfig: propertyImportConfig,

  mandateFields: new Set(["price", "price_type", "transaction_type"]),

  buildMandateTitle(primaryItem: PropertyImportData): string {
    // transaction_type is on the mandate row, not the primary — we resolve
    // it in buildMandateData and override the title there.
    return `Mandate for ${primaryItem.property_name || "property"}`;
  },

  buildMandateData(
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    orgId: string,
    userId: string
  ): Record<string, unknown> {
    const rawPrice = toNumber(mandateRow.price);

    // Normalize enum values through the canonical maps (handles Greek, aliases, case)
    // normalizeEnumValue returns the canonical Prisma enum string or null
    const normalizedTxType = normalizeEnumValue(
      mandateRow.transaction_type as string | null | undefined,
      transactionTypeMap
    );
    const normalizedPriceType = normalizeEnumValue(
      mandateRow.price_type as string | null | undefined,
      priceTypeMap
    );

    // Resolve transaction_type: direct value takes precedence, price_type is fallback
    let transactionType: string | null = normalizedTxType;
    if (!transactionType && normalizedPriceType) {
      transactionType = PRICE_TYPE_TO_TRANSACTION[normalizedPriceType] ?? null;
    }

    // Override title with transaction-specific prefix if resolved
    let title = mandateTitle;
    if (transactionType && TRANSACTION_TITLE_PREFIX[transactionType]) {
      const propertyName = mandateTitle.replace(/^Mandate for /, "");
      title = `${TRANSACTION_TITLE_PREFIX[transactionType]} ${propertyName}`;
    }

    return {
      id: crypto.randomUUID(),
      friendlyId: mandateFriendlyId,
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,
      // Title as plaintext — encrypt step handles it
      title,
      transaction_type: transactionType,
      // price → both budget_min AND budget_max (fixed asking price)
      budget_min: rawPrice,
      budget_max: rawPrice,
      status: "ACTIVE",
      visibility: "PRIVATE",
      draft_status: false,
    };
  },

  junctionModel: "mandate_Properties",
  junctionForeignKey: "propertyId",
};
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit lib/import/property-composite-config.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add lib/import/property-composite-config.ts
git commit -m "feat(import): add property composite config with price→budget mapping"
```

---

## Chunk 3: Client Composite Config

### Task 3: Create client composite config

**Files:**
- Create: `lib/import/client-composite-config.ts`

- [ ] **Step 1: Create the client composite config**

15 mandate fields from the spec. `bathrooms_min`/`bathrooms_max` need `Math.floor()` per spec note.

```ts
// lib/import/client-composite-config.ts
import type { CompositeImportConfig } from "./composite-engine";
import { clientImportConfig } from "./client-import-config";
import type { ClientImportData } from "./client-import-schema";
import { normalizeMandateEnums, splitArrayField } from "./enum-normalizer";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toInt(value: unknown): number | null {
  const n = toNumber(value);
  return n !== null ? Math.floor(n) : null;
}

function toDateTime(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export const clientCompositeConfig: CompositeImportConfig<ClientImportData> = {
  primaryConfig: clientImportConfig,

  mandateFields: new Set([
    "transaction_type",
    "property_type",
    "property_purpose",
    "budget_min",
    "budget_max",
    "timeline",
    "urgency",
    "size_min_sqm",
    "size_max_sqm",
    "bedrooms_min",
    "bedrooms_max",
    "areas_of_interest",
    "municipality",
    "region",
    "expires_at",
    "notes",
  ]),

  buildMandateTitle(primaryItem: ClientImportData): string {
    return `Mandate for ${primaryItem.client_name || "client"}`;
  },

  buildMandateData(
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    orgId: string,
    userId: string
  ): Record<string, unknown> {
    // Normalize mandate enums for enum fields
    const normalized = normalizeMandateEnums(mandateRow);

    // Handle areas_of_interest as comma-split array
    const areasRaw = normalized.areas_of_interest;
    const areas = typeof areasRaw === "string" ? splitArrayField(areasRaw) : areasRaw;

    return {
      id: crypto.randomUUID(),
      friendlyId: mandateFriendlyId,
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,
      // Title as plaintext — encrypt step handles it
      title: mandateTitle,
      // Enums
      transaction_type: normalized.transaction_type || null,
      property_type: normalized.property_type || null,
      property_purpose: normalized.property_purpose || null,
      urgency: normalized.urgency || "MEDIUM",
      timeline: normalized.timeline || null,
      // Budget
      budget_min: toNumber(normalized.budget_min),
      budget_max: toNumber(normalized.budget_max),
      // Size
      size_min_sqm: toNumber(normalized.size_min_sqm),
      size_max_sqm: toNumber(normalized.size_max_sqm),
      // Rooms — Int? fields need Math.floor() per spec
      bedrooms_min: toInt(normalized.bedrooms_min),
      bedrooms_max: toInt(normalized.bedrooms_max),
      // Location
      municipality: normalized.municipality || null,
      region: normalized.region || null,
      areas_of_interest: areas || null,
      // Notes — plaintext, encrypt step handles it
      notes: normalized.notes || null,
      // Date
      expires_at: toDateTime(normalized.expires_at),
      // Defaults
      status: "ACTIVE",
      visibility: "PRIVATE",
      draft_status: false,
    };
  },

  junctionModel: "mandate_Clients",
  junctionForeignKey: "clientId",
};
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit lib/import/client-composite-config.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add lib/import/client-composite-config.ts
git commit -m "feat(import): add client composite config with 15 mandate fields"
```

---

## Chunk 4: Schema Field Definitions + Exports

### Task 4: Add mandate group field definitions to property schema

**Files:**
- Modify: `lib/import/property-import-schema.ts:246-253` (move transaction_type, price, price_type to mandate group)

- [ ] **Step 1: Move 3 field definitions to mandate group**

In `lib/import/property-import-schema.ts`, change the `group` for the existing field definitions for `transaction_type`, `price`, and `price_type` from their current groups to `"mandate"`:

Find the `transaction_type` field def (~line 248) and change `group: "classification"` → `group: "mandate"`.
Find the `price` field def (~line 321) and change `group: "pricing"` → `group: "mandate"`.
Find the `price_type` field def (~line 328) and change `group: "pricing"` → `group: "mandate"`.

This is a field definition group change only — the Zod schema fields remain unchanged (they're still valid property fields until Phase B removes them).

- [ ] **Step 2: Commit**

```bash
git add lib/import/property-import-schema.ts
git commit -m "feat(import): move price/transaction_type field defs to mandate group"
```

### Task 5: Add mandate group field definitions to client schema

**Files:**
- Modify: `lib/import/client-import-schema.ts` (add 15 mandate field definitions after existing definitions)

- [ ] **Step 1: Add mandate group field definitions**

Append the following field definitions to the `clientImportFieldDefinitions` array, before the closing `] as const;`:

```ts
  // ── Mandate Info (composite import — creates a linked Mandate) ──
  {
    key: "transaction_type",
    required: false,
    group: "mandate",
    aliases: ["transaction", "deal_type", "typos_synallagis"],
    description: "Mandate transaction type (SALE, RENTAL, etc.)",
  },
  {
    key: "property_type",
    required: false,
    group: "mandate",
    aliases: ["desired_type", "typos_akinitiou"],
    description: "Desired property type",
  },
  {
    key: "property_purpose",
    required: false,
    group: "mandate",
    aliases: ["purpose", "skopos"],
    description: "Property purpose (RESIDENTIAL, COMMERCIAL, etc.)",
  },
  {
    key: "budget_min",
    required: false,
    group: "mandate",
    aliases: ["min_budget", "elachisto_budget", "budget_from"],
    description: "Minimum budget (EUR)",
  },
  {
    key: "budget_max",
    required: false,
    group: "mandate",
    aliases: ["max_budget", "megisto_budget", "budget_to"],
    description: "Maximum budget (EUR)",
  },
  {
    key: "timeline",
    required: false,
    group: "mandate",
    aliases: ["timeframe", "chronodiagramma"],
    description: "Timeline (IMMEDIATE, ONE_THREE_MONTHS, etc.)",
  },
  {
    key: "urgency",
    required: false,
    group: "mandate",
    aliases: ["priority", "epeigousa", "proteraiotita"],
    description: "Urgency level (LOW, MEDIUM, HIGH, CRITICAL)",
  },
  {
    key: "size_min_sqm",
    required: false,
    group: "mandate",
    aliases: ["min_size", "min_sqm", "elachisto_emvadon"],
    description: "Minimum size (sq.m.)",
  },
  {
    key: "size_max_sqm",
    required: false,
    group: "mandate",
    aliases: ["max_size", "max_sqm", "megisto_emvadon"],
    description: "Maximum size (sq.m.)",
  },
  {
    key: "bedrooms_min",
    required: false,
    group: "mandate",
    aliases: ["min_bedrooms", "min_beds", "elachista_ypnodomatia"],
    description: "Minimum bedrooms",
  },
  {
    key: "bedrooms_max",
    required: false,
    group: "mandate",
    aliases: ["max_bedrooms", "max_beds", "megista_ypnodomatia"],
    description: "Maximum bedrooms",
  },
  {
    key: "areas_of_interest",
    required: false,
    group: "mandate",
    aliases: ["areas", "perioxes", "locations", "neighborhoods"],
    description: "Areas of interest (comma-separated)",
  },
  {
    key: "municipality",
    required: false,
    group: "mandate",
    aliases: ["dimos", "mandate_municipality"],
    description: "Target municipality",
  },
  {
    key: "region",
    required: false,
    group: "mandate",
    aliases: ["perifereia", "mandate_region"],
    description: "Target region",
  },
  {
    key: "expires_at",
    required: false,
    group: "mandate",
    aliases: ["expiry", "expiration", "lixi", "imerominia_lixis"],
    description: "Mandate expiration date",
  },
  {
    key: "notes",
    required: false,
    group: "mandate",
    aliases: ["mandate_notes", "client_notes", "simeioseis_entolis"],
    description: "Mandate notes",
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/import/client-import-schema.ts
git commit -m "feat(import): add 15 mandate group field definitions to client schema"
```

### Task 6: Update barrel exports

**Files:**
- Modify: `lib/import/index.ts`

- [ ] **Step 1: Add composite exports to index.ts**

Append these exports:

```ts
// Composite import engine
export {
  executeCompositeImport,
  isMandateFieldNonEmpty,
  type CompositeImportConfig,
  type CompositeImportResult,
} from "./composite-engine";

// Composite entity configs
export { propertyCompositeConfig } from "./property-composite-config";
export { clientCompositeConfig } from "./client-composite-config";
```

- [ ] **Step 2: Commit**

```bash
git add lib/import/index.ts
git commit -m "feat(import): export composite engine and configs from barrel"
```

---

## Chunk 5: UI Changes

### Task 7: Update ReviewStep for composite results

**Files:**
- Modify: `components/import/ReviewStep.tsx`

- [ ] **Step 1: Fix entity label and add mandate entity support**

In `ReviewStep.tsx`, replace line 41:
```ts
const entityLabel = entityType === "client" ? "clients" : "properties";
```
with:
```ts
const entityLabel =
  entityType === "client" ? "clients" :
  entityType === "mandate" ? "mandates" : "properties";
```

- [ ] **Step 2: Fix display columns for mandate entity**

Replace lines 44-47 (the `displayColumns` assignment):
```ts
const displayColumns =
  entityType === "client"
    ? ["client_name", "primary_email", "primary_phone", "client_type", "client_status"]
    : entityType === "mandate"
    ? ["title", "transaction_type", "budget_min", "budget_max", "status"]
    : ["property_name", "property_type", "price", "address_city", "property_status"];
```

- [ ] **Step 3: Add mandateCount prop and mandate count display**

Add `mandateCount?: number` to the `ReviewStepProps` interface.

After the "Ready to Import Summary" Card (after the closing `</Card>` around line 84), add:

```tsx
{/* Mandate creation notice */}
{mandateCount != null && mandateCount > 0 && (
  <Card className="border-primary/30 bg-primary/10">
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/15">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold">
            {mandateCount} Mandates will be created and linked
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Fix "Import Stats" entity label (line 156)**

Replace:
```ts
{entityType === "client" ? "Clients" : "Properties"} to import
```
with:
```ts
{entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} to import
```

- [ ] **Step 5: Commit**

```bash
git add components/import/ReviewStep.tsx
git commit -m "feat(import): update ReviewStep for mandate entity type and composite counts"
```

### Task 8: Update CompleteStep for composite results

**Files:**
- Modify: `components/import/CompleteStep.tsx`

- [ ] **Step 1: Fix entity label**

Replace line 35:
```ts
const entityLabel = entityType === "client" ? "clients" : "properties";
```
with:
```ts
const entityLabel =
  entityType === "client" ? "clients" :
  entityType === "mandate" ? "mandates" : "properties";
```

- [ ] **Step 2: Add mandatesCreated and skipped displays**

Since `ImportResult` in `ImportWizardSteps.tsx` now has optional `mandatesCreated?: number` and `linked?: number` (from Task 9), `CompleteStep` can access them directly. Add after the result stats grid (after the closing `</div>` of the grid around line 118):

```tsx
{/* Mandate creation stats (composite import) */}
{result && result.mandatesCreated != null && result.mandatesCreated > 0 && (
  <Card className="border-primary/50">
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/15">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">
            {result.mandatesCreated}
          </p>
          <p className="text-xs text-muted-foreground">Mandates created & linked</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{/* Skipped rows notice (re-import of existing records) */}
{result && result.skipped > 0 && (
  <Alert className="border-warning/30 bg-warning/10">
    <AlertTriangle className="h-4 w-4 text-warning" />
    <AlertDescription className="text-warning dark:text-warning">
      {result.skipped} row(s) already existed and were skipped.
    </AlertDescription>
  </Alert>
)}
```

Add imports for `Alert`, `AlertDescription` from `@/components/ui/alert` and `AlertTriangle` from `lucide-react` (AlertTriangle is already imported).

- [ ] **Step 3: Commit**

```bash
git add components/import/CompleteStep.tsx
git commit -m "feat(import): update CompleteStep with mandate creation stats"
```

### Task 9: Update ImportWizardSteps for composite results

**Files:**
- Modify: `components/import/ImportWizardSteps.tsx`

This task has three sub-problems:
1. Extend `ImportResult` type with optional composite fields
2. Aggregate `mandatesCreated`/`linked` across batches
3. Compute `mandateCount` for the ReviewStep preview

- [ ] **Step 1: Extend ImportResult and add mandateFieldKeys prop**

In `components/import/ImportWizardSteps.tsx`:

Add `mandateFieldKeys?: Set<string>` to `ImportWizardStepsProps` interface (~line 140).

Extend the `ImportResult` interface (~line 133) with optional composite fields. Note: both `ValidationError` (client-side) and `ImportError` (server-side, from `engine.ts`) have the same shape `{ row, field, error, value? }` so they are structurally compatible — no type adapter needed:
```ts
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: ValidationError[];
  mandatesCreated?: number;
  linked?: number;
}
```

- [ ] **Step 2: Update handleImport to aggregate composite fields**

In `handleImport` (~line 295), update the `aggregated` initial value:
```ts
const aggregated: ImportResult = {
  imported: 0,
  skipped: 0,
  failed: 0,
  errors: [],
  mandatesCreated: 0,
  linked: 0,
};
```

In the batch aggregation loop (~line 320), add after `aggregated.failed += result.failed;`:
```ts
aggregated.mandatesCreated! += result.mandatesCreated || 0;
aggregated.linked! += result.linked || 0;
```

- [ ] **Step 3: Add mandateCount memo**

Add this import at the top:
```ts
import { isMandateFieldNonEmpty } from "@/lib/import/composite-engine";
```

Add the memo after the `fieldDefinitionsWithAliases` memo. IMPORTANT: Use `parsedData` + `fieldMapping` (NOT `validData`) because Zod strips unknown keys from validated data, so mandate fields would be lost for client imports:

```ts
const mandateCount = useMemo(() => {
  if (!mandateFieldKeys || mandateFieldKeys.size === 0) return 0;
  // Find which CSV columns map to mandate fields
  const mandateCsvCols = Object.entries(fieldMapping)
    .filter(([, target]) => mandateFieldKeys.has(target))
    .map(([csvCol]) => csvCol);
  if (mandateCsvCols.length === 0) return 0;
  // Count raw parsed rows that have at least one non-empty mandate field
  return parsedData.filter((row) =>
    mandateCsvCols.some((col) => isMandateFieldNonEmpty(row[col]))
  ).length;
}, [parsedData, fieldMapping, mandateFieldKeys]);
```

- [ ] **Step 4: Pass mandateCount to ReviewStep**

In `renderStep()`, case 3 (ReviewStep), add the `mandateCount` prop:
```tsx
<ReviewStep
  dict={dict.review}
  fieldsDict={fieldsDict}
  data={validData}
  fieldMapping={fieldMapping}
  errorCount={validationErrors.length > 0 ? parsedData.length - validData.length : 0}
  entityType={entityType}
  mandateCount={mandateCount}
/>
```

- [ ] **Step 5: Commit**

```bash
git add components/import/ImportWizardSteps.tsx
git commit -m "feat(import): extend ImportResult for composite fields, fix batch aggregation"
```

### Task 10: Add contextual banner to TableMappingStep

**Files:**
- Modify: `components/import/TableMappingStep.tsx`

- [ ] **Step 1: Read TableMappingStep.tsx to understand its structure**

Read `components/import/TableMappingStep.tsx` to find where to add the banner.

- [ ] **Step 2: Add mandate mapping banner**

At the top of the component's return JSX (inside the first `<div>`), add a conditional banner:

```tsx
{/* Contextual banner when mandate fields are mapped */}
{(() => {
  const mandateMapped = Object.values(fieldMapping).some((target) => {
    const def = fieldDefinitions.find((f) => f.key === target);
    return def?.group === "mandate";
  });
  if (!mandateMapped) return null;
  return (
    <Alert className="mb-4 border-primary/30 bg-primary/5">
      <AlertDescription className="text-sm">
        Columns mapped to <strong>Mandate Info</strong> will automatically create and link a Mandate for each row.
      </AlertDescription>
    </Alert>
  );
})()}
```

Add the needed imports: `Alert`, `AlertDescription` from `@/components/ui/alert`.

- [ ] **Step 3: Commit**

```bash
git add components/import/TableMappingStep.tsx
git commit -m "feat(import): add contextual banner when mandate fields are mapped"
```

---

## Chunk 6: API Routes + Wizard Wrappers

### Task 11: Switch property import API to composite engine

**Files:**
- Modify: `app/api/mls/properties/import/route.ts`

- [ ] **Step 1: Replace executeImport with executeCompositeImport**

Replace the entire file content:

```ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeCompositeImport } from "@/lib/import";
import { propertyCompositeConfig } from "@/lib/import/property-composite-config";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { properties } = body;

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: "No properties provided for import" },
        { status: 400 }
      );
    }

    const result = await executeCompositeImport(
      propertyCompositeConfig,
      properties,
      organizationId,
      user.id
    );

    await invalidateCache(["properties:list", "mandates:list"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import properties" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/mls/properties/import/route.ts
git commit -m "feat(import): switch property import API to composite engine"
```

### Task 12: Switch client import API to composite engine

**Files:**
- Modify: `app/api/crm/clients/import/route.ts`

- [ ] **Step 1: Replace executeImport with executeCompositeImport**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeCompositeImport } from "@/lib/import";
import { clientCompositeConfig } from "@/lib/import/client-composite-config";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { clients } = body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { error: "No clients provided for import" },
        { status: 400 }
      );
    }

    const result = await executeCompositeImport(
      clientCompositeConfig,
      clients,
      organizationId,
      user.id
    );

    await invalidateCache(["clients:list", "dashboard:accounts-count", "mandates:list"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import clients" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/crm/clients/import/route.ts
git commit -m "feat(import): switch client import API to composite engine"
```

### Task 13: Update PropertyImportWizard to pass mandateFieldKeys and composite result

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`

- [ ] **Step 1: Import composite config and pass mandateFieldKeys**

Add import:
```ts
import { propertyCompositeConfig } from "@/lib/import/property-composite-config";
```

- [ ] **Step 2: Update handleImport to pass through composite result fields**

In `handleImport`, update the return statement (~line 131) to include composite fields. Use `?? 0` (nullish coalescing) not `|| 0` to avoid collapsing valid zeroes:
```ts
return {
  imported: result.imported ?? 0,
  skipped: result.skipped ?? 0,
  failed: result.failed ?? 0,
  errors: result.errors ?? [],
  mandatesCreated: result.mandatesCreated ?? 0,
  linked: result.linked ?? 0,
};
```

Also update the error fallback return (~line 140) to include `mandatesCreated: 0, linked: 0`.

- [ ] **Step 3: Add mandateFieldKeys prop to JSX**

```tsx
<ImportWizardSteps
  entityType="property"
  dict={dict.ImportWizard}
  fieldsDict={dict.ImportFields.property}
  schema={propertyImportSchema}
  fieldDefinitions={propertyImportFieldDefinitions}
  normalizeRow={normalizePropertyEnums}
  onImport={handleImport}
  onComplete={handleComplete}
  onCancel={handleCancel}
  viewUrl={`/${locale}/app/mls`}
  mandateFieldKeys={propertyCompositeConfig.mandateFields}
/>
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx
git commit -m "feat(import): pass mandateFieldKeys and composite result in PropertyImportWizard"
```

### Task 14: Update ClientImportWizard to pass mandateFieldKeys and composite result

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`

- [ ] **Step 1: Import composite config**

Add import:
```ts
import { clientCompositeConfig } from "@/lib/import/client-composite-config";
```

- [ ] **Step 2: Update handleImport to pass through composite result fields**

Same pattern as Task 13: update the return statement to include `mandatesCreated` and `linked`.

- [ ] **Step 3: Add mandateFieldKeys prop to JSX**

```tsx
<ImportWizardSteps
  entityType="client"
  dict={dict.ImportWizard}
  fieldsDict={dict.ImportFields.client}
  schema={clientImportSchema}
  fieldDefinitions={clientImportFieldDefinitions}
  normalizeRow={normalizeClientEnums}
  onImport={handleImport}
  onComplete={handleComplete}
  onCancel={handleCancel}
  viewUrl={`/${locale}/app/crm`}
  mandateFieldKeys={clientCompositeConfig.mandateFields}
/>
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx
git commit -m "feat(import): pass mandateFieldKeys and composite result in ClientImportWizard"
```

### Task 15: Add "Mandate Info" group label to translation files

**Files:**
- Modify: `locales/en/import.json` (at JSON path `ImportFields`) and `locales/el/import.json`

- [ ] **Step 1: Read the translation files to understand structure**

Read `locales/en/import.json` and `locales/el/import.json`. The relevant section is under the `ImportFields` key, with sub-keys `property` and `client`, each containing `groups` and `fields`.

- [ ] **Step 2: Add "mandate" group and field labels**

In `locales/en/import.json`:
- At path `ImportFields.property.groups`, add: `"mandate": "Mandate Info"`
- At path `ImportFields.property.fields`, ensure `price`, `price_type`, `transaction_type` have labels (they should already exist).
- At path `ImportFields.client.groups`, add: `"mandate": "Mandate Info"`
- At path `ImportFields.client.fields`, add labels for all 15 mandate fields: `transaction_type`, `property_type`, `property_purpose`, `budget_min`, `budget_max`, `timeline`, `urgency`, `size_min_sqm`, `size_max_sqm`, `bedrooms_min`, `bedrooms_max`, `areas_of_interest`, `municipality`, `region`, `expires_at`, `notes`.

Repeat for `locales/el/import.json` with Greek translations.

- [ ] **Step 3: Remove `"notes"` alias from client `description` field definition**

In `lib/import/client-import-schema.ts`, find the `description` field definition (~line 362) and remove `"notes"` from its aliases array to avoid auto-mapping ambiguity with the new `notes` mandate field:
```ts
// Before: aliases: ["notes", "comments", "remarks", "perigrafi", "simeioseis"],
// After:  aliases: ["comments", "remarks", "perigrafi", "simeioseis"],
```

- [ ] **Step 4: Commit**

```bash
git add locales/en/import.json locales/el/import.json lib/import/client-import-schema.ts
git commit -m "feat(i18n): add Mandate Info group and field labels for composite import"
```

### Task 16: Build verification

- [ ] **Step 1: Run full build to verify Phase A**

Run: `pnpm build 2>&1 | tail -30`

Expected: Build succeeds. All existing property/client imports still work with the composite engine (backward compatible — rows with no mandate fields create only the primary entity).

- [ ] **Step 2: Commit any fixes if needed**

---

## Phase B: Schema Migration (Chunks 7–9)

> **IMPORTANT:** Phase B MUST NOT be started until Phase A is merged and deployed. All changes in Phase B must deploy atomically.

---

## Chunk 7: Stage A — Data Migration Script

### Task 17: Create data migration script

**Files:**
- Create: `scripts/migrate-property-prices-to-mandates.ts`

- [ ] **Step 1: Create the migration script**

```ts
// scripts/migrate-property-prices-to-mandates.ts
//
// Stage A: Migrate existing property price/transaction_type data to Mandate records.
// Run ONCE before the Prisma schema migration (Stage B).
// Idempotent: safe to re-run after partial failure.
//
// Usage: npx tsx scripts/migrate-property-prices-to-mandates.ts

import { prismadb } from "../lib/prisma";
import { generateFriendlyIds } from "../lib/friendly-id";
import { getOrgDek } from "../lib/key-management";
import { encryptWithKey } from "../lib/encryption";

const TRANSACTION_TITLE_PREFIX: Record<string, string> = {
  SALE: "Sale mandate for",
  RENTAL: "Rental mandate for",
  SHORT_TERM: "Short-term mandate for",
  EXCHANGE: "Exchange mandate for",
  AUCTION: "Auction mandate for",
};

async function main() {
  console.log("Stage A: Migrating property prices to mandates...\n");

  // 1. Find properties that already have a linked mandate (idempotency guard)
  const existingLinks = await prismadb.mandate_Properties.findMany({
    select: { propertyId: true },
  });
  const alreadyLinked = new Set(existingLinks.map((l) => l.propertyId));
  console.log(`Found ${alreadyLinked.size} properties already linked to mandates (will skip).`);

  // 2. Find properties with price or transaction_type that are NOT already linked
  const allCandidates = await prismadb.properties.findMany({
    where: {
      OR: [
        { price: { not: null } },
        { transaction_type: { not: null } },
      ],
    },
    select: {
      id: true,
      property_name: true,
      price: true,
      price_type: true,
      transaction_type: true,
      organizationId: true,
    },
  });

  const properties = allCandidates.filter((p) => !alreadyLinked.has(p.id));
  console.log(`Found ${properties.length} properties to migrate.\n`);

  if (properties.length === 0) {
    console.log("Nothing to migrate. Done.");
    return;
  }

  // 3. Group by organizationId
  const byOrg = new Map<string, typeof properties>();
  for (const p of properties) {
    const group = byOrg.get(p.organizationId) || [];
    group.push(p);
    byOrg.set(p.organizationId, group);
  }

  let totalCreated = 0;

  for (const [orgId, orgProperties] of byOrg) {
    console.log(`Org ${orgId}: ${orgProperties.length} properties`);

    // Fetch org DEK for title encryption — mandate titles MUST be encrypted
    // to maintain the encryption invariant (all other paths encrypt title)
    const dek = await getOrgDek(orgId);

    // Generate mandate friendlyIds OUTSIDE the transaction
    const friendlyIds = await generateFriendlyIds(
      prismadb,
      "Mandates",
      orgProperties.length,
      orgId
    );

    // Build mandate + junction data
    const mandateData: any[] = [];
    const junctionData: any[] = [];

    for (let i = 0; i < orgProperties.length; i++) {
      const p = orgProperties[i];
      const mandateId = crypto.randomUUID();

      // Determine title (plaintext first, then encrypt)
      const txType = p.transaction_type;
      const prefix = txType ? TRANSACTION_TITLE_PREFIX[txType] : null;
      const plaintextTitle = prefix
        ? `${prefix} ${p.property_name || "property"}`
        : `Mandate for ${p.property_name || "property"}`;

      // Encrypt title using org DEK (matches mandate-import-config encryption)
      const encryptedTitle = encryptWithKey(plaintextTitle, dek);

      mandateData.push({
        id: mandateId,
        friendlyId: friendlyIds[i],
        title: encryptedTitle,
        transaction_type: txType || null,
        budget_min: p.price,
        budget_max: p.price,
        organizationId: orgId,
        createdBy: null,
        updatedBy: null,
        status: "ACTIVE",
        visibility: "PRIVATE",
        draft_status: false,
      });

      junctionData.push({
        mandateId,
        propertyId: p.id,
      });
    }

    // Insert inside a transaction for atomicity
    // timeout: 60s to handle large orgs (default 5s is too short for 1000+ records)
    await prismadb.$transaction(async (tx) => {
      await tx.mandate.createMany({ data: mandateData, skipDuplicates: true });
      await tx.mandate_Properties.createMany({ data: junctionData, skipDuplicates: true });
    }, { timeout: 60000 });

    totalCreated += orgProperties.length;
    console.log(`  Created ${orgProperties.length} mandates + junctions.`);
  }

  console.log(`\nDone. Created ${totalCreated} mandates total.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prismadb.$disconnect());
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-property-prices-to-mandates.ts
git commit -m "feat(migration): add Stage A script — migrate property prices to mandates"
```

---

## Chunk 8: Stage B — Prisma Schema Migration

### Task 18: Remove 3 fields from Properties model

**Files:**
- Modify: `prisma/schema.prisma:673,717,723`

- [ ] **Step 1: Remove fields from Prisma schema**

In `prisma/schema.prisma`, remove these three lines from the `Properties` model:
- Line 673: `price                  Decimal?`
- Line 717: `price_type             PriceType?`
- Line 723: `transaction_type       TransactionType?`

**IMPORTANT: Do NOT remove the `PriceType` enum itself** — only remove the column from the `Properties` model. The `PriceType` enum is still used by `property-composite-config.ts` for `price_type` → `transaction_type` inference during composite imports. The `TransactionType` enum is used by the Mandate model and must also be retained.

- [ ] **Step 2: Generate migration**

Run: `pnpm db:migrate --name remove_price_fields_from_properties`

Expected: Migration SQL drops the three columns.

- [ ] **Step 3: Regenerate Prisma client**

Run: `pnpm prisma generate`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "chore(schema): remove price, price_type, transaction_type from Properties"
```

---

## Chunk 9: Application Layer Cleanup (Phase B)

### Task 19: Remove 3 fields from property-import-config toPrismaData

**Files:**
- Modify: `lib/import/property-import-config.ts:79,93-94`

CRITICAL: This MUST ship in the same deployment as Task 18.

- [ ] **Step 1: Remove from toPrismaData**

Remove these lines from `toPrismaData`:
```ts
transaction_type: item.transaction_type || null,   // ~line 79
price: toNumber(item.price),                       // ~line 93
price_type: item.price_type || null,               // ~line 94
```

- [ ] **Step 2: Remove from property-import-schema.ts Zod schema**

Remove these three Zod fields from `propertyImportSchema`:
```ts
transaction_type: TransactionTypeEnum.optional().nullable(),  // ~line 122
price: z.coerce.number().int().positive().optional().nullable(),  // ~line 136
price_type: PriceTypeEnum.optional().nullable(),  // ~line 137
```

Keep the field definitions in the `mandate` group (from Task 4) — those are used by the composite engine for fuzzy matching.

- [ ] **Step 3: Commit**

```bash
git add lib/import/property-import-config.ts lib/import/property-import-schema.ts
git commit -m "fix(import): remove price/transaction_type from property import data path"
```

### Task 20: Fix write-path compile errors

**Files (write paths — must be fixed):**
- Modify: `app/api/mls/properties/route.ts` — remove price/price_type/transaction_type from POST/PUT data
- Modify: `app/api/mls/properties/draft/route.ts` — same
- Modify: `app/[locale]/app/(routes)/mls/properties/components/NewPropertyWizard.tsx` — remove form fields
- Modify: `app/[locale]/app/(routes)/mls/components/QuickAddProperty.tsx` — remove fields
- Modify: `lib/validations/mls.ts` — remove from Zod schemas

- [ ] **Step 1: Fix each write-path file**

For each file:
1. Read it
2. Remove any reference to `price`, `price_type`, `transaction_type` in Prisma data objects, form schemas, form fields
3. For form components: remove the price/transaction_type input fields from the JSX

- [ ] **Step 2: Update ReviewStep displayColumns for property**

In `components/import/ReviewStep.tsx`, replace `"price"` in the property displayColumns with `"address_city"` or another useful field (since `price` no longer exists on the property model):
```ts
: ["property_name", "property_type", "address_street", "address_city", "property_status"];
```

- [ ] **Step 3: Run `pnpm build` to find remaining errors**

Run: `pnpm build 2>&1 | grep -i "price\|price_type\|transaction_type" | head -30`

Fix each compile error by removing the field reference. For READ paths (display components), simply remove the field from `select` statements and any JSX that renders it. Components that ONLY displayed price can show `"-"` or be removed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: remove price/price_type/transaction_type from all write and read paths"
```

### Task 21: Final build verification

- [ ] **Step 1: Full build**

Run: `pnpm build`

Expected: Clean build with no errors.

- [ ] **Step 2: Commit any remaining fixes**

---

## Deployment Checklist

### Phase A deployment
1. Merge all Chunk 1–6 commits
2. Deploy — existing imports continue to work, composite mandates start being created
3. Verify: import a property CSV with price/transaction_type columns → mandates should be created

### Phase B deployment (one atomic release)
1. Run Stage A: `npx tsx scripts/migrate-property-prices-to-mandates.ts`
2. Verify Stage A: `SELECT COUNT(*) FROM "Mandate" WHERE "createdBy" IS NULL` matches expected count
3. Deploy Stage B migration + app code (Tasks 18–21)
4. Run: `pnpm db:deploy` (applies the DDL migration)
5. Verify: `pnpm build` on production
