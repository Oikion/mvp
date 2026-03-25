# Unified Import Engine — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a universal import engine that auto-detects, creates, and links Clients, Properties, and Mandates from a single spreadsheet upload.

**Architecture:** A new `unified-engine.ts` partitions each row into per-entity buckets based on field ownership defined in `unified-field-definitions.ts`. Entities are created in order (Client → Property → Mandate) and linked via 3 junction tables. The existing entity configs (`clientImportConfig`, `propertyImportConfig`, `mandateImportConfig`) are reused for encryption, validation, and Prisma data building. A passthrough Zod schema on the client side preserves all fields; real per-entity validation runs server-side.

**Tech Stack:** TypeScript, Prisma ORM, Zod, React (shadcn/ui), Next.js 16 API routes

**Spec:** `docs/superpowers/specs/2026-03-18-unified-import-engine.md`

**Time budget:** 6 hours. No TDD — build verification via `pnpm build` after each chunk.

---

## Parallelism Map

Tasks 1–3 are independent (pure library code) — execute in parallel.
Task 4 depends on Tasks 1–3 (engine uses field defs + name generator).
Tasks 5–8 are UI modifications — can be parallelized after Task 4.
Task 9 (API route) depends on Task 4.
Tasks 10–12 (wizard wrappers) depend on Tasks 5–8 and Task 9.

```
[Task 1: Field Defs] ──┐
[Task 2: Name Gen]   ──┼──→ [Task 4: Engine] ──→ [Task 9: API Route] ──→ [Tasks 10-12: Wrappers]
[Task 3: Barrel]     ──┘         │
                                 ├──→ [Task 5: ImportWizardSteps] ──→ [Tasks 10-12]
                                 ├──→ [Task 6: ReviewStep]
                                 ├──→ [Task 7: CompleteStep]
                                 └──→ [Task 8: TableMappingStep]
[Task 13: Translations] — independent, anytime
[Task 14: Build verify] — last
```

---

## Chunk 1: Library Core (Tasks 1–3, parallel)

### Task 1: Create unified field definitions

**Files:**
- Create: `lib/import/unified-field-definitions.ts`

- [ ] **Step 1: Create the file with the `UnifiedFieldDefinition` type and merged array**

The unified field definitions array merges all 3 existing field definition arrays with an `entity` tag on each entry. Overlapping keys are namespaced per spec §1.3–1.4.

Key rules:
- Import `propertyImportFieldDefinitions`, `clientImportFieldDefinitions`, `mandateImportFieldDefinitions` from existing schemas
- Add `entity: "client" | "property" | "mandate"` to each
- For mandate: rename overlapping keys (`transaction_type` → `mandate_transaction_type`, etc.)
- For mandate: OMIT `title` (auto-generated, see spec §5.5) and `id` (engine generates it)
- For client: rename `description` → `client_description`
- For property: keep `description` as-is, OMIT `id` (engine generates it)
- For client: OMIT `id` (engine generates it)
- Export `UNIFIED_FIELD_DEFINITIONS`, `MANDATE_FIELD_KEYS` (Set of all mandate entity field keys), `CLIENT_TRIGGER_KEYS`, `PROPERTY_TRIGGER_KEYS`
- Export `PREFIX_STRIP_MAP` and `stripEntityPrefix()` function from spec §1.4

The function `buildUnifiedFieldDefinitions()` should programmatically merge by iterating each existing array, tagging with entity, and applying the renames. This keeps it DRY — if field definitions change upstream, the unified defs auto-update.

```ts
export interface UnifiedFieldDefinition {
  key: string;           // unified key (may be namespaced)
  entity: "client" | "property" | "mandate";
  required: boolean;     // required within its entity
  group: string;         // for UI grouping
  aliases: string[];
  description?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/import/unified-field-definitions.ts
git commit -m "feat(import): add unified field definitions with entity ownership tags"
```

---

### Task 2: Create name generator

**Files:**
- Create: `lib/import/name-generator.ts`

- [ ] **Step 1: Create the file with all 3 name generators**

Implement from spec §4 and §2.2:

```ts
// generateMandateTitle(mandateRow, clientName, propertyName) → string
// generateClientName(clientRow) → string  (for auto-name from phone/email)
// generatePropertyName(propertyRow) → string  (fallback, not currently needed)
```

The `mandateRow` parameter has ALREADY been prefix-stripped. Keys are un-prefixed (`transaction_type`, not `mandate_transaction_type`).

Use `normalizeEnumValue` from `enum-normalizer.ts` for the `transaction_type` → title label mapping (spec review fix #1 from composite analysis — must normalize, not just `.toUpperCase()`).

Import the `transactionTypeMap` from `enum-normalizer.ts` for normalization.

- [ ] **Step 2: Commit**

```bash
git add lib/import/name-generator.ts
git commit -m "feat(import): add name generators for mandate titles and client auto-names"
```

---

### Task 3: Update barrel exports

**Files:**
- Modify: `lib/import/index.ts`

- [ ] **Step 1: Add unified exports**

Append exports for the new modules (field definitions, name generator). The engine and API route will be added in later tasks.

```ts
// Unified import
export {
  UNIFIED_FIELD_DEFINITIONS,
  MANDATE_FIELD_KEYS,
  CLIENT_TRIGGER_KEYS,
  PROPERTY_TRIGGER_KEYS,
  PREFIX_STRIP_MAP,
  stripEntityPrefix,
  type UnifiedFieldDefinition,
} from "./unified-field-definitions";

export {
  generateMandateTitle,
  generateClientName,
} from "./name-generator";
```

- [ ] **Step 2: Commit**

```bash
git add lib/import/index.ts
git commit -m "feat(import): export unified field definitions and name generators"
```

---

## Chunk 2: Universal Engine (Task 4, depends on Chunk 1)

### Task 4: Create the unified import engine

**Files:**
- Create: `lib/import/unified-engine.ts`

This is the largest and most critical file. It implements the full pipeline from spec §3.

- [ ] **Step 1: Create the file with types and helpers**

Types: `UnifiedImportResult` (spec §6), `RowResult` (per-row tracking).

Helpers: `isMandateFieldNonEmpty()`, `clientDedupKey()` (spec §3.2), `partitionRow()` (splits a flat row into `{ clientRow, propertyRow, mandateRow }` based on field entity ownership from `UNIFIED_FIELD_DEFINITIONS`).

The `partitionRow` function:
```ts
function partitionRow(
  row: Record<string, unknown>,
  fieldEntityMap: Map<string, "client" | "property" | "mandate">
): { clientRow: Record<string, unknown>; propertyRow: Record<string, unknown>; mandateRow: Record<string, unknown> } {
  const clientRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const mandateRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (entity === "client") clientRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else if (entity === "mandate") mandateRow[key] = value;
    // Unmapped keys are silently dropped
  }
  return { clientRow, propertyRow, mandateRow };
}
```

Build the `fieldEntityMap` once from `UNIFIED_FIELD_DEFINITIONS`:
```ts
const fieldEntityMap = new Map(UNIFIED_FIELD_DEFINITIONS.map(f => [f.key, f.entity]));
```

- [ ] **Step 2: Implement `executeUnifiedImport()`**

The main function. Follows spec §3 exactly:

```ts
export async function executeUnifiedImport(
  rows: Record<string, unknown>[],
  orgId: string,
  userId: string
): Promise<UnifiedImportResult>
```

Implementation order within each row:
1. Partition row → 3 entity buckets
2. Detect which entities to create (spec §2.1)
3. CLIENT: if `hasClient`, check dedup map → normalize → auto-name if needed → validate → encrypt → generate friendlyId → create → capture UUID
4. PROPERTY: if `hasProperty`, normalize → validate → encrypt → generate friendlyId → create → capture UUID
5. MANDATE: if `hasMandate`, strip prefixes → normalize → auto-generate title (inject BEFORE safeParse) → auto-copy budget → validate → encrypt → generate friendlyId → create → capture UUID
6. LINKS: create junction rows for each pair that exists
7. Track per-entity counts in the result

Key implementation details:
- FriendlyID generation: batch per entity type. Pre-scan all rows to count how many clients/properties/mandates will be created, then call `generateFriendlyIds()` once per type. Assign IDs from the pre-generated pool.
- Client dedup map: `Map<string, { uuid: string; friendlyId: string }>` — key is `clientDedupKey(row)` from spec §3.2
- Error handling: per-row try/catch with dependency cascade (spec §3, error handling section)
- `Client_Properties` junction: MUST supply `id: crypto.randomUUID()` (no `@default`)
- Mandate title: inject BEFORE `mandateImportSchema.safeParse()` (spec §3 step 3 CRITICAL note)
- Budget auto-copy: if property has `price` and mandate has no `budget_min`/`budget_max`, copy price to both (spec §2.4)
- Use `prismadb[config.prismaModel]` pattern from existing `engine.ts`

**FriendlyID batching approach:** Since we don't know exactly how many clients/properties/mandates until we process each row (dedup reduces client count), we generate IDs in small batches rather than one big batch. Use a `FriendlyIdPool` helper:

```ts
class FriendlyIdPool {
  private ids: string[] = [];
  private cursor = 0;
  constructor(private entityType: EntityType, private orgId: string) {}
  async next(): Promise<string> {
    if (this.cursor >= this.ids.length) {
      // Fetch next batch of 50
      const batch = await generateFriendlyIds(prismadb, this.entityType, 50, this.orgId);
      this.ids.push(...batch);
    }
    return this.ids[this.cursor++];
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm build 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add lib/import/unified-engine.ts
git commit -m "feat(import): add unified import engine with multi-entity partitioning and linking"
```

---

## Chunk 3: UI Modifications (Tasks 5–8, can be parallelized)

### Task 5: Update ImportWizardSteps for unified mode

**Files:**
- Modify: `components/import/ImportWizardSteps.tsx`

- [ ] **Step 1: Extend `ImportResult` interface**

Add optional unified fields to the existing `ImportResult` interface:

```ts
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: ValidationError[];
  // Unified import fields (present when using unified engine)
  clients?: { created: number; reused: number; failed: number };
  properties?: { created: number; failed: number };
  mandates?: { created: number; failed: number };
  links?: { clientProperty: number; mandateClient: number; mandateProperty: number };
}
```

- [ ] **Step 2: Add `unifiedMode` prop and passthrough schema support**

Add to `ImportWizardStepsProps`:
```ts
unifiedMode?: boolean;
mandateFieldKeys?: Set<string>;
```

When `unifiedMode` is true, the `canProceed()` check at step 1 (Mapping) uses the relaxed trigger-based logic from spec §5.4 instead of requiring all `required: true` fields.

- [ ] **Step 3: Update `canProceed()` for the mapping step**

In the `case 1:` of `canProceed()`, add the unified check:
```ts
if (unifiedMode) {
  const mappedFields = Object.values(fieldMapping);
  const hasMappedClientTrigger = mappedFields.includes("client_name")
    || mappedFields.includes("primary_phone") || mappedFields.includes("primary_email");
  const hasMappedPropertyTrigger = mappedFields.includes("property_name");
  const hasMappedMandateTrigger = mandateFieldKeys
    ? mappedFields.some((f) => mandateFieldKeys.has(f)) : false;
  return hasMappedClientTrigger || hasMappedPropertyTrigger || hasMappedMandateTrigger;
}
// Existing per-entity required fields check for backward compat
```

- [ ] **Step 4: Skip batching in unified mode (CRITICAL for dedup correctness)**

In `handleImport` (~line 295), add a unified-mode path that sends ALL rows in one call:

```ts
if (unifiedMode) {
  // CRITICAL: unified engine's client dedup map is scoped to one executeUnifiedImport() call.
  // Batching would reset the dedup map between batches, creating duplicate clients.
  setIsImporting(true);
  setImportProgress(50); // indeterminate — single request
  try {
    const result = await onImport(validData, controller.signal);
    if (controller.signal.aborted) return;
    setImportResult(result);
    setImportProgress(100);
    handleNext();
  } catch (error) {
    // ... error handling same as existing
  } finally {
    setIsImporting(false);
    setImportProgress(0);
  }
  return;
}
// ... existing batched logic for non-unified mode (backward compat)
```

- [ ] **Step 5: Update batch aggregation for unified result fields**

In the existing batched path (non-unified), add aggregation for unified fields so backward compat is maintained:

```ts
if (result.clients) {
  aggregated.clients = aggregated.clients ?? { created: 0, reused: 0, failed: 0 };
  aggregated.clients.created += result.clients.created;
  aggregated.clients.reused += result.clients.reused;
  aggregated.clients.failed += result.clients.failed;
}
// Same pattern for properties, mandates, links
```

- [ ] **Step 6: Commit**

```bash
git add components/import/ImportWizardSteps.tsx
git commit -m "feat(import): add unified mode support with single-request dedup to ImportWizardSteps"
```

---

### Task 6: Update ReviewStep for multi-entity preview

**Files:**
- Modify: `components/import/ReviewStep.tsx`

- [ ] **Step 1: Add entity detection counts**

Accept optional `entityCounts?: { clients: number; properties: number; mandates: number }` prop.

When present, show per-entity summary cards instead of the single "N entities to import" message:

```tsx
{entityCounts && (
  <div className="grid grid-cols-3 gap-4">
    {entityCounts.clients > 0 && (
      <Card><CardContent className="pt-6 text-center">
        <p className="text-2xl font-bold">{entityCounts.clients}</p>
        <p className="text-sm text-muted-foreground">Clients</p>
      </CardContent></Card>
    )}
    {/* Same for properties and mandates */}
  </div>
)}
```

- [ ] **Step 2: Fix entity label for all entity types**

Replace existing `entityLabel` ternary to handle all cases. When `entityCounts` is present (unified mode), skip the aggregate label in favor of per-entity cards:

```ts
const entityLabel =
  entityType === "client" ? "clients" :
  entityType === "mandate" ? "mandates" : "properties";
```

When `entityCounts` is present, the "Ready to Import" summary card uses the per-entity counts instead of `data.length + entityLabel`.

- [ ] **Step 3: Commit**

```bash
git add components/import/ReviewStep.tsx
git commit -m "feat(import): add multi-entity preview to ReviewStep"
```

---

### Task 7: Update CompleteStep for multi-entity results

**Files:**
- Modify: `components/import/CompleteStep.tsx`

- [ ] **Step 1: Add per-entity result display**

When `result.clients` is present (unified result), show per-entity cards instead of the single aggregate card:

```tsx
{result.clients && (
  <div className="space-y-3">
    <EntityResultCard icon={Users} label="Clients" created={result.clients.created} reused={result.clients.reused} failed={result.clients.failed} />
    <EntityResultCard icon={Building2} label="Properties" created={result.properties!.created} failed={result.properties!.failed} />
    <EntityResultCard icon={FileText} label="Mandates" created={result.mandates!.created} failed={result.mandates!.failed} />
    <LinkResultCard links={result.links!} />
  </div>
)}
```

Add `Users`, `Building2`, `FileText` from `lucide-react`.

- [ ] **Step 2: Fix entity label for mandates**

Same fix as ReviewStep — handle `"mandate"` in the `entityLabel` ternary.

- [ ] **Step 3: Commit**

```bash
git add components/import/CompleteStep.tsx
git commit -m "feat(import): add multi-entity results to CompleteStep"
```

---

### Task 8: Update TableMappingStep for entity-grouped dropdowns

**Files:**
- Modify: `components/import/TableMappingStep.tsx`

- [ ] **Step 1: Read the current file to understand dropdown structure**

Read `components/import/TableMappingStep.tsx` to find where field groups are rendered in the Combobox dropdown.

- [ ] **Step 2: Add entity-level grouping**

The existing dropdown groups fields by `group` property. For the unified wizard, the `entity` tag provides a higher-level grouping. Render entity sections (Client / Property / Mandate) with sub-groups within each.

The field definitions have both `entity` and `group`. The dropdown structure should be:
```
📋 Client
  Contact: client_name, primary_phone, primary_email, ...
  Company: company_name, vat, ...
🏠 Property
  Basic: property_name, property_type, ...
  Address: address_street, address_city, ...
  Pricing: price, price_type, ...
📝 Mandate
  Budget: budget_min, budget_max, ...
  Size: size_min_sqm, size_max_sqm, ...
```

Use `entity` to create the top-level groups and `group` for sub-groups.

- [ ] **Step 3: Add mandate fields mapping banner**

When any mandate field is mapped, show the contextual banner from the old composite spec:
```tsx
<Alert className="mb-4 border-primary/30 bg-primary/5">
  <AlertDescription>
    Columns mapped to <strong>Mandate</strong> fields will auto-create linked Mandates.
  </AlertDescription>
</Alert>
```

- [ ] **Step 4: Commit**

```bash
git add components/import/TableMappingStep.tsx
git commit -m "feat(import): add entity-grouped dropdowns and mandate banner to mapping step"
```

---

## Chunk 4: API Route + Wizard Wrappers (Tasks 9–12)

### Task 9: Create unified API route

**Files:**
- Create: `app/api/import/unified/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeUnifiedImport } from "@/lib/import/unified-engine";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Permission gate — VIEWER cannot import
    // TODO: Use getUserPermissions(user.id, organizationId).canCreate once available
    // For MVP: the route requires authenticated user + org context (existing pattern)

    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const result = await executeUnifiedImport(rows, organizationId, user.id);

    await invalidateCache([
      "clients:list", "properties:list", "mandates:list",
      "dashboard:accounts-count",
    ]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[UNIFIED_IMPORT_POST]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/import/unified/route.ts
git commit -m "feat(import): add unified import API route"
```

---

### Task 10: Create UnifiedImportWizard component

**Files:**
- Create: `components/import/UnifiedImportWizard.tsx`

- [ ] **Step 1: Create the wrapper component**

This replaces the 3 entity-specific wizard wrappers. It:
- Imports `UNIFIED_FIELD_DEFINITIONS` and `MANDATE_FIELD_KEYS`
- Builds the passthrough Zod schema (spec §5.3)
- Calls `/api/import/unified` instead of entity-specific routes
- Passes `unifiedMode={true}` and `mandateFieldKeys` to `ImportWizardSteps`
- Adapts `UnifiedImportResult` to `ImportResult` (spec §6.1)

```tsx
"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ImportWizardSteps, type ImportResult } from "@/components/import";
import { UNIFIED_FIELD_DEFINITIONS, MANDATE_FIELD_KEYS } from "@/lib/import";
import { useAppToast } from "@/hooks/use-app-toast";

interface UnifiedImportWizardProps {
  dict: { /* same shape as existing wizards */ };
  locale: string;
  returnUrl: string; // e.g., "/${locale}/app/mls" — varies by entry point
}

export function UnifiedImportWizard({ dict, locale, returnUrl }: UnifiedImportWizardProps) {
  const router = useRouter();
  const { toast } = useAppToast();

  // Passthrough schema — validates without stripping (spec §5.3)
  // No normalizeRow prop — intentional. The passthrough schema doesn't validate
  // individual field values; real per-entity enum normalization happens server-side.
  const schema = useMemo(() => z.record(z.unknown()).refine(
    (row) => {
      const hasClient = !!(row.client_name || row.primary_phone || row.primary_email);
      const hasProperty = !!row.property_name;
      const hasMandate = Object.entries(row).some(
        ([key, val]) => MANDATE_FIELD_KEYS.has(key) && val !== null && val !== undefined && val !== ""
      );
      return hasClient || hasProperty || hasMandate;
    },
    { message: "Row must contain data for at least one entity" }
  ), []);

  const handleImport = useCallback(async (
    data: Record<string, unknown>[],
    signal?: AbortSignal
  ): Promise<ImportResult> => {
    // CRITICAL: Send ALL rows in a single request — NOT batched.
    // The unified engine's client dedup map is scoped to one executeUnifiedImport() call.
    // If rows are split across HTTP requests, the same client appearing in batch 1 and
    // batch 3 would NOT be deduped — creating duplicate client records.
    // Progress tracking relies on the overall request duration, not per-batch updates.
    const response = await fetch("/api/import/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: data }),
      signal,
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Import failed");
    const result = await response.json();

    // Adapt unified result to ImportResult (spec §6.1)
    return {
      imported: (result.clients?.created ?? 0) + (result.clients?.reused ?? 0)
        + (result.properties?.created ?? 0) + (result.mandates?.created ?? 0),
      skipped: result.skipped ?? 0,
      failed: (result.clients?.failed ?? 0) + (result.properties?.failed ?? 0) + (result.mandates?.failed ?? 0),
      errors: result.errors ?? [],
      clients: result.clients,
      properties: result.properties,
      mandates: result.mandates,
      links: result.links,
    };
  }, []);

  return (
    <ImportWizardSteps
      entityType="property" // hint for fallback display; unified mode uses per-entity cards
      dict={dict.ImportWizard}
      fieldsDict={dict.ImportFields}
      schema={schema}
      fieldDefinitions={UNIFIED_FIELD_DEFINITIONS}
      onImport={handleImport}
      onComplete={() => { router.push(returnUrl); router.refresh(); }}
      onCancel={() => router.push(returnUrl)}
      viewUrl={returnUrl}
      unifiedMode={true}
      mandateFieldKeys={MANDATE_FIELD_KEYS}
    />
  );
}
```

**CRITICAL — No batching:** The `onImport` callback sends ALL rows in a single request. The `ImportWizardSteps` batching logic (`BATCH_SIZE=25`, line 293) calls `onImport(batch)` per batch — but each batch goes to the server as a separate `executeUnifiedImport()` call. This means the client dedup map resets between batches. To prevent this, the `UnifiedImportWizard`'s `onImport` receives the full `validData` array (since `ImportWizardSteps` calls `onImport(batch)` per batch) — each batch is a separate API call.

**There are two options to fix this:**
- **(A) Override batching:** In `ImportWizardSteps`, when `unifiedMode` is true, send ALL validData in one call instead of splitting into batches. This requires a small change to `handleImport` in `ImportWizardSteps.tsx`.
- **(B) Server-side session:** Pass a `sessionId` with each batch request, and the server maintains the dedup map across batches using an in-memory cache keyed by sessionId. More complex.

**Recommended: Option A.** In Task 5, add a step to modify `handleImport` in `ImportWizardSteps` to skip batching when `unifiedMode` is true — call `onImport(validData, signal)` once with all rows.

- [ ] **Step 2: Commit**

```bash
git add components/import/UnifiedImportWizard.tsx
git commit -m "feat(import): add UnifiedImportWizard component"
```

---

### Task 11: Replace PropertyImportWizard with UnifiedImportWizard

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx`

- [ ] **Step 1: Replace the component body**

Replace the entire `PropertyImportWizard` body to render `UnifiedImportWizard` instead, passing the existing `dict` and `locale` props through. Set `returnUrl` to `/${locale}/app/mls`.

The dict structure needs the unified `ImportFields` shape (with all 3 entity groups). For MVP, pass the existing `dict.ImportFields.property` as-is — the unified wizard will use the unified field definitions for mapping, and the dict only provides display labels.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx
git commit -m "feat(import): replace PropertyImportWizard with UnifiedImportWizard"
```

---

### Task 12: Replace ClientImportWizard and MandateImportWizard

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/import/components/MandateImportWizard.tsx`

- [ ] **Step 1: Replace ClientImportWizard**

Same pattern as Task 11. Set `returnUrl` to `/${locale}/app/crm`.

- [ ] **Step 2: Replace MandateImportWizard**

Same pattern. Set `returnUrl` to `/${locale}/app/mandates`.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx \
       app/[locale]/app/(routes)/mandates/import/components/MandateImportWizard.tsx
git commit -m "feat(import): replace Client and Mandate wizards with UnifiedImportWizard"
```

---

## Chunk 5: Translations + Verification (Tasks 13–14)

### Task 13: Add unified field labels to translations

**Files:**
- Modify: `locales/en/import.json`
- Modify: `locales/el/import.json`

- [ ] **Step 1: Read current translation structure**

Read `locales/en/import.json` to understand the `ImportFields` structure.

- [ ] **Step 2: Add unified groups and field labels**

Add a `unified` section to `ImportFields` with groups:
```json
"unified": {
  "groups": {
    "client_contact": "Client — Contact",
    "client_classification": "Client — Classification",
    "client_company": "Client — Company",
    "property_basic": "Property — Basic",
    "property_address": "Property — Address",
    "property_pricing": "Property — Pricing",
    "property_details": "Property — Details",
    "mandate_budget": "Mandate — Budget",
    "mandate_size": "Mandate — Size",
    "mandate_location": "Mandate — Location"
  },
  "fields": {
    /* all unified field keys with display labels */
  }
}
```

Also add Greek labels in `locales/el/import.json`.

- [ ] **Step 3: Commit**

```bash
git add locales/en/import.json locales/el/import.json
git commit -m "feat(i18n): add unified import field labels in EN and EL"
```

---

### Task 14: Build verification and smoke test

- [ ] **Step 1: Run full build**

Run: `pnpm build`

Expected: Clean build with no errors.

- [ ] **Step 2: Fix any type errors**

Address any TypeScript errors from the build.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev:http`

Test the import flow:
1. Navigate to `/en/app/mls/properties/import`
2. Upload a CSV with mixed property + client + mandate columns
3. Verify column mapping shows entity-grouped dropdowns
4. Proceed through validation → review → import
5. Check database: clients, properties, mandates, and junction table rows created

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: address build errors from unified import engine"
```

---

## Summary

| Task | Description | Time est. | Depends on |
|------|-------------|-----------|------------|
| 1 | Unified field definitions | 30min | — |
| 2 | Name generator | 20min | — |
| 3 | Barrel exports | 5min | — |
| 4 | Unified engine | 90min | 1, 2, 3 |
| 5 | ImportWizardSteps changes | 30min | — |
| 6 | ReviewStep changes | 15min | — |
| 7 | CompleteStep changes | 15min | — |
| 8 | TableMappingStep changes | 30min | — |
| 9 | API route | 15min | 4 |
| 10 | UnifiedImportWizard | 20min | 5, 9 |
| 11 | Replace PropertyImportWizard | 10min | 10 |
| 12 | Replace Client + Mandate wizards | 10min | 10 |
| 13 | Translations | 20min | — |
| 14 | Build + smoke test | 30min | all |
| | **Total** | **~5h 10min** | |

Buffer: ~50 minutes for debugging and unforeseen issues.
