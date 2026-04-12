# Activity Timeline Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all entity activity timeline implementations into a single unified `ActivityFeed unified` widget across all 4 core entities (Contact, Property, Request, Deal), routing deal stage transitions through `EntityChangeLog` so they appear in the same feed.

**Architecture:** Add `STAGE_CHANGED` to the `EntityChangeEventType` enum (requires a non-transactional Prisma migration), extend `createChangeLogEntry` to accept stage transition data stored in the existing `linkTarget` JSON column, wire it into the deal stage-advance API path, render it in `ActivityFeed`, delete the standalone `DealStageHistory` component, then extract a shared `EntityActivityPanel` wrapper and swap it in across all 4 entity views.

**Tech Stack:** Next.js 16, TypeScript, Prisma ORM (PostgreSQL), React 19, SWR, shadcn/ui, next-intl (`el`/`en`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `STAGE_CHANGED` to `EntityChangeEventType` enum |
| Create | `prisma/migrations/YYYYMMDD_add_stage_changed_event_type/migration.sql` | Non-transactional `ADD VALUE` |
| Modify | `lib/entity-change-log.ts` | Extend `eventType` union + `stageTransition` input field |
| Modify | `app/api/deals/[dealId]/route.ts` | Call `createChangeLogEntry` after stage `$transaction` |
| Modify | `components/activity/ActivityFeed.tsx` | Add `STAGE_CHANGED` icon + rendering branch in `ChangelogRow` |
| Modify | `tests/lib/entity-change-log.test.ts` | Add `STAGE_CHANGED` test cases |
| Delete | `app/[locale]/app/(routes)/deals/[dealId]/components/DealStageHistory.tsx` | Removed in Task 5 |
| Modify | `app/[locale]/app/(routes)/deals/[dealId]/components/DealView.tsx` | Remove `DealStageHistory`, add `unified` to `ActivityFeed` |
| Modify | `app/[locale]/app/(routes)/requests/[requestId]/components/RequestView.tsx` | Add `unified` to `ActivityFeed` |
| Create | `components/activity/EntityActivityPanel.tsx` | Shared wrapper: `QuickLogActivity` + `ActivityFeed unified` |
| Modify | `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx` | Replace with `EntityActivityPanel` |
| Modify | `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx` | Replace with `EntityActivityPanel` |
| Modify | `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx` | Replace with `EntityActivityPanel` |
| Modify | `app/[locale]/app/(routes)/deals/[dealId]/components/DealView.tsx` | Replace with `EntityActivityPanel` (final cleanup) |

---

## CRITICAL CONSTRAINTS

1. **NEVER run `pnpm prisma generate` or `pnpm db:migrate`** — leave as manual developer steps.
2. The `STAGE_CHANGED` migration SQL must be non-transactional (`ALTER TYPE ... ADD VALUE` cannot run in a transaction in PostgreSQL).
3. `stageTransition` data is stored in the **existing `linkTarget` JSON column** on `EntityChangeLog` — no new column is needed.
4. `EntityActivityPanel` renders **only inner content** (no Card wrapper) so each entity view can compose it inside its own Card/Tab.

---

### Task 1: Add `STAGE_CHANGED` to schema + write migration SQL

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260412000000_add_stage_changed_event_type/migration.sql`

- [ ] **Step 1: Write the failing test for STAGE_CHANGED event type**

Open `tests/lib/entity-change-log.test.ts`. Add this test (alongside existing tests):

```typescript
it("creates a STAGE_CHANGED changelog entry with stageTransition data", async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: "log-1" });
  vi.mocked(prismadb.entityChangeLog.create).mockImplementation(mockCreate);

  await createChangeLogEntry({
    organizationId: "org-1",
    entityType: "DEAL",
    entityId: "deal-1",
    eventType: "STAGE_CHANGED",
    actorUserId: "user-1",
    stageTransition: {
      fromStage: "OFFER",
      toStage: "NEGOTIATION",
      notes: "Accepted counter",
    },
  });

  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventType: "STAGE_CHANGED",
        linkTarget: {
          stageTransition: {
            fromStage: "OFFER",
            toStage: "NEGOTIATION",
            notes: "Accepted counter",
          },
        },
      }),
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
pnpm vitest run tests/lib/entity-change-log.test.ts
```

Expected: FAIL — `"STAGE_CHANGED"` is not assignable to `eventType` union

- [ ] **Step 3: Update `prisma/schema.prisma`**

Find the `EntityChangeEventType` enum and add `STAGE_CHANGED`:

```prisma
enum EntityChangeEventType {
  CREATED
  UPDATED
  LINKED
  UNLINKED
  DELETED
  ARCHIVED
  STAGE_CHANGED
}
```

- [ ] **Step 4: Create the migration SQL file**

Create directory `prisma/migrations/20260412000000_add_stage_changed_event_type/` and write `migration.sql`:

```sql
-- AlterEnum
-- This migration adds a new value to an existing enum.
-- It MUST NOT be wrapped in a transaction (PostgreSQL restriction for ADD VALUE).
ALTER TYPE "EntityChangeEventType" ADD VALUE 'STAGE_CHANGED';
```

> **Developer note**: Run `pnpm prisma migrate dev --name add_stage_changed_event_type` locally, or apply `migration.sql` directly in production. Do NOT run `pnpm prisma generate` — that is a manual step.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260412000000_add_stage_changed_event_type/migration.sql tests/lib/entity-change-log.test.ts
git commit -m "feat(changelog): add STAGE_CHANGED to EntityChangeEventType enum"
```

---

### Task 2: Extend `createChangeLogEntry` to handle `STAGE_CHANGED`

**Files:**
- Modify: `lib/entity-change-log.ts`

- [ ] **Step 1: Run the test from Task 1 again to confirm it still fails**

```bash
pnpm vitest run tests/lib/entity-change-log.test.ts
```

Expected: FAIL — `stageTransition` is not a property of `ChangeLogInput`

- [ ] **Step 2: Update `lib/entity-change-log.ts`**

Replace the `ChangeLogInput` interface and `createChangeLogEntry` function body. Key changes:
1. Extend `eventType` union to include `"STAGE_CHANGED"`
2. Add optional `stageTransition` field to `ChangeLogInput`
3. Merge `stageTransition` into `linkTarget` when present

Full updated file content:

```typescript
import { prismadb } from "@/lib/prisma";

export type EntityChangeLogType =
  | "CONTACT"
  | "PROPERTY"
  | "DEAL"
  | "REQUEST"
  | "SHOWING"
  | "DOCUMENT"
  | "TASK"
  | "NOTE";

export interface ChangedField {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface StageTransition {
  fromStage: string;
  toStage: string;
  notes?: string;
}

interface ChangeLogInput {
  organizationId: string;
  entityType: EntityChangeLogType;
  entityId: string;
  eventType:
    | "CREATED"
    | "UPDATED"
    | "LINKED"
    | "UNLINKED"
    | "DELETED"
    | "ARCHIVED"
    | "STAGE_CHANGED";
  actorUserId?: string;
  changedFields?: ChangedField[];
  linkTarget?: { type: string; id: string; friendlyId?: string; label?: string };
  stageTransition?: StageTransition;
}

export async function createChangeLogEntry(input: ChangeLogInput): Promise<void> {
  const {
    organizationId,
    entityType,
    entityId,
    eventType,
    actorUserId,
    changedFields,
    linkTarget,
    stageTransition,
  } = input;

  // Merge stageTransition into linkTarget JSON when present
  const linkTargetData = stageTransition
    ? { ...(linkTarget ?? {}), stageTransition }
    : linkTarget ?? null;

  try {
    await prismadb.entityChangeLog.create({
      data: {
        organizationId,
        entityType,
        entityId,
        eventType,
        actorUserId: actorUserId ?? null,
        changedFields: changedFields
          ? (changedFields as unknown as import("@prisma/client").Prisma.JsonArray)
          : undefined,
        linkTarget: linkTargetData
          ? (linkTargetData as unknown as import("@prisma/client").Prisma.JsonObject)
          : undefined,
      },
    });
  } catch (error) {
    // Non-fatal: changelog failure must never break the primary action
    console.error("[ENTITY_CHANGE_LOG_CREATE]", error);
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
pnpm vitest run tests/lib/entity-change-log.test.ts
```

Expected: All tests PASS (existing + new STAGE_CHANGED test)

- [ ] **Step 4: Commit**

```bash
git add lib/entity-change-log.ts
git commit -m "feat(changelog): extend createChangeLogEntry to accept STAGE_CHANGED + stageTransition"
```

---

### Task 3: Wire STAGE_CHANGED into the deal stage-advance API

**Files:**
- Modify: `app/api/deals/[dealId]/route.ts`

- [ ] **Step 1: Locate the stage-advance transaction in the route**

The relevant block is at line ~139 in `app/api/deals/[dealId]/route.ts`:

```typescript
const [updated] = await prismadb.$transaction([
  prismadb.deal.update({ where: { id: dealId }, data: { stage: body.toStage, ... } }),
  prismadb.dealStageLog.create({ data: { dealId, fromStage: deal.stage, toStage: body.toStage, changedBy: userId, notes: body.notes ?? null } }),
]);
```

- [ ] **Step 2: Add `createChangeLogEntry` call after the transaction**

Import `createChangeLogEntry` at the top of the file (add to existing imports):

```typescript
import { createChangeLogEntry } from "@/lib/entity-change-log";
```

After the `$transaction` block, add:

```typescript
// Fire-and-forget: non-fatal changelog entry for unified activity feed
await createChangeLogEntry({
  organizationId,
  entityType: "DEAL",
  entityId: dealId,
  eventType: "STAGE_CHANGED",
  actorUserId: userId,
  stageTransition: {
    fromStage: deal.stage,
    toStage: body.toStage,
    notes: body.notes ?? undefined,
  },
});
```

> Note: `createChangeLogEntry` already catches and swallows its own errors — no extra try/catch needed here.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "deals/\[dealId\]/route"
```

Expected: no errors on the route file

- [ ] **Step 4: Commit**

```bash
git add app/api/deals/\[dealId\]/route.ts
git commit -m "feat(deals): emit STAGE_CHANGED EntityChangeLog entry on stage advance"
```

---

### Task 4: Render `STAGE_CHANGED` entries in `ActivityFeed`

**Files:**
- Modify: `components/activity/ActivityFeed.tsx`

- [ ] **Step 1: Add `STAGE_CHANGED` to the `ChangelogEntry` type**

Find the `ChangelogEntry` interface/type in `ActivityFeed.tsx`. It currently has:

```typescript
eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
```

Update to:

```typescript
eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED" | "STAGE_CHANGED";
```

Also add `stageTransition` field alongside `linkTarget`:

```typescript
stageTransition?: {
  fromStage: string;
  toStage: string;
  notes?: string;
} | null;
```

- [ ] **Step 2: Add `STAGE_CHANGED` icon to `CHANGELOG_ICONS`**

Find `CHANGELOG_ICONS` object. Add:

```typescript
import { GitBranch } from "lucide-react";

// in CHANGELOG_ICONS:
STAGE_CHANGED: GitBranch,
```

- [ ] **Step 3: Add rendering branch in `ChangelogRow` for `STAGE_CHANGED`**

Find the `ChangelogRow` function. It renders a label string — add a branch for `STAGE_CHANGED` before the fallback:

```typescript
// Inside ChangelogRow, where eventType label is determined:
if (entry.eventType === "STAGE_CHANGED" && entry.stageTransition) {
  const { fromStage, toStage } = entry.stageTransition;
  // Use existing deals translation namespace for stage labels
  // Falls back to raw stage key if translation missing
  const fromLabel = fromStage; // caller can enrich if t() available
  const toLabel = toStage;
  label = t("changelog.stageChanged", { from: fromLabel, to: toLabel });
}
```

> Because `ActivityFeed` is a client component using `useTranslations`, add the translation key lookup inline. The translation keys `changelog.stageChanged` must be added in Task 4 Step 4.

Full updated `ChangelogRow` label block (replace existing `switch` or `if/else` for eventType label):

```typescript
function getChangelogLabel(entry: ChangelogEntry, t: ReturnType<typeof useTranslations>) {
  switch (entry.eventType) {
    case "CREATED":
      return t("changelog.created");
    case "UPDATED":
      return t("changelog.updated");
    case "LINKED":
      return t("changelog.linked", {
        type: entry.linkTarget?.type ?? "",
        label: entry.linkTarget?.label ?? entry.linkTarget?.friendlyId ?? "",
      });
    case "UNLINKED":
      return t("changelog.unlinked", {
        type: entry.linkTarget?.type ?? "",
        label: entry.linkTarget?.label ?? entry.linkTarget?.friendlyId ?? "",
      });
    case "STAGE_CHANGED":
      if (entry.stageTransition) {
        return t("changelog.stageChanged", {
          from: entry.stageTransition.fromStage,
          to: entry.stageTransition.toStage,
        });
      }
      return t("changelog.updated");
    default:
      return t("changelog.updated");
  }
}
```

Then call `getChangelogLabel(entry, t)` wherever the label is rendered.

- [ ] **Step 4: Add translation keys to both locale files**

In `locales/en/common.json` (or whichever namespace `ActivityFeed` uses for changelog labels — check the existing `t("changelog.created")` call to confirm the namespace and file), add:

```json
"changelog": {
  "stageChanged": "Stage changed: {from} → {to}"
}
```

In `locales/el/common.json` add:

```json
"changelog": {
  "stageChanged": "Αλλαγή σταδίου: {from} → {to}"
}
```

> If `changelog.*` keys already exist in the file, add only the `stageChanged` key to the existing object.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "ActivityFeed"
```

Expected: no new errors (5 pre-existing errors about `Locale` and `_source` are acceptable — do not fix them here)

- [ ] **Step 6: Commit**

```bash
git add components/activity/ActivityFeed.tsx locales/en/common.json locales/el/common.json
git commit -m "feat(activity-feed): render STAGE_CHANGED changelog entries with GitBranch icon"
```

---

### Task 5: Remove `DealStageHistory` from DealView and delete the file

**Files:**
- Modify: `app/[locale]/app/(routes)/deals/[dealId]/components/DealView.tsx`
- Delete: `app/[locale]/app/(routes)/deals/[dealId]/components/DealStageHistory.tsx`

- [ ] **Step 1: Remove DealStageHistory from DealView**

In `DealView.tsx`:

1. Remove the import line:
   ```typescript
   import { DealStageHistory } from "./DealStageHistory";
   ```

2. Remove the usage at line ~481 in the left column:
   ```tsx
   <DealStageHistory logs={deal.stageLogs ?? []} userDisplayMap={deal.userDisplayMap} />
   ```

3. Also remove any associated Card/section wrapper that only existed to contain `DealStageHistory`.

- [ ] **Step 2: Delete the DealStageHistory file**

```bash
rm "app/[locale]/app/(routes)/deals/[dealId]/components/DealStageHistory.tsx"
```

(Adjust path to absolute: `/Users/stapo/Desktop/Oikion/MVP/app/[locale]/app/(routes)/deals/[dealId]/components/DealStageHistory.tsx`)

- [ ] **Step 3: Verify TypeScript compiles with no new errors**

```bash
pnpm tsc --noEmit 2>&1 | grep -i "dealstagehistory\|DealView"
```

Expected: no errors mentioning `DealStageHistory` or `DealView`

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/deals/\[dealId\]/components/DealView.tsx
git rm app/\[locale\]/app/\(routes\)/deals/\[dealId\]/components/DealStageHistory.tsx
git commit -m "feat(deals): remove DealStageHistory card — stage transitions now in unified ActivityFeed"
```

---

### Task 6: Add `unified` prop to DealView's `ActivityFeed` and RequestView's `ActivityFeed`

**Files:**
- Modify: `app/[locale]/app/(routes)/deals/[dealId]/components/DealView.tsx`
- Modify: `app/[locale]/app/(routes)/requests/[requestId]/components/RequestView.tsx`

- [ ] **Step 1: Update DealView**

Find the `ActivityFeed` in the right aside of `DealView.tsx` (lines ~619-625):

```tsx
// Before:
<ActivityFeed parentType="DEAL" parentId={deal.id} />

// After:
<ActivityFeed parentType="DEAL" parentId={deal.id} unified />
```

- [ ] **Step 2: Update RequestView**

Find the `ActivityFeed` in `RequestView.tsx` (lines ~413-420):

```tsx
// Before:
<ActivityFeed parentType="REQUEST" parentId={request.id} />

// After:
<ActivityFeed parentType="REQUEST" parentId={request.id} unified />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep -i "RequestView\|DealView"
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/deals/\[dealId\]/components/DealView.tsx
git add app/\[locale\]/app/\(routes\)/requests/\[requestId\]/components/RequestView.tsx
git commit -m "feat(activity): enable unified feed on DealView and RequestView"
```

---

### Task 7: Create shared `EntityActivityPanel` component

**Files:**
- Create: `components/activity/EntityActivityPanel.tsx`

- [ ] **Step 1: Write the component**

Create `components/activity/EntityActivityPanel.tsx`:

```typescript
"use client";

import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import type { ActivityParentType } from "@/hooks/swr/useActivities";

interface EntityActivityPanelProps {
  parentType: ActivityParentType;
  parentId: string;
  onSuccess?: () => void;
}

/**
 * Shared inner content for the Activity section in entity detail views.
 * Renders QuickLogActivity + unified ActivityFeed (activities + changelog merged).
 * Does NOT include a Card wrapper — compose inside the entity view's own Card or TabsContent.
 */
export function EntityActivityPanel({
  parentType,
  parentId,
  onSuccess,
}: EntityActivityPanelProps) {
  return (
    <div className="space-y-4">
      <QuickLogActivity
        parentType={parentType}
        parentId={parentId}
        onSuccess={onSuccess ?? (() => {})}
      />
      <ActivityFeed parentType={parentType} parentId={parentId} unified />
    </div>
  );
}
```

- [ ] **Step 2: Export from `components/activity/index.ts`** (or wherever ActivityFeed is exported — check the existing barrel file)

If `components/activity/index.ts` exists:

```typescript
export { EntityActivityPanel } from "./EntityActivityPanel";
```

If no barrel file exists, skip this step (importers will use the direct path).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "EntityActivityPanel"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/activity/EntityActivityPanel.tsx
git commit -m "feat(activity): create shared EntityActivityPanel component"
```

---

### Task 8: Wire `EntityActivityPanel` into all 4 entity views

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx`
- Modify: `app/[locale]/app/(routes)/deals/[dealId]/components/DealView.tsx`

> In each file: add the import, replace the `QuickLogActivity` + `ActivityFeed` pair with `<EntityActivityPanel>`.

#### ContactView

- [ ] **Step 1: Update ContactView**

In `ContactView.tsx`, find the activity `TabsContent` (lines ~640-654):

```tsx
// Before:
<TabsContent value="activity" className="mt-6 space-y-4">
  <QuickLogActivity parentType="CONTACT" parentId={contact.id} onSuccess={() => {}} />
  <ActivityFeed parentType="CONTACT" parentId={contact.id} unified />
</TabsContent>

// After:
<TabsContent value="activity" className="mt-6">
  <EntityActivityPanel parentType="CONTACT" parentId={contact.id} />
</TabsContent>
```

Add import:
```typescript
import { EntityActivityPanel } from "@/components/activity/EntityActivityPanel";
```

Remove now-unused imports of `QuickLogActivity` and `ActivityFeed` from this file if they are not used elsewhere in it.

#### PropertyView

- [ ] **Step 2: Update PropertyView**

Find the activity section in `PropertyView.tsx`. Replace:

```tsx
// Before:
<QuickLogActivity parentType="PROPERTY" parentId={property.id} onSuccess={() => {}} />
<ActivityFeed parentType="PROPERTY" parentId={property.id} unified />

// After:
<EntityActivityPanel parentType="PROPERTY" parentId={property.id} />
```

Add import, remove unused imports.

#### MandateView

- [ ] **Step 3: Update MandateView**

Find the activity card in `MandateView.tsx`. Replace:

```tsx
// Before:
<QuickLogActivity parentType="REQUEST" parentId={mandate.id} onSuccess={() => {}} />
<ActivityFeed parentType="REQUEST" parentId={mandate.id} unified />

// After:
<EntityActivityPanel parentType="REQUEST" parentId={mandate.id} />
```

Add import, remove unused imports.

#### DealView

- [ ] **Step 4: Update DealView**

Find the activity section in the right aside of `DealView.tsx` (the one that already has `ActivityFeed unified` from Task 6). Replace:

```tsx
// Before (after Task 6):
<QuickLogActivity parentType="DEAL" parentId={deal.id} onSuccess={() => {}} />
<ActivityFeed parentType="DEAL" parentId={deal.id} unified />

// After:
<EntityActivityPanel parentType="DEAL" parentId={deal.id} />
```

Add import, remove unused imports.

- [ ] **Step 5: Verify TypeScript compiles across all 4 files**

```bash
pnpm tsc --noEmit 2>&1 | grep -i "ContactView\|PropertyView\|MandateView\|DealView"
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add \
  app/\[locale\]/app/\(routes\)/crm/contacts/\[contactId\]/components/ContactView.tsx \
  app/\[locale\]/app/\(routes\)/mls/properties/\[slug\]/components/PropertyView.tsx \
  app/\[locale\]/app/\(routes\)/mandates/\[slug\]/components/MandateView.tsx \
  app/\[locale\]/app/\(routes\)/deals/\[dealId\]/components/DealView.tsx
git commit -m "feat(activity): wire EntityActivityPanel into all 4 entity views"
```

---

### Task 9: Final verification

**Files:** (read-only verification pass)

- [ ] **Step 1: Run full test suite**

```bash
pnpm vitest run
```

Expected: No new failures beyond the 5 pre-existing failures (`encryption.test.ts`, `activities.test.ts`, `batch-engine.test.ts`).

- [ ] **Step 2: Run full TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | head -60
```

Expected: No new errors beyond the 5 pre-existing ones (`Cannot find name 'Locale'` and `Property '_source' does not exist` in `ActivityFeed.tsx`).

- [ ] **Step 3: Confirm DealStageHistory is fully gone**

```bash
grep -r "DealStageHistory" /Users/stapo/Desktop/Oikion/MVP/app --include="*.tsx" --include="*.ts"
```

Expected: zero results

- [ ] **Step 4: Confirm all 4 entity views use EntityActivityPanel**

```bash
grep -r "EntityActivityPanel" /Users/stapo/Desktop/Oikion/MVP/app --include="*.tsx"
```

Expected: 4 matches — one per entity view (ContactView, PropertyView, MandateView, DealView)

- [ ] **Step 5: Confirm unified feed is wired on all ActivityFeed instances in entity views**

```bash
grep -r "ActivityFeed" /Users/stapo/Desktop/Oikion/MVP/app --include="*.tsx"
```

Expected: Only `EntityActivityPanel.tsx` uses `<ActivityFeed unified />` directly. Entity views should only reference `EntityActivityPanel`.

- [ ] **Step 6: Final commit (if any cleanup needed)**

```bash
git add -p   # Stage any minor cleanup
git commit -m "chore(activity): final verification pass — consolidated timeline complete"
```

---

## Migration Note for Developer

Before deploying, run locally:

```bash
pnpm prisma migrate dev --name add_stage_changed_event_type
```

Or in production, apply the SQL directly:

```sql
ALTER TYPE "EntityChangeEventType" ADD VALUE 'STAGE_CHANGED';
```

Then regenerate the Prisma client:

```bash
pnpm prisma generate
```

---

## Self-Review

**Spec coverage:**
- ✅ `STAGE_CHANGED` added to enum (Task 1)
- ✅ `createChangeLogEntry` extended (Task 2)
- ✅ Stage transitions wired in deal API (Task 3)
- ✅ ActivityFeed renders STAGE_CHANGED (Task 4)
- ✅ DealStageHistory deleted (Task 5)
- ✅ `unified` prop on DealView + RequestView (Task 6)
- ✅ `EntityActivityPanel` created (Task 7)
- ✅ All 4 entity views use EntityActivityPanel (Task 8)
- ✅ Final verification (Task 9)

**Placeholder scan:** No TBD/TODO in code blocks. All signatures, paths, and commands are concrete.

**Type consistency:**
- `StageTransition` interface defined in Task 2 and referenced by same name in Task 3 and Task 4.
- `ActivityParentType` imported from `@/hooks/swr/useActivities` in `EntityActivityPanel` — same import path used by `ActivityFeed`.
- `ChangelogEntry.stageTransition` added in Task 4 matches shape defined in Task 2.
