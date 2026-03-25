# Composite Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `price`, `price_type`, and `transaction_type` from the `Properties` schema, migrate any existing data to linked Mandates, and make the import system automatically create + link Mandates when mandate-related columns are detected.

**Architecture:** Three-chunk delivery — (1) data migration + schema DDL + compile fixes for ALL affected files, (2) composite import engine + entity configs + schema/config updates, (3) API route wiring + wizard UI updates. Each chunk must compile cleanly before proceeding. Chunks 2 and 3 can be deployed before Chunk 1 but Chunk 1's Stage B DDL **cannot** be deployed without Chunk 1 Step 3b being deployed simultaneously.

**Tech Stack:** Next.js 16, TypeScript, Prisma ORM (PostgreSQL), Zod, Vitest (`pnpm vitest run`)

**Spec:** `docs/superpowers/specs/2026-03-16-composite-import-design.md`

---

## File Map

### New files
| Path | Responsibility |
|------|---------------|
| `scripts/migrate-property-prices-to-mandates.ts` | Stage A: read properties with price/transaction_type, create Mandate + junction row, idempotency-guarded |
| `lib/import/composite-engine.ts` | `executeCompositeImport` + `CompositeImportConfig` + `CompositeImportResult` types |
| `lib/import/property-composite-config.ts` | `CompositeImportConfig` for Properties+Mandates |
| `lib/import/client-composite-config.ts` | `CompositeImportConfig` for Clients+Mandates |

### Modified files
| Path | What changes |
|------|-------------|
| `prisma/schema.prisma` | Drop `price`, `price_type`, `transaction_type` from `Properties` model |
| `lib/import/property-import-schema.ts` | Keep `price`/`price_type`/`transaction_type` in Zod schema (composite engine reads them); move fieldDef group to `"mandate"`; add `budget_min`, `budget_max`, `notes` |
| `lib/import/property-import-config.ts` | Remove `price`, `price_type`, `transaction_type` from `toPrismaData` |
| `lib/import/client-import-schema.ts` | Add 16-field mandate group |
| `lib/import/index.ts` | Export new symbols |
| `app/api/mls/properties/route.ts` | Remove price/price_type/transaction_type from POST/PUT |
| `app/api/mls/properties/import/route.ts` | Switch to `executeCompositeImport` |
| `app/api/crm/clients/import/route.ts` | Switch to `executeCompositeImport` |
| `app/api/v1/mls/properties/route.ts` | Remove deleted fields from select + response + write + filter |
| `app/api/v1/mls/properties/[propertyId]/route.ts` | Remove deleted fields from select + response + write |
| `app/api/export/mls/route.ts` | Remove deleted fields from select + response |
| `app/api/export/quick/[entityType]/[entityId]/route.ts` | Remove deleted fields |
| `app/api/export/portal/route.ts` | Remove `transaction_type` from select |
| `app/api/export/history/[entityType]/[entityId]/route.ts` | Remove `price` from select |
| `actions/mls/get-public-property.ts` | Remove price/transaction_type filter params |
| `actions/mls/get-shared-properties.ts` | Remove `price` from response mapping |
| `components/import/ImportWizardSteps.tsx` | Add optional `mandatesCreated` to `ImportResult` |
| `components/import/CompleteStep.tsx` | Show mandate count card when `mandatesCreated > 0` |
| `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx` | Updated toast + pass `mandatesCreated` |
| `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx` | Updated toast + pass `mandatesCreated` |

---

## Chunk 1: Schema Migration

### Task 1: Stage A — TypeScript data migration script

**Files:**
- Create: `scripts/migrate-property-prices-to-mandates.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/migrate-property-prices-to-mandates.ts
import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds } from "@/lib/friendly-id";

/** Map enum → Title Case prefix for mandate titles */
const TX_LABEL: Record<string, string> = {
  SALE: "Sale",
  RENTAL: "Rental",
  SHORT_TERM: "Short-term",
  EXCHANGE: "Exchange",
  AUCTION: "Auction",
};

async function main() {
  // Idempotency: find properties already linked to a mandate
  const alreadyLinked = await prismadb.mandate_Properties.findMany({
    select: { propertyId: true },
  });
  const linkedSet = new Set(alreadyLinked.map((l) => l.propertyId));

  // Fetch all properties that have price OR transaction_type (mandate-relevant data)
  const properties = await (prismadb as any).properties.findMany({
    where: {
      OR: [
        { price: { not: null } },
        { transaction_type: { not: null } },
      ],
    },
    select: {
      id: true,
      friendlyId: true,
      property_name: true,
      organizationId: true,
      createdBy: true,
      price: true,
      transaction_type: true,
    },
  });

  const toMigrate = properties.filter(
    (p: { id: string }) => !linkedSet.has(p.id)
  );

  console.log(
    `Found ${properties.length} properties with price/transaction_type, ${toMigrate.length} need migration.`
  );

  // Group by org for efficient friendly-id generation
  const byOrg = new Map<string, typeof toMigrate>();
  for (const p of toMigrate) {
    const list = byOrg.get(p.organizationId) ?? [];
    list.push(p);
    byOrg.set(p.organizationId, list);
  }

  let created = 0;
  let skipped = 0;

  for (const [orgId, props] of byOrg) {
    // Generate friendly IDs outside the transaction (requires PrismaClient, not Tx)
    const friendlyIds = await generateFriendlyIds(
      prismadb,
      "Mandates",
      props.length,
      orgId
    );

    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const friendlyId = friendlyIds[i];
      const price = Number(prop.price) || null;
      const txType: string | null = prop.transaction_type ?? null;

      const titlePrefix = txType ? (TX_LABEL[txType] ?? txType) : null;
      const title = titlePrefix
        ? `${titlePrefix} mandate for ${prop.property_name}`
        : `Mandate for ${prop.property_name}`;

      const mandateId = crypto.randomUUID();

      try {
        await prismadb.$transaction([
          // Create the mandate
          (prismadb as any).mandate.create({
            data: {
              id: mandateId,
              friendlyId,
              organizationId: orgId,
              createdBy: prop.createdBy ?? null,
              updatedBy: prop.createdBy ?? null,
              title,
              transaction_type: txType as any,
              budget_min: price,
              budget_max: price,
              status: "ACTIVE",
              visibility: "PRIVATE",
              draft_status: false,
              condition: [],
              heating_type: [],
            },
          }),
          // Link mandate to property
          prismadb.mandate_Properties.create({
            data: {
              mandateId,
              propertyId: prop.id,
            },
          }),
        ]);
        created++;
      } catch (err) {
        console.error(`Failed to migrate property ${prop.id}:`, err);
        skipped++;
      }
    }
  }

  console.log(`Migration complete. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prismadb.$disconnect());
```

- [ ] **Step 2: TypeScript compile check (script only)**

```bash
pnpm exec tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to the new script.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-property-prices-to-mandates.ts
git commit -m "feat: add Stage A data migration script — property prices to mandates"
```

---

### Task 2: Stage B — Prisma DDL migration (drop price columns from Properties)

**Files:**
- Modify: `prisma/schema.prisma` (remove 3 fields)

- [ ] **Step 1: Remove the 3 fields from `prisma/schema.prisma`**

In `model Properties`, delete these three lines:
```
  price                  Decimal?
  price_type             PriceType?
  transaction_type       TransactionType?
```

- [ ] **Step 2: Check if `PriceType` enum is used anywhere else**

```bash
grep -n "PriceType" prisma/schema.prisma
```
Expected: 0 results remaining. If still referenced elsewhere, do NOT remove the enum definition.

- [ ] **Step 3: Verify `TransactionType` is still present (used by Mandate)**

```bash
grep -n "TransactionType" prisma/schema.prisma
```
Expected: still appears on `Mandate.transaction_type` — keep the enum.

- [ ] **Step 4: Create the Prisma migration**

```bash
pnpm db:migrate
```
When prompted, enter migration name: `remove_price_fields_from_properties`

Expected: `The following migration(s) have been applied` with no errors.

- [ ] **Step 5: Commit schema + migration**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): remove price, price_type, transaction_type from Properties model"
```

---

### Task 3: Fix compile errors — primary write paths

**Files:**
- Modify: `lib/import/property-import-config.ts`
- Modify: `app/api/mls/properties/route.ts`

**CRITICAL:** This task and Task 3b MUST be deployed in the same release as the Stage B DDL migration. Deploying the DDL without these changes causes runtime errors. Deploying these changes without the DDL causes build-time errors.

- [ ] **Step 1: Edit `lib/import/property-import-config.ts` — remove the 3 field assignments in `toPrismaData`**

Remove these three lines from the `toPrismaData` return object:
```ts
      transaction_type: item.transaction_type || null,
```
```ts
      price: toNumber(item.price),
      price_type: item.price_type || null,
```

The comment `// Pricing` above those lines should also be removed.

- [ ] **Step 2: Edit `app/api/mls/properties/route.ts` — remove the 3 field references**

Search and remove each of these patterns:

**Destructuring at top of POST handler** — remove `transaction_type,` from the body destructuring.

**Destructuring at top of POST handler** — remove `price,` and `price_type,` from the body destructuring.

**Conditional assignment block** — remove the entire block:
```ts
  if (transaction_type !== undefined && transaction_type !== null && transaction_type !== "") {
    data.transaction_type = transaction_type;
  }
```

**Conditional assignment block** — remove the entire block:
```ts
  if (price_type !== undefined && price_type !== null && price_type !== "") {
    data.price_type = price_type;
  }
```

**Price assignment line** — remove:
```ts
  if (price !== undefined) data.price = toNumber(price);
```

- [ ] **Step 3: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors in these two files (other files will still have errors — those are fixed in Task 3b).

- [ ] **Step 4: Commit**

```bash
git add lib/import/property-import-config.ts app/api/mls/properties/route.ts
git commit -m "fix: remove price/price_type/transaction_type from property import config and write API"
```

---

### Task 3b: Fix compile errors — all other affected files

**Files:**
- Modify: `app/api/v1/mls/properties/route.ts`
- Modify: `app/api/v1/mls/properties/[propertyId]/route.ts`
- Modify: `app/api/export/mls/route.ts`
- Modify: `app/api/export/quick/[entityType]/[entityId]/route.ts`
- Modify: `app/api/export/portal/route.ts`
- Modify: `app/api/export/history/[entityType]/[entityId]/route.ts`
- Modify: `actions/mls/get-public-property.ts`
- Modify: `actions/mls/get-shared-properties.ts`

The approach for all files: **remove the deleted fields from Prisma `select` blocks, remove them from response-object mappings, and remove any WHERE filter or write assignment that references them**. Responses that previously returned `price`, `transactionType`, `priceType` should simply omit those fields (or return `null` where the response contract requires the key to be present — check each file).

- [ ] **Step 1: Fix `app/api/v1/mls/properties/route.ts`**

Remove from `select` block:
```ts
        transaction_type: true,
        price: true,
        price_type: true,
```

Remove from GET response object mapping:
```ts
          transactionType: property.transaction_type,
          price: property.price,
          priceType: property.price_type,
```

Remove WHERE price filter block:
```ts
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) (where.price as ...).gte = ...;
      if (filters.maxPrice) (where.price as ...).lte = ...;
    }
```

Remove WHERE transaction_type filter:
```ts
    if (filters.transactionType) {
      where.transaction_type = filters.transactionType;
    }
```

Remove from POST data object:
```ts
        transaction_type: transactionType || null,
        price: price || null,
        price_type: priceType || null,
```

Remove the second `select` block's `transaction_type: true` and `price: true` entries, and the response mapping lines `transactionType: property.transaction_type` and `price: property.price`.

Also remove `transactionType`, `price`, and `priceType` from the query parameter destructuring.

- [ ] **Step 2: Fix `app/api/v1/mls/properties/[propertyId]/route.ts`**

Remove from GET `select`:
```ts
        transaction_type: true,
        price_type: true,
```

Remove from GET response:
```ts
        transactionType: property.transaction_type,
        price: property.price,
        priceType: property.price_type,
```

Remove from PUT updateData:
```ts
    if (transactionType !== undefined) updateData.transaction_type = transactionType;
    if (price !== undefined) updateData.price = price;
    if (priceType !== undefined) updateData.price_type = priceType;
```

Remove `price: property.price` from the second response mapping (around line 277).

Also remove `transactionType`, `price`, `priceType` from the PUT body destructuring.

- [ ] **Step 3: Fix `app/api/export/mls/route.ts`**

Remove from Prisma select:
```ts
        transaction_type: true,
```

Remove from response/export object:
```ts
      price: property.price ? Number(property.price) : null,
      price_per_sqm: property.price && property.square_feet
        ? Math.round(Number(property.price) / Number(property.square_feet))
        : null,
```

Replace `price_per_sqm` with `null` or remove from export entirely.

- [ ] **Step 4: Fix `app/api/export/quick/[entityType]/[entityId]/route.ts`**

This file is extensive. Remove all lines that access `property.price`, `property.price_type`, and `property.transaction_type`. Specifically:
- Remove from the type definition near line 18: `transaction_type: string | null;` and `price_type: string | null;` — also remove the `price` field.
- Remove the XML block: `xml += \`    <price>${property.price}</price>\n\`;`
- Remove the `transaction` XML line, or replace `property.transaction_type` with `null`/`"sale"` fallback.
- Replace `property.price || ""` with `""` in the CSV data line.
- Replace `property.price` in pricePerSqm with `null` (making it always `""`).
- In `formatPrice(property.price)`, replace with an empty string or `null`.
- Remove lines 770-772: `transaction_type: property.transaction_type`, `price: property.price`, `price_type: property.price_type`.

- [ ] **Step 5: Fix `app/api/export/portal/route.ts`**

Remove from Prisma select:
```ts
        transaction_type: true,
```

Remove from the portal response object:
```ts
      price: property.price ? Number(property.price) : null,
```

- [ ] **Step 6: Fix `app/api/export/history/[entityType]/[entityId]/route.ts`**

Remove from response/select:
```ts
          price: property.price,
```

- [ ] **Step 7: Fix `actions/mls/get-public-property.ts`**

Remove the `where.transaction_type = transactionType` filter block (around line 92).
Remove the `where.price = {}` / `.gte` / `.lte` filter block (around lines 100-102).
Also remove `minPrice`, `maxPrice`, `transactionType` from the function's parameter destructuring (if these are input params — check the function signature).

- [ ] **Step 8: Fix `actions/mls/get-shared-properties.ts`**

Remove from the mapped response:
```ts
      price: property.price ? Number(property.price) : null,
```

- [ ] **Step 9: Full TypeScript compile**

```bash
pnpm exec tsc --noEmit 2>&1 | head -60
```
Expected: 0 errors related to `price`, `price_type`, or `transaction_type` on `Properties`.

- [ ] **Step 10: Commit**

```bash
git add \
  "app/api/v1/mls/properties/route.ts" \
  "app/api/v1/mls/properties/[propertyId]/route.ts" \
  "app/api/export/mls/route.ts" \
  "app/api/export/quick/[entityType]/[entityId]/route.ts" \
  "app/api/export/portal/route.ts" \
  "app/api/export/history/[entityType]/[entityId]/route.ts" \
  "actions/mls/get-public-property.ts" \
  "actions/mls/get-shared-properties.ts"
git commit -m "fix: remove price/price_type/transaction_type references across export and v1 API routes"
```

---

## Chunk 2: Composite Import Engine

### Task 4: Write the composite engine

**Files:**
- Create: `lib/import/composite-engine.ts`
- Create: `tests/import/composite-engine.test.ts`

`★ Insight ─────────────────────────────────────`
The engine uses individual `create` calls (not `createMany`) for both primary entities and mandates. Each `create` returns the database record including its UUID. That UUID is then used for the `Mandate_Properties` / `Mandate_Clients` junction row. `createMany` would make this impossible — it returns only a count.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Write the failing tests first**

```ts
// tests/import/composite-engine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    properties: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "prop-uuid-1", friendlyId: "prop-1" }),
    },
    clients: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "cli-uuid-1", friendlyId: "cli-1" }),
    },
    mandate: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "mand-uuid-1" }),
    },
    mandate_Properties: { create: vi.fn().mockResolvedValue({}) },
    mandate_Clients: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => {
      for (const op of ops) await op;
    }),
  },
}));

vi.mock("@/lib/key-management", () => ({
  getOrgDek: vi.fn().mockResolvedValue(Buffer.alloc(32)),
}));

vi.mock("@/lib/friendly-id", () => ({
  generateFriendlyIds: vi.fn().mockResolvedValue(["prop-1"]),
}));

import {
  isMandateFieldNonEmpty,
  partitionRows,
} from "@/lib/import/composite-engine";

describe("isMandateFieldNonEmpty", () => {
  it("returns false for null", () => expect(isMandateFieldNonEmpty(null)).toBe(false));
  it("returns false for undefined", () => expect(isMandateFieldNonEmpty(undefined)).toBe(false));
  it("returns false for empty string", () => expect(isMandateFieldNonEmpty("")).toBe(false));
  it("returns true for the string '0'", () => expect(isMandateFieldNonEmpty("0")).toBe(true));
  it("returns true for numeric 0", () => expect(isMandateFieldNonEmpty(0)).toBe(true));
  it("returns true for a real value", () => expect(isMandateFieldNonEmpty("SALE")).toBe(true));
});

describe("partitionRows", () => {
  const mandateFields = new Set(["price", "transaction_type"]);

  it("puts rows with no mandate fields in primaryOnly", () => {
    const rows = [{ property_name: "Test", bedrooms: 2 }];
    const { primaryOnly, withMandate } = partitionRows(rows, mandateFields);
    expect(primaryOnly).toHaveLength(1);
    expect(withMandate).toHaveLength(0);
  });

  it("puts rows with a mandate field in withMandate", () => {
    const rows = [{ property_name: "Test", price: 150000 }];
    const { primaryOnly, withMandate } = partitionRows(rows, mandateFields);
    expect(primaryOnly).toHaveLength(0);
    expect(withMandate).toHaveLength(1);
  });

  it("uses strict non-empty check — 0 is non-empty", () => {
    const rows = [{ property_name: "Test", price: 0 }];
    const { primaryOnly, withMandate } = partitionRows(rows, mandateFields);
    expect(withMandate).toHaveLength(1);
  });

  it("null mandate field goes to primaryOnly", () => {
    const rows = [{ property_name: "Test", price: null }];
    const { primaryOnly, withMandate } = partitionRows(rows, mandateFields);
    expect(primaryOnly).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (module not found)**

```bash
pnpm vitest run tests/import/composite-engine.test.ts
```
Expected: FAIL — cannot find module `@/lib/import/composite-engine`

- [ ] **Step 3: Implement `composite-engine.ts`**

```ts
// lib/import/composite-engine.ts
import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";
import type { ImportEntityConfig, ImportError } from "./engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompositeImportConfig<TPrimary> {
  /** Full engine config for the primary entity */
  primaryConfig: ImportEntityConfig<TPrimary>;

  /**
   * Set of field keys that belong to the mandate side.
   * Any row containing ≥1 of these as non-empty triggers mandate creation.
   */
  mandateFields: Set<string>;

  /**
   * Build the raw mandate data object (pre-encryption).
   * mandateTitle is always a non-empty string, pre-synthesized by the engine.
   * mandateFriendlyId and mandateUuid are pre-generated by the engine.
   * MUST return plaintext title and notes — the encrypt step will replace them.
   *
   * Note: mandateUuid is passed in (not generated inside) so that:
   *   (a) the junction row can reference it before the transaction commits, and
   *   (b) tests can inject deterministic IDs.
   */
  buildMandateData: (
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    mandateUuid: string,
    orgId: string,
    userId: string
  ) => Record<string, unknown>;

  /** Synthesize the mandate title from the parsed primary item. */
  buildMandateTitle: (primaryItem: TPrimary) => string;

  /** Prisma accessor name for the junction model. */
  junctionModel: "mandate_Properties" | "mandate_Clients";

  /** Foreign key field on the junction model for the primary entity. */
  junctionForeignKey: "propertyId" | "clientId";

  /** encryptWithDek for mandate fields (from mandateImportConfig). */
  encryptMandateWithDek: (
    data: Record<string, unknown>,
    dek: Buffer
  ) => Record<string, unknown>;
}

export interface CompositeImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
  mandatesCreated: number;
  mandatesLinked: number;
}

// ---------------------------------------------------------------------------
// Exported helpers (unit-tested)
// ---------------------------------------------------------------------------

/**
 * Strict non-empty check.
 * Unlike truthiness, numeric 0 and boolean false are "non-empty" — they are intentional values.
 */
export function isMandateFieldNonEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

/** Split rows into those with mandate data and those without. */
export function partitionRows(
  rows: Record<string, unknown>[],
  mandateFields: Set<string>
): {
  primaryOnly: Record<string, unknown>[];
  withMandate: Record<string, unknown>[];
} {
  const primaryOnly: Record<string, unknown>[] = [];
  const withMandate: Record<string, unknown>[] = [];

  for (const row of rows) {
    let hasMandateData = false;
    for (const field of mandateFields) {
      if (isMandateFieldNonEmpty(row[field])) {
        hasMandateData = true;
        break;
      }
    }
    if (hasMandateData) {
      withMandate.push(row);
    } else {
      primaryOnly.push(row);
    }
  }

  return { primaryOnly, withMandate };
}

// ---------------------------------------------------------------------------
// Internal helpers (mirror engine.ts private helpers)
// ---------------------------------------------------------------------------

function normalizeId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

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

  const existingSet = new Set(existing.map((r) => r.friendlyId));
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
  let imported = 0;
  let skipped = 0;
  let mandatesCreated = 0;
  let mandatesLinked = 0;

  // ── Step 1: PARTITION ────────────────────────────────────────────────────
  const { primaryOnly, withMandate } = partitionRows(rows, config.mandateFields);
  const allRows = [...primaryOnly, ...withMandate];
  const withMandateSet = new Set(withMandate);

  // ── Step 2: VALIDATE all rows ────────────────────────────────────────────
  const validItems: {
    index: number;
    raw: Record<string, unknown>;
    parsed: TPrimary;
    needsMandate: boolean;
  }[] = [];

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const normalized = config.primaryConfig.normalizeEnums(row);
    const result = config.primaryConfig.importSchema.safeParse(normalized);

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
      validItems.push({
        index: i,
        raw: normalized,
        parsed: result.data,
        needsMandate: withMandateSet.has(row),
      });
    }
  }

  if (validItems.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      failed: rows.length,
      errors,
      mandatesCreated: 0,
      mandatesLinked: 0,
    };
  }

  // ── Step 3: PRIMARY ID GENERATION ────────────────────────────────────────
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
    const resolved = await resolveUserProvidedIds(
      rawIds,
      orgId,
      config.primaryConfig.prismaModel
    );
    for (let i = 0; i < withUserId.length; i++) {
      friendlyIds[withUserId[i].idx] = resolved[i];
    }
  }

  if (withoutUserId.length > 0) {
    const generated = await generateFriendlyIds(
      prismadb,
      config.primaryConfig.entityIdType,
      withoutUserId.length,
      orgId
    );
    for (let i = 0; i < withoutUserId.length; i++) {
      friendlyIds[withoutUserId[i]] = generated[i];
    }
  }

  // ── Step 4: ENCRYPT + BUILD primary data ─────────────────────────────────
  const dek = await getOrgDek(orgId);

  const primaryPrismaData = validItems.map((item, i) => {
    const enc = config.primaryConfig.encryptWithDek(item.raw, dek);
    return config.primaryConfig.toPrismaData(
      item.parsed,
      enc,
      friendlyIds[i],
      userId,
      orgId
    );
  });

  // ── Step 5: INSERT primary entities (individual creates; P2002 = skipped) ─
  const primaryModel = prismadb[config.primaryConfig.prismaModel] as any;
  const insertedItems: {
    uuid: string;
    item: typeof validItems[number];
  }[] = [];

  for (let j = 0; j < primaryPrismaData.length; j++) {
    try {
      const created = await primaryModel.create({ data: primaryPrismaData[j] });
      imported++;
      insertedItems.push({ uuid: created.id, item: validItems[j] });
    } catch (err: unknown) {
      const isPrismaError = err !== null && typeof err === "object" && "code" in err;
      if (isPrismaError && (err as { code: string }).code === "P2002") {
        skipped++;
      } else {
        errors.push({
          row: validItems[j].index + 2,
          field: "",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ── Step 6 + 7: MANDATE CREATION + LINK ──────────────────────────────────
  const needingMandate = insertedItems.filter((r) => r.item.needsMandate);

  if (needingMandate.length > 0) {
    // Pre-generate mandate friendly IDs outside any transaction
    const mandateFriendlyIds = await generateFriendlyIds(
      prismadb,
      "Mandates",
      needingMandate.length,
      orgId
    );

    for (let k = 0; k < needingMandate.length; k++) {
      const { uuid: primaryUuid, item } = needingMandate[k];
      const mandateFriendlyId = mandateFriendlyIds[k];
      const mandateUuid = crypto.randomUUID();

      // Synthesize title; guard against empty string
      let mandateTitle = config.buildMandateTitle(item.parsed);
      if (!mandateTitle || mandateTitle.trim() === "") {
        mandateTitle = "Mandate";
      }

      // Pass only the mandate-relevant slice of the raw row
      const mandateRow = Object.fromEntries(
        Object.entries(item.raw).filter(([k]) => config.mandateFields.has(k))
      );

      // Build mandate data (plaintext — encrypt step will replace title/notes)
      const mandateData = config.buildMandateData(
        mandateRow,
        mandateTitle,
        mandateFriendlyId,
        mandateUuid,
        orgId,
        userId
      );

      // Encrypt mandate fields
      const encMandateFields = config.encryptMandateWithDek(mandateData, dek);
      const finalMandateData = { ...mandateData, ...encMandateFields };

      try {
        await prismadb.$transaction([
          (prismadb.mandate as any).create({ data: finalMandateData }),
          (prismadb[config.junctionModel] as any).create({
            data: {
              mandateId: mandateUuid,
              [config.junctionForeignKey]: primaryUuid,
            },
          }),
        ]);
        mandatesCreated++;
        mandatesLinked++;
      } catch (err) {
        errors.push({
          row: item.index + 2,
          field: "mandate",
          error: `Mandate creation failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  const failed =
    rows.length -
    validItems.length +
    (validItems.length - imported - skipped);

  return { imported, skipped, failed, errors, mandatesCreated, mandatesLinked };
}
```

- [ ] **Step 4: Run tests — they should now pass**

```bash
pnpm vitest run tests/import/composite-engine.test.ts
```
Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/import/composite-engine.ts tests/import/composite-engine.test.ts
git commit -m "feat: add composite import engine with mandate auto-creation"
```

---

### Task 5: Update property-import-schema.ts — move mandate fields to dedicated group

**Files:**
- Modify: `lib/import/property-import-schema.ts`

**Important:** Keep `price`, `price_type`, and `transaction_type` in `propertyImportSchema` (Zod). The composite engine reads them from the raw row. They are only stripped from `toPrismaData` (done in Task 3). What changes here is the **group** in `propertyImportFieldDefinitions` and adding 3 new mandate-group entries.

- [ ] **Step 1: Add 3 new fields to `propertyImportSchema`**

In `propertyImportSchema`, add these optional fields (after the existing `description` field at the end):
```ts
  // Mandate group (triggers linked mandate creation when non-empty)
  budget_min: z.coerce.number().positive().optional().nullable(),
  budget_max: z.coerce.number().positive().optional().nullable(),
  notes: z.coerce.string().optional().or(z.literal("")),
```

- [ ] **Step 2: In `propertyImportFieldDefinitions`, change group for 3 existing entries**

Find the entry with `key: "transaction_type"` (currently `group: "classification"`) → change group to `"mandate"`.
Find the entry with `key: "price"` (currently `group: "pricing"`) → change group to `"mandate"`.
Find the entry with `key: "price_type"` (currently `group: "pricing"`) → change group to `"mandate"`.

- [ ] **Step 3: Add 3 new fieldDef entries in the `"mandate"` group**

Add after the last current `"pricing"` entry (or anywhere — grouped by `group` value at render time):
```ts
  {
    key: "budget_min",
    required: false,
    group: "mandate",
    aliases: ["min_budget", "elachisto_budget", "minimum_budget", "budget_from"],
    description: "Minimum budget / price (EUR) — creates a linked mandate",
  },
  {
    key: "budget_max",
    required: false,
    group: "mandate",
    aliases: ["max_budget", "megisto_budget", "maximum_budget", "budget_to"],
    description: "Maximum budget / price (EUR) — creates a linked mandate",
  },
  {
    key: "notes",
    required: false,
    group: "mandate",
    aliases: ["mandate_notes", "mandate_description"],
    description: "Notes for the linked mandate",
  },
```

- [ ] **Step 4: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/import/property-import-schema.ts
git commit -m "feat: move price/transaction_type to mandate group in property import schema"
```

---

### Task 6: Update client-import-schema.ts — add 16-field mandate group

**Files:**
- Modify: `lib/import/client-import-schema.ts`

- [ ] **Step 1: Add mandate fields to `clientImportSchema`**

Add to the Zod schema (after the existing `member_of` field):
```ts
  // Mandate fields — if any are non-empty, auto-create and link a Mandate
  transaction_type: z.enum([
    "SALE", "RENTAL", "SHORT_TERM", "EXCHANGE", "AUCTION",
  ]).optional().nullable(),
  property_type: z.enum([
    "RESIDENTIAL","COMMERCIAL","LAND","RENTAL","VACATION","APARTMENT",
    "HOUSE","MAISONETTE","WAREHOUSE","PARKING","PLOT","FARM","INDUSTRIAL","OTHER",
  ]).optional().nullable(),
  property_purpose: z.enum([
    "RESIDENTIAL","COMMERCIAL","LAND","PARKING","OTHER",
  ]).optional().nullable(),
  budget_min: z.coerce.number().positive().optional().nullable(),
  budget_max: z.coerce.number().positive().optional().nullable(),
  timeline: z.enum([
    "IMMEDIATE","ONE_THREE_MONTHS","THREE_SIX_MONTHS","SIX_PLUS_MONTHS",
  ]).optional().nullable(),
  urgency: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional().nullable(),
  size_min_sqm: z.coerce.number().positive().optional().nullable(),
  size_max_sqm: z.coerce.number().positive().optional().nullable(),
  bedrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bedrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  areas_of_interest: z.array(z.string()).optional().nullable(),
  municipality: z.coerce.string().optional().or(z.literal("")),
  region: z.coerce.string().optional().or(z.literal("")),
  expires_at: z.coerce.string().optional().or(z.literal("")),
  notes: z.coerce.string().optional().or(z.literal("")),
```

- [ ] **Step 2: Add fieldDef entries in `clientImportFieldDefinitions`**

Add a `"mandate"` group with these 16 entries:
```ts
  { key: "transaction_type", required: false, group: "mandate",
    aliases: ["transaction", "deal_type", "typos_synallagis"],
    description: "Transaction type (SALE, RENTAL, etc.)" },
  { key: "property_type", required: false, group: "mandate",
    aliases: ["type", "prop_type", "typos_akinitiou"],
    description: "Desired property type" },
  { key: "property_purpose", required: false, group: "mandate",
    aliases: ["purpose", "skopos"],
    description: "Property purpose (RESIDENTIAL, COMMERCIAL, etc.)" },
  { key: "budget_min", required: false, group: "mandate",
    aliases: ["min_budget", "elachisto_budget", "minimum_budget", "budget_from"],
    description: "Minimum budget (EUR)" },
  { key: "budget_max", required: false, group: "mandate",
    aliases: ["max_budget", "megisto_budget", "maximum_budget", "budget_to"],
    description: "Maximum budget (EUR)" },
  { key: "timeline", required: false, group: "mandate",
    aliases: ["timeframe", "chronodiagramma"],
    description: "Timeline (IMMEDIATE, ONE_THREE_MONTHS, etc.)" },
  { key: "urgency", required: false, group: "mandate",
    aliases: ["priority", "epeigousa", "proteraiotita"],
    description: "Urgency (LOW, MEDIUM, HIGH, CRITICAL)" },
  { key: "size_min_sqm", required: false, group: "mandate",
    aliases: ["min_size", "min_sqm", "elachisto_emvadon"],
    description: "Minimum size (sq.m.)" },
  { key: "size_max_sqm", required: false, group: "mandate",
    aliases: ["max_size", "max_sqm", "megisto_emvadon"],
    description: "Maximum size (sq.m.)" },
  { key: "bedrooms_min", required: false, group: "mandate",
    aliases: ["min_bedrooms", "min_beds", "elachista_ypnodomatia"],
    description: "Minimum bedrooms" },
  { key: "bedrooms_max", required: false, group: "mandate",
    aliases: ["max_bedrooms", "max_beds", "megista_ypnodomatia"],
    description: "Maximum bedrooms" },
  { key: "areas_of_interest", required: false, group: "mandate",
    aliases: ["areas", "perioxes", "locations", "neighborhoods"],
    description: "Areas of interest (comma-separated)" },
  { key: "municipality", required: false, group: "mandate",
    aliases: ["dimos", "municipality_name"],
    description: "Preferred municipality" },
  { key: "region", required: false, group: "mandate",
    aliases: ["perifereia", "prefecture"],
    description: "Preferred region" },
  { key: "expires_at", required: false, group: "mandate",
    aliases: ["expiry", "expiration", "lixi"],
    description: "Mandate expiration date" },
  { key: "notes", required: false, group: "mandate",
    aliases: ["mandate_notes", "mandate_description", "client_notes"],
    description: "Notes for the linked mandate" },
```

- [ ] **Step 3: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/import/client-import-schema.ts
git commit -m "feat: add 16-field mandate group to client import schema"
```

---

### Task 7: Create property-composite-config.ts

**Files:**
- Create: `lib/import/property-composite-config.ts`

- [ ] **Step 1: Write the config**

```ts
// lib/import/property-composite-config.ts
import type { CompositeImportConfig } from "./composite-engine";
import { propertyImportConfig } from "./property-import-config";
import { mandateImportConfig } from "./mandate-import-config";
import type { PropertyImportData } from "./property-import-schema";

/** Map enum value → Title Case prefix for mandate title synthesis */
const TX_LABEL: Record<string, string> = {
  SALE: "Sale",
  RENTAL: "Rental",
  SHORT_TERM: "Short-term",
  EXCHANGE: "Exchange",
  AUCTION: "Auction",
};

const PROPERTY_MANDATE_FIELDS = new Set([
  "price",
  "price_type",
  "transaction_type",
  "budget_min",
  "budget_max",
  "notes",
]);

export const propertyCompositeConfig: CompositeImportConfig<PropertyImportData> = {
  primaryConfig: propertyImportConfig,
  mandateFields: PROPERTY_MANDATE_FIELDS,
  junctionModel: "mandate_Properties",
  junctionForeignKey: "propertyId",
  encryptMandateWithDek: mandateImportConfig.encryptWithDek.bind(mandateImportConfig),

  buildMandateTitle(primaryItem: PropertyImportData): string {
    const txType = (primaryItem as any).transaction_type as string | null | undefined;
    const name = primaryItem.property_name;
    const prefix = txType ? (TX_LABEL[txType] ?? txType) : null;
    return prefix ? `${prefix} mandate for ${name}` : `Mandate for ${name}`;
  },

  buildMandateData(
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    mandateUuid: string,
    orgId: string,
    userId: string
  ): Record<string, unknown> {
    // Map price → budget_min AND budget_max (equal values = fixed asking price).
    // If budget_min/budget_max are also provided, they take precedence over price.
    const rawPrice = mandateRow.price ?? null;
    const priceNum = rawPrice !== null && rawPrice !== undefined && rawPrice !== ""
      ? Number(rawPrice) || null
      : null;

    const budgetMin = mandateRow.budget_min !== null &&
      mandateRow.budget_min !== undefined &&
      mandateRow.budget_min !== ""
        ? Number(mandateRow.budget_min) || null
        : priceNum;

    const budgetMax = mandateRow.budget_max !== null &&
      mandateRow.budget_max !== undefined &&
      mandateRow.budget_max !== ""
        ? Number(mandateRow.budget_max) || null
        : priceNum;

    // transaction_type takes precedence; price_type is a fallback
    let txType: string | null = null;
    if (mandateRow.transaction_type) {
      txType = String(mandateRow.transaction_type);
    } else if (mandateRow.price_type === "SALE") {
      txType = "SALE";
    } else if (mandateRow.price_type === "RENTAL") {
      txType = "RENTAL";
    }
    // PER_ACRE / PER_SQM → no transaction_type (null; accepted behavior)

    const notes = mandateRow.notes !== null &&
      mandateRow.notes !== undefined &&
      mandateRow.notes !== ""
        ? String(mandateRow.notes)
        : null;

    return {
      id: mandateUuid,
      friendlyId: mandateFriendlyId,
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,
      title: mandateTitle,   // plaintext; encrypt step will replace
      transaction_type: txType,
      budget_min: budgetMin,
      budget_max: budgetMax,
      notes,                 // plaintext; encrypt step will replace
      status: "ACTIVE",
      urgency: "MEDIUM",
      visibility: "PRIVATE",
      draft_status: false,
      condition: [],
      heating_type: [],
    };
  },
};
```

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/import/property-composite-config.ts
git commit -m "feat: add property composite import config"
```

---

### Task 8: Create client-composite-config.ts

**Files:**
- Create: `lib/import/client-composite-config.ts`

- [ ] **Step 1: Write the config**

```ts
// lib/import/client-composite-config.ts
import type { CompositeImportConfig } from "./composite-engine";
import { clientImportConfig } from "./client-import-config";
import { mandateImportConfig } from "./mandate-import-config";
import type { ClientImportData } from "./client-import-schema";

const TX_LABEL: Record<string, string> = {
  SALE: "Sale", RENTAL: "Rental", SHORT_TERM: "Short-term",
  EXCHANGE: "Exchange", AUCTION: "Auction",
};

const CLIENT_MANDATE_FIELDS = new Set([
  "transaction_type", "property_type", "property_purpose",
  "budget_min", "budget_max", "timeline", "urgency",
  "size_min_sqm", "size_max_sqm", "bedrooms_min", "bedrooms_max",
  "areas_of_interest", "municipality", "region", "expires_at", "notes",
]);

export const clientCompositeConfig: CompositeImportConfig<ClientImportData> = {
  primaryConfig: clientImportConfig,
  mandateFields: CLIENT_MANDATE_FIELDS,
  junctionModel: "mandate_Clients",
  junctionForeignKey: "clientId",
  encryptMandateWithDek: mandateImportConfig.encryptWithDek.bind(mandateImportConfig),

  buildMandateTitle(primaryItem: ClientImportData): string {
    const txType = (primaryItem as any).transaction_type as string | null | undefined;
    const name = primaryItem.client_name;
    const prefix = txType ? (TX_LABEL[txType] ?? txType) : null;
    return prefix ? `${prefix} mandate for ${name}` : `Mandate for ${name}`;
  },

  buildMandateData(
    mandateRow: Record<string, unknown>,
    mandateTitle: string,
    mandateFriendlyId: string,
    mandateUuid: string,
    orgId: string,
    userId: string
  ): Record<string, unknown> {
    function toNum(v: unknown): number | null {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }
    function toStr(v: unknown): string | null {
      if (v === null || v === undefined || v === "") return null;
      return String(v);
    }
    function toDateTime(v: unknown): Date | null {
      if (v === null || v === undefined || v === "") return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return {
      id: mandateUuid,
      friendlyId: mandateFriendlyId,
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,
      title: mandateTitle,
      transaction_type: toStr(mandateRow.transaction_type),
      property_type: toStr(mandateRow.property_type),
      property_purpose: toStr(mandateRow.property_purpose),
      budget_min: toNum(mandateRow.budget_min),
      budget_max: toNum(mandateRow.budget_max),
      timeline: toStr(mandateRow.timeline),
      urgency: toStr(mandateRow.urgency) ?? "MEDIUM",
      size_min_sqm: toNum(mandateRow.size_min_sqm),
      size_max_sqm: toNum(mandateRow.size_max_sqm),
      bedrooms_min: toNum(mandateRow.bedrooms_min) !== null
        ? Math.floor(toNum(mandateRow.bedrooms_min)!)
        : null,
      bedrooms_max: toNum(mandateRow.bedrooms_max) !== null
        ? Math.floor(toNum(mandateRow.bedrooms_max)!)
        : null,
      areas_of_interest: Array.isArray(mandateRow.areas_of_interest)
        ? mandateRow.areas_of_interest
        : null,
      municipality: toStr(mandateRow.municipality),
      region: toStr(mandateRow.region),
      expires_at: toDateTime(mandateRow.expires_at),
      notes: toStr(mandateRow.notes),
      status: "DRAFT",
      urgency_override: undefined, // urgency already set above
      visibility: "PRIVATE",
      draft_status: false,
      condition: [],
      heating_type: [],
    };
  },
};
```

> Note: Remove the `urgency_override: undefined` line — it was added by mistake. The `urgency` field is set directly above.

Corrected `buildMandateData` return — remove that stray line and keep:
```ts
      urgency: toStr(mandateRow.urgency) ?? "MEDIUM",
```

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/import/client-composite-config.ts
git commit -m "feat: add client composite import config"
```

---

### Task 9: Update lib/import/index.ts — export new symbols

**Files:**
- Modify: `lib/import/index.ts`

- [ ] **Step 1: Add exports at the end of the file**

```ts
// Composite import engine
export {
  executeCompositeImport,
  isMandateFieldNonEmpty,
  partitionRows,
  type CompositeImportConfig,
  type CompositeImportResult,
} from "./composite-engine";

// Composite entity configs
export { propertyCompositeConfig } from "./property-composite-config";
export { clientCompositeConfig } from "./client-composite-config";
```

- [ ] **Step 2: Verify no circular references / duplicate exports**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/import/index.ts
git commit -m "chore: export composite engine and configs from lib/import"
```

---

## Chunk 3: API Routes + Wizard UI

### Task 10: Update property import API route

**Files:**
- Modify: `app/api/mls/properties/import/route.ts`

- [ ] **Step 1: Rewrite the route**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeCompositeImport, propertyCompositeConfig } from "@/lib/import";

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

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add app/api/mls/properties/import/route.ts
git commit -m "feat: switch property import route to composite engine"
```

---

### Task 11: Update client import API route

**Files:**
- Modify: `app/api/crm/clients/import/route.ts`

- [ ] **Step 1: Rewrite the route**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeCompositeImport, clientCompositeConfig } from "@/lib/import";

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

    await invalidateCache(["clients:list", "mandates:list"]);

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

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add app/api/crm/clients/import/route.ts
git commit -m "feat: switch client import route to composite engine"
```

---

### Task 12: Extend ImportResult and CompleteStep to show mandate count

**Files:**
- Modify: `components/import/ImportWizardSteps.tsx`
- Modify: `components/import/CompleteStep.tsx`

`★ Insight ─────────────────────────────────────`
`ImportResult` is the shared frontend type across all wizard consumers. The optional `mandatesCreated` field preserves backward compatibility — all existing consumers (mandate-only wizard) just don't set it, and the UI shows nothing extra.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Add optional `mandatesCreated` to `ImportResult` in `ImportWizardSteps.tsx`**

Find the `ImportResult` interface in [components/import/ImportWizardSteps.tsx](components/import/ImportWizardSteps.tsx):
```ts
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: ValidationError[];
}
```
Change to:
```ts
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: ValidationError[];
  mandatesCreated?: number;
}
```

- [ ] **Step 2: Update `CompleteStep.tsx` to show mandate count**

Add `GitMerge` to the lucide-react import in [components/import/CompleteStep.tsx](components/import/CompleteStep.tsx).

After the closing `</div>` of the 3-column stats grid (the one containing imported/skipped/failed cards), add:
```tsx
{result.mandatesCreated !== undefined && result.mandatesCreated > 0 && (
  <Card className="border-primary/50 mt-2">
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/15">
          <GitMerge className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">
            {result.mandatesCreated}
          </p>
          <p className="text-xs text-muted-foreground">
            Mandates created &amp; linked
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add components/import/ImportWizardSteps.tsx components/import/CompleteStep.tsx
git commit -m "feat: show mandatesCreated count in import complete step"
```

---

### Task 13: Update PropertyImportWizard

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`

- [ ] **Step 1: Update toast message and return value**

In the `handleImport` function, replace:
```ts
        if (result.imported > 0) {
          toast.success("Import successful", { description: `Successfully imported ${result.imported} property(ies)`, isTranslationKey: false });
        }

        return {
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
        };
```

With:
```ts
        if (result.imported > 0) {
          const mandateMsg = result.mandatesCreated
            ? ` and ${result.mandatesCreated} mandate(s)`
            : "";
          toast.success("Import successful", {
            description: `Successfully imported ${result.imported} property(ies)${mandateMsg}`,
            isTranslationKey: false,
          });
        }

        return {
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
          mandatesCreated: result.mandatesCreated,
        };
```

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx"
git commit -m "feat: update property wizard to surface mandatesCreated in result"
```

---

### Task 14: Update ClientImportWizard

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`

- [ ] **Step 1: Update toast message and return value**

Apply the same pattern as Task 13, updating the client wizard's `handleImport`:
```ts
        if (result.imported > 0) {
          const mandateMsg = result.mandatesCreated
            ? ` and ${result.mandatesCreated} mandate(s)`
            : "";
          toast.success("Import successful", {
            description: `Successfully imported ${result.imported} client(s)${mandateMsg}`,
            isTranslationKey: false,
          });
        }

        return {
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
          mandatesCreated: result.mandatesCreated,
        };
```

- [ ] **Step 2: TypeScript compile check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx"
git commit -m "feat: update client wizard to surface mandatesCreated in result"
```

---

### Task 15: Final integration smoke test

- [ ] **Step 1: Run all import tests**

```bash
pnpm vitest run tests/import/
```
Expected: all PASS.

- [ ] **Step 2: Full TypeScript compile**

```bash
pnpm exec tsc --noEmit 2>&1 | head -60
```
Expected: 0 errors.

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -20
```
Expected: build completes without errors.

- [ ] **Step 4: Verify no remaining price/price_type/transaction_type writes to Properties**

```bash
grep -rn "\.price\b\|price_type\|transaction_type" \
  lib/import/property-import-config.ts \
  app/api/mls/properties/route.ts \
  app/api/v1/mls/properties/route.ts \
  "app/api/v1/mls/properties/[propertyId]/route.ts"
```
Expected: 0 matches.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add .
git commit -m "chore: composite import final smoke test pass"
```

---

## Deployment Order

> **⚠ WARNING:** Steps 2 and 3 must be executed atomically (same deployment slot, zero traffic in between). The application will throw Prisma runtime errors on any property read/write path if the DDL migration has been applied but the new application code has not yet been deployed. Plan a maintenance window or use zero-downtime blue-green deployment.

1. **Run Stage A migration script** against the production database (safe to run before DDL; idempotent):
   ```bash
   pnpm tsx scripts/migrate-property-prices-to-mandates.ts
   ```

2. **Apply Stage B DDL** (same deployment as step 3):
   ```bash
   pnpm db:deploy
   ```

3. **Deploy application code** (must be in same release as step 2).

The Stage A script is idempotent — safe to re-run if it errors partway through.
