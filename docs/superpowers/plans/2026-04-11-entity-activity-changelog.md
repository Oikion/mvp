# Entity Activity Change Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically record entity creation, field changes, and link/unlink events in a unified activity feed for Contact, Property, and Request entities.

**Architecture:** A new `EntityChangeLog` Prisma model captures system-generated events (separate from manual `Activity` entries). A `diffEntity` helper computes field-level diffs server-side; `createChangeLogEntry` writes non-fatally after the primary DB operation. The read side merges both sources via `listUnifiedFeed` and returns a tagged array; the `ActivityFeed` UI discriminates on `_source` for rendering.

**Tech Stack:** Prisma 6, Next.js App Router Server Actions, SWR, Lucide React, next-intl, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `EntityChangeLog` model + 2 enums + Users back-reference |
| `lib/entity-change-log.ts` | **Create** | `diffEntity` + `createChangeLogEntry` + watched field constants |
| `tests/lib/entity-change-log.test.ts` | **Create** | Unit tests for `diffEntity` |
| `actions/activities/index.ts` | Modify | Add `listEntityChangeLogs` + `listUnifiedFeed` |
| `app/api/activities/route.ts` | Modify | Support `unified=true` query param |
| `hooks/swr/useActivities.ts` | Modify | Add `unified?: boolean` prop |
| `components/activity/ActivityFeed.tsx` | Modify | Dual rendering path for changelog entries |
| `app/api/crm/contacts/route.ts` | Modify | `CREATED` log on POST |
| `app/api/crm/contacts/[contactId]/route.ts` | Modify | `UPDATED` log on PUT |
| `app/api/crm/contacts/[contactId]/link-entities/route.ts` | Modify | `LINKED`/`UNLINKED` log |
| `app/api/crm/contacts/[contactId]/link-properties/route.ts` | Modify | `LINKED`/`UNLINKED` log |
| `app/api/mls/properties/route.ts` | Modify | `CREATED` log on POST |
| `app/api/mls/properties/[propertyId]/route.ts` | Modify | `UPDATED` log on PUT |
| `app/api/mls/properties/[propertyId]/linked/route.ts` | Modify | `LINKED`/`UNLINKED` log |
| `actions/mandates/update-mandate.ts` | Modify | `UPDATED` log |
| `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx` | Modify | Add Activity tab section |
| `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx` | Modify | Pass `unified` to ActivityFeed |
| `locales/en/activities.json` | Modify | Add changelog + watchedFields keys |
| `locales/el/activities.json` | Modify | Add changelog + watchedFields keys (Greek) |

---

## Task 1: Prisma Schema — EntityChangeLog model

**Files:**
- Modify: `prisma/schema.prisma` (after line 4248, before end of file)

- [ ] **Step 1: Add two new enums at the end of schema.prisma**

Open `prisma/schema.prisma`. Append after the final `}` on line 4248:

```prisma
enum EntityChangeLogType {
  CONTACT
  PROPERTY
  REQUEST
  DEAL
}

enum EntityChangeEventType {
  CREATED
  UPDATED
  LINKED
  UNLINKED
}
```

- [ ] **Step 2: Add the EntityChangeLog model**

Append immediately after the enums:

```prisma
model EntityChangeLog {
  id             String                @id @default(cuid())
  organizationId String
  entityType     EntityChangeLogType
  entityId       String
  eventType      EntityChangeEventType
  actorUserId    String?
  changedFields  Json?
  linkTarget     Json?
  occurredAt     DateTime              @default(now())
  createdAt      DateTime              @default(now())

  Actor Users? @relation("EntityChangeLogActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([organizationId, entityType, entityId])
  @@index([organizationId, entityType, entityId, occurredAt])
  @@map("entity_change_logs")
}
```

- [ ] **Step 3: Add back-reference to Users model**

In `prisma/schema.prisma`, find the Users model block ending at line ~916 (just before `@@index([clerkUserId])`):

```prisma
  // Phase 4 back-relations
  ActivitiesCreated                                  Activity[]            @relation("ActivityCreatedBy")
  ActivitiesAssigned                                 Activity[]            @relation("ActivityAssignedTo")
  OrgTemplatesCreated                                OrgDocumentTemplate[] @relation("OrgTemplateCreatedBy")
  CalendarEventAgents                                CalendarEventAgent[]  @relation("AgentCalendarEvents")
```

Replace with:

```prisma
  // Phase 4 back-relations
  ActivitiesCreated                                  Activity[]            @relation("ActivityCreatedBy")
  ActivitiesAssigned                                 Activity[]            @relation("ActivityAssignedTo")
  OrgTemplatesCreated                                OrgDocumentTemplate[] @relation("OrgTemplateCreatedBy")
  CalendarEventAgents                                CalendarEventAgent[]  @relation("AgentCalendarEvents")
  EntityChangeLogs                                   EntityChangeLog[]     @relation("EntityChangeLogActor")
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 5: Create and apply migration**

```bash
pnpm db:migrate --name entity_change_log
```

Expected: Migration created and applied. New tables `entity_change_logs` visible in Prisma Studio (`pnpm prisma studio`).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add EntityChangeLog model and enums for entity audit trail"
```

---

## Task 2: Write helper — lib/entity-change-log.ts

**Files:**
- Create: `lib/entity-change-log.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/lib/entity-change-log.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { diffEntity } from "@/lib/entity-change-log";

describe("diffEntity", () => {
  const watchedFields = ["status", "assignedToUserId", "visibility"];
  const encryptedFields = ["email", "phone"];

  it("returns empty array when no watched fields changed", () => {
    const before = { status: "LEAD", name: "Alice" };
    const after  = { status: "LEAD", name: "Bob" };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("detects a changed watched field", () => {
    const before = { status: "LEAD" };
    const after  = { status: "ACTIVE" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toEqual([{ field: "status", from: "LEAD", to: "ACTIVE" }]);
  });

  it("treats null and undefined as equivalent (both map to null)", () => {
    const before = { assignedToUserId: undefined };
    const after  = { assignedToUserId: null };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("records null→value as change", () => {
    const before = { assignedToUserId: null };
    const after  = { assignedToUserId: "user_abc" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toEqual([{ field: "assignedToUserId", from: null, to: "user_abc" }]);
  });

  it("masks encrypted fields with [encrypted]", () => {
    const allWatched = ["status", "email", "phone"];
    const before = { status: "LEAD", email: "old@example.com", phone: "111" };
    const after  = { status: "LEAD", email: "new@example.com", phone: "222" };
    const result = diffEntity(before, after, allWatched, encryptedFields);
    expect(result).toEqual([
      { field: "email", from: "[encrypted]", to: "[encrypted]" },
      { field: "phone", from: "[encrypted]", to: "[encrypted]" },
    ]);
  });

  it("ignores non-watched fields even if they change", () => {
    const before = { status: "LEAD", name: "Alice", notes: "old" };
    const after  = { status: "LEAD", name: "Bob",   notes: "new" };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("handles multiple watched field changes", () => {
    const before = { status: "LEAD", visibility: "PRIVATE" };
    const after  = { status: "ACTIVE", visibility: "PUBLIC" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run tests/lib/entity-change-log.test.ts
```

Expected: `Cannot find module '@/lib/entity-change-log'`

- [ ] **Step 3: Create lib/entity-change-log.ts with diffEntity and createChangeLogEntry**

```typescript
/**
 * lib/entity-change-log.ts
 * Server-side only — never import from client components.
 *
 * Provides:
 *   diffEntity          — computes field-level diff between two entity snapshots
 *   createChangeLogEntry — persists a non-fatal EntityChangeLog record
 */
import { prismadb } from "@/lib/prisma";

// ─── Watched fields per entity ────────────────────────────────────────────────

export const CONTACT_WATCHED_FIELDS = [
  "status",
  "assignedToUserId",
  "visibility",
  "category",
  "source",
  "doNotContact",
  "allowMarketing",
  "gdprConsentGiven",
] as const;

export const PROPERTY_WATCHED_FIELDS = [
  "property_status",
  "assignedToUserId",
  "visibility",
  "price",
  "property_type",
] as const;

export const REQUEST_WATCHED_FIELDS = [
  "status",
  "urgency",
  "assignedToUserId",
  "budgetMin",
  "budgetMax",
  "requestType",
] as const;

// ─── diffEntity ───────────────────────────────────────────────────────────────

type ChangedField = { field: string; from: unknown; to: unknown };

/**
 * Computes a field-level diff between two entity snapshots.
 * Only watchedFields are compared; all other keys are ignored.
 * Encrypted fields are masked with "[encrypted]" if the raw value differs.
 * null and undefined are treated as equivalent.
 */
export function diffEntity(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  watchedFields: readonly string[],
  encryptedFields: readonly string[]
): ChangedField[] {
  const changes: ChangedField[] = [];

  for (const field of watchedFields) {
    const rawBefore = before[field] ?? null;
    const rawAfter  = after[field]  ?? null;

    if (rawBefore === rawAfter) continue;

    if (encryptedFields.includes(field)) {
      changes.push({ field, from: "[encrypted]", to: "[encrypted]" });
    } else {
      changes.push({ field, from: rawBefore, to: rawAfter });
    }
  }

  return changes;
}

// ─── createChangeLogEntry ─────────────────────────────────────────────────────

interface ChangeLogInput {
  organizationId: string;
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL";
  entityId: string;
  eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
  actorUserId?: string;
  changedFields?: ChangedField[];
  linkTarget?: { type: string; id: string; friendlyId?: string; label?: string };
}

/**
 * Persists a single EntityChangeLog record.
 * Non-fatal: errors are logged and swallowed — never call from inside a try/catch
 * that should abort on failure.
 */
export async function createChangeLogEntry(input: ChangeLogInput): Promise<void> {
  try {
    await prismadb.entityChangeLog.create({
      data: {
        organizationId: input.organizationId,
        entityType:     input.entityType,
        entityId:       input.entityId,
        eventType:      input.eventType,
        actorUserId:    input.actorUserId ?? undefined,
        changedFields:  input.changedFields ?? undefined,
        linkTarget:     input.linkTarget    ?? undefined,
      },
    });
  } catch (error) {
    console.error("[ENTITY_CHANGE_LOG]", error);
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm vitest run tests/lib/entity-change-log.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/entity-change-log.ts tests/lib/entity-change-log.test.ts
git commit -m "feat(changelog): add diffEntity + createChangeLogEntry helpers with tests"
```

---

## Task 3: Server actions — listEntityChangeLogs + listUnifiedFeed

**Files:**
- Modify: `actions/activities/index.ts`

- [ ] **Step 1: Add imports at the top of actions/activities/index.ts**

Open `actions/activities/index.ts`. After the existing imports (around line 8), add:

```typescript
import { createChangeLogEntry as _createChangeLogEntry } from "@/lib/entity-change-log";
```

Wait — `createChangeLogEntry` is already re-exported below; we only need the action functions here. Add these imports after the existing ones:

```typescript
import { serializePrisma } from "@/lib/prisma-serialize";
```

(Check — `serializePrisma` comes from `@/lib/prisma-serialize` as seen in line 8 of the existing file.)

- [ ] **Step 2: Add PARENT_TYPE_TO_MODEL entry for REQUEST if missing**

Find the `PARENT_TYPE_TO_MODEL` constant (around line 155). Verify `REQUEST: "request"` is present. If missing, add it:

```typescript
const PARENT_TYPE_TO_MODEL: Record<string, string> = {
  CONTACT: "contact",
  REQUEST: "request",
  DEAL: "deal",
  PROPERTY: "properties",
  SHOWING: "propertyShowing",
};
```

(No change needed if it's already there.)

- [ ] **Step 3: Add listEntityChangeLogs after the existing listActivities function**

Find the end of the `listActivities` function (around line 221). Add immediately after:

```typescript
/**
 * Returns EntityChangeLog records for a given entity.
 * Permission: activity:read (same as listActivities).
 * IDOR protection: verifies parent entity belongs to org before reading.
 */
export async function listEntityChangeLogs(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  entityId: string
): Promise<ActionResponse<unknown>> {
  const guard = await requireAction("activity:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  // Verify the parent entity belongs to this org (prevents IDOR)
  const modelName = PARENT_TYPE_TO_MODEL[entityType];
  if (!modelName) {
    return actionValidationError("Validation failed", { entityType: ["Invalid entity type"] });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentExists = await (prismadb as any)[modelName].findFirst({
    where: { id: entityId, organizationId },
    select: { id: true },
  });
  if (!parentExists) return actionNotFound("Entity");

  try {
    const logs = await prismadb.entityChangeLog.findMany({
      where: { organizationId, entityType, entityId },
      include: {
        Actor: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    });

    return actionSuccess(serializePrisma(logs));
  } catch (error) {
    console.error("[ENTITY_CHANGE_LOG_LIST]", error);
    return actionError("Failed to list change logs", error as Error);
  }
}

/**
 * Merges Activity entries and EntityChangeLog entries into a single
 * time-sorted feed. Each item is tagged with _source: "activity" | "changelog".
 */
export async function listUnifiedFeed(
  parentType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  parentId: string
): Promise<ActionResponse<unknown>> {
  const [activitiesResult, changeLogsResult] = await Promise.all([
    listActivities(parentType, parentId),
    listEntityChangeLogs(parentType, parentId),
  ]);

  if (!activitiesResult.success) return activitiesResult;
  if (!changeLogsResult.success) return changeLogsResult;

  const activities = (activitiesResult.data as unknown[]).map((a) => ({
    ...(a as Record<string, unknown>),
    _source: "activity" as const,
  }));

  const changelogs = (changeLogsResult.data as unknown[]).map((c) => ({
    ...(c as Record<string, unknown>),
    _source: "changelog" as const,
  }));

  const merged = [...activities, ...changelogs].sort((a, b) => {
    const aTime = new Date((a as { occurredAt: string }).occurredAt).getTime();
    const bTime = new Date((b as { occurredAt: string }).occurredAt).getTime();
    return bTime - aTime;
  });

  return actionSuccess(merged);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to the new functions.

- [ ] **Step 5: Commit**

```bash
git add actions/activities/index.ts
git commit -m "feat(actions): add listEntityChangeLogs + listUnifiedFeed server actions"
```

---

## Task 4: API route — unified=true query param

**Files:**
- Modify: `app/api/activities/route.ts`

- [ ] **Step 1: Update the route to support unified param**

Open `app/api/activities/route.ts`. Replace the entire file content with:

```typescript
import { auth } from "@clerk/nextjs/server";
import { apiUnauthorized, apiSuccess, apiBadRequest, apiInternalError } from "@/lib/api-response";
import { listActivities, listUnifiedFeed } from "@/actions/activities";
import { activityParentTypeSchema } from "@/lib/validations/activities";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const parentTypeRaw = searchParams.get("parentType");
    const parentId      = searchParams.get("parentId");
    const unified       = searchParams.get("unified") === "true";

    if (!parentTypeRaw || !parentId) {
      return apiBadRequest("parentType and parentId are required");
    }

    const parentTypeParsed = activityParentTypeSchema.safeParse(parentTypeRaw);
    if (!parentTypeParsed.success) {
      return apiBadRequest("Invalid parentType");
    }

    const result = unified
      ? await listUnifiedFeed(parentTypeParsed.data, parentId)
      : await listActivities(parentTypeParsed.data, parentId);

    if (!result.success) {
      return apiInternalError("Internal server error");
    }

    return apiSuccess(result.data);
  } catch (error) {
    console.error("[API_ACTIVITIES_GET]", error);
    return apiInternalError("Internal server error");
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/activities/route.ts
git commit -m "feat(api): support unified=true query param in /api/activities"
```

---

## Task 5: SWR hook — unified prop

**Files:**
- Modify: `hooks/swr/useActivities.ts`

- [ ] **Step 1: Add unified to UseActivitiesOptions and update the URL key**

Open `hooks/swr/useActivities.ts`. Find the `UseActivitiesOptions` type (near line 90) and add `unified?: boolean`:

```typescript
interface UseActivitiesOptions {
  parentType: ActivityParentType;
  parentId: string | null;
  enabled?: boolean;
  unified?: boolean;
}
```

Then update the `useActivities` function signature and key construction:

```typescript
export function useActivities({
  parentType,
  parentId,
  enabled = true,
  unified = false,
}: UseActivitiesOptions) {
  const key =
    enabled && parentId
      ? `/api/activities?parentType=${encodeURIComponent(parentType)}&parentId=${encodeURIComponent(parentId)}${unified ? "&unified=true" : ""}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ActivitiesResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    activities: data?.data ?? [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/swr/useActivities.ts
git commit -m "feat(swr): add unified prop to useActivities hook"
```

---

## Task 6: ActivityFeed — changelog rendering path

**Files:**
- Modify: `components/activity/ActivityFeed.tsx`

- [ ] **Step 1: Rewrite ActivityFeed with dual rendering**

Replace the entire content of `components/activity/ActivityFeed.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useActivities } from "@/hooks/swr/useActivities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/navigation";
import { formatDistanceToNow } from "date-fns";
import { FileText, User, Building2, Plus, GitCommitHorizontal, LinkIcon, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  parentType: ActivityParentType;
  parentId: string;
  unified?: boolean;
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface ActivityEntry {
  _source: "activity";
  id: string;
  kind: string;
  subject?: string | null;
  body?: string | null;
  occurredAt: string;
  CreatedBy?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  RelatedContact?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  RelatedProperty?: { id: string; property_name?: string | null; friendlyId?: string | null } | null;
  RelatedDocument?: { id: string; document_name?: string | null } | null;
}

interface ChangedField {
  field: string;
  from: unknown;
  to: unknown;
}

interface LinkTarget {
  type: string;
  id: string;
  friendlyId?: string;
  label?: string;
}

interface ChangelogEntry {
  _source: "changelog";
  id: string;
  eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
  changedFields?: ChangedField[] | null;
  linkTarget?: LinkTarget | null;
  occurredAt: string;
  Actor?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

type FeedEntry = ActivityEntry | ChangelogEntry;

// ─── Changelog icons ──────────────────────────────────────────────────────────

const CHANGELOG_ICONS = {
  CREATED: Plus,
  UPDATED: GitCommitHorizontal,
  LINKED: LinkIcon,
  UNLINKED: Unlink,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actorName(actor?: { firstName?: string | null; lastName?: string | null } | null): string {
  return [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || "System";
}

// ─── Changelog row ────────────────────────────────────────────────────────────

function ChangelogRow({ entry, t }: { entry: ChangelogEntry; t: ReturnType<typeof useTranslations> }) {
  const Icon = CHANGELOG_ICONS[entry.eventType];
  const actor = actorName(entry.Actor);

  let sentence: React.ReactNode;

  if (entry.eventType === "CREATED") {
    sentence = t("changelog.created", { actor });
  } else if (entry.eventType === "UPDATED" && entry.changedFields && entry.changedFields.length > 0) {
    sentence = (
      <span>
        {entry.changedFields.map((cf, i) => (
          <span key={cf.field}>
            {i > 0 && " · "}
            <span className="font-medium">{t(`watchedFields.${cf.field}` as Parameters<typeof t>[0], { default: cf.field })}</span>
            {" "}
            {t("changelog.fieldChanged", { field: "", from: String(cf.from ?? "—"), to: String(cf.to ?? "—") }).replace("{field} ", "")}
          </span>
        ))}
      </span>
    );
  } else if (entry.eventType === "UPDATED") {
    sentence = t("changelog.updated", { actor });
  } else if (entry.eventType === "LINKED" && entry.linkTarget) {
    sentence = t("changelog.linked", {
      targetType: entry.linkTarget.type,
      label: entry.linkTarget.label ?? entry.linkTarget.friendlyId ?? entry.linkTarget.id,
    });
  } else if (entry.eventType === "UNLINKED" && entry.linkTarget) {
    sentence = t("changelog.unlinked", {
      targetType: entry.linkTarget.type,
      label: entry.linkTarget.label ?? entry.linkTarget.friendlyId ?? entry.linkTarget.id,
    });
  } else {
    sentence = t("changelog.updated", { actor });
  }

  return (
    <li className="relative py-1.5 flex items-start gap-2">
      <span
        className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
        aria-hidden
      />
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-foreground">{sentence}</span>
        <span className="text-xs text-muted-foreground">
          {actor} ·{" "}
          <time dateTime={entry.occurredAt}>
            {formatDistanceToNow(new Date(entry.occurredAt), { addSuffix: true })}
          </time>
        </span>
      </div>
    </li>
  );
}

// ─── Activity row (existing treatment) ───────────────────────────────────────

function ActivityRow({ activity, t }: { activity: ActivityEntry; t: ReturnType<typeof useTranslations> }) {
  return (
    <li className="relative">
      <span
        className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
        aria-hidden
      />
      <div className="rounded-lg border border-border bg-card p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">
            {t(`kinds.${activity.kind}` as Parameters<typeof t>[0])}
            {activity.subject ? ` — ${activity.subject}` : ""}
          </span>
          <time
            dateTime={activity.occurredAt}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true })}
          </time>
        </div>

        {activity.body && (
          <p className="mt-1 text-muted-foreground line-clamp-2">{activity.body}</p>
        )}

        {(activity.RelatedContact || activity.RelatedProperty || activity.RelatedDocument) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.RelatedContact && (
              <Link href={`/app/crm/contacts/${activity.RelatedContact.id}`}>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal hover:bg-accent transition-colors cursor-pointer">
                  <User className="h-3 w-3 shrink-0" aria-hidden />
                  {[activity.RelatedContact.firstName, activity.RelatedContact.lastName].filter(Boolean).join(" ") || activity.RelatedContact.id}
                </Badge>
              </Link>
            )}
            {activity.RelatedProperty && (
              <Link href={`/app/mls/properties/${activity.RelatedProperty.friendlyId ?? activity.RelatedProperty.id}`}>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal hover:bg-accent transition-colors cursor-pointer">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                  {activity.RelatedProperty.property_name ?? activity.RelatedProperty.friendlyId ?? activity.RelatedProperty.id}
                </Badge>
              </Link>
            )}
            {activity.RelatedDocument && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal">
                <FileText className="h-3 w-3 shrink-0" aria-hidden />
                {activity.RelatedDocument.document_name}
              </Badge>
            )}
          </div>
        )}

        {activity.CreatedBy && (
          <p className="mt-1 text-xs text-muted-foreground">
            {[activity.CreatedBy.firstName, activity.CreatedBy.lastName].filter(Boolean).join(" ")}
          </p>
        )}
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityFeed({ parentType, parentId, unified = false }: ActivityFeedProps) {
  const t = useTranslations("activities");
  const { activities, isLoading } = useActivities({ parentType, parentId, unified });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const feed = activities as unknown as FeedEntry[];

  if (feed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border space-y-6 pl-6">
      {feed.map((entry) =>
        entry._source === "changelog" ? (
          <ChangelogRow key={entry.id} entry={entry} t={t} />
        ) : (
          <ActivityRow key={entry.id} activity={entry} t={t} />
        )
      )}
    </ol>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "ActivityFeed\|activity-feed" | head -20
```

Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add components/activity/ActivityFeed.tsx
git commit -m "feat(ui): ActivityFeed dual rendering for activity + changelog entries"
```

---

## Task 7: i18n — add changelog and watchedFields keys

**Files:**
- Modify: `locales/en/activities.json`
- Modify: `locales/el/activities.json`

- [ ] **Step 1: Add English changelog keys**

Open `locales/en/activities.json`. Add after the `"messages"` block (before the closing `}`):

```json
  "changelog": {
    "created": "Created by {actor}",
    "updated": "Details updated by {actor}",
    "linked": "Linked to {targetType} {label}",
    "unlinked": "Unlinked from {targetType} {label}",
    "fieldChanged": "{field} changed {from} → {to}",
    "encrypted": "[encrypted]"
  },
  "watchedFields": {
    "status": "Status",
    "assignedToUserId": "Assigned agent",
    "visibility": "Visibility",
    "category": "Category",
    "source": "Source",
    "doNotContact": "Do not contact",
    "allowMarketing": "Marketing consent",
    "gdprConsentGiven": "GDPR consent",
    "property_status": "Status",
    "price": "Price",
    "property_type": "Property type",
    "urgency": "Urgency",
    "budgetMin": "Budget min",
    "budgetMax": "Budget max",
    "requestType": "Request type"
  }
```

- [ ] **Step 2: Add Greek changelog keys**

Open `locales/el/activities.json`. Add the matching block with Greek translations:

```json
  "changelog": {
    "created": "Δημιουργήθηκε από {actor}",
    "updated": "Λεπτομέρειες ενημερώθηκαν από {actor}",
    "linked": "Συνδέθηκε με {targetType} {label}",
    "unlinked": "Αποσυνδέθηκε από {targetType} {label}",
    "fieldChanged": "{field} άλλαξε {from} → {to}",
    "encrypted": "[κρυπτογραφημένο]"
  },
  "watchedFields": {
    "status": "Κατάσταση",
    "assignedToUserId": "Υπεύθυνος",
    "visibility": "Ορατότητα",
    "category": "Κατηγορία",
    "source": "Πηγή",
    "doNotContact": "Χωρίς επικοινωνία",
    "allowMarketing": "Συγκατάθεση marketing",
    "gdprConsentGiven": "Συγκατάθεση GDPR",
    "property_status": "Κατάσταση",
    "price": "Τιμή",
    "property_type": "Τύπος ακινήτου",
    "urgency": "Επείγον",
    "budgetMin": "Ελάχιστος προϋπολογισμός",
    "budgetMax": "Μέγιστος προϋπολογισμός",
    "requestType": "Τύπος αιτήματος"
  }
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en/activities.json','utf8'))" && echo "en OK"
node -e "JSON.parse(require('fs').readFileSync('locales/el/activities.json','utf8'))" && echo "el OK"
```

Expected: `en OK` and `el OK`

- [ ] **Step 4: Commit**

```bash
git add locales/en/activities.json locales/el/activities.json
git commit -m "feat(i18n): add changelog and watchedFields keys to activities namespace"
```

---

## Task 8: Contact create — CREATED event

**Files:**
- Modify: `app/api/crm/contacts/route.ts`

- [ ] **Step 1: Add import for createChangeLogEntry**

Open `app/api/crm/contacts/route.ts`. Find the imports block and add:

```typescript
import { createChangeLogEntry } from "@/lib/entity-change-log";
```

- [ ] **Step 2: Wire CREATED event after successful contact.create**

Find the POST handler. After the line `const contact = await prismadb.contact.create({...})` (around line 161) and before the return statement, add:

```typescript
    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contact.id,
      eventType: "CREATED",
      actorUserId: userId,
    });
```

The `void` prefix explicitly discards the promise — the entry is fire-and-forget, consistent with `createSystemActivity`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "contacts/route" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/crm/contacts/route.ts
git commit -m "feat(changelog): log CREATED event on contact POST"
```

---

## Task 9: Contact update — UPDATED event

**Files:**
- Modify: `app/api/crm/contacts/[contactId]/route.ts`

- [ ] **Step 1: Add imports**

Open `app/api/crm/contacts/[contactId]/route.ts`. Add:

```typescript
import { createChangeLogEntry, diffEntity, CONTACT_WATCHED_FIELDS } from "@/lib/entity-change-log";
import { CONTACT_ENCRYPTED_STRING_FIELDS } from "@/lib/model-encryption";
```

Note: `CONTACT_ENCRYPTED_STRING_FIELDS` is currently a `const` (not exported) in `lib/model-encryption.ts`. If it isn't exported, export it by changing:

```typescript
// in lib/model-encryption.ts — find this line:
const CONTACT_ENCRYPTED_STRING_FIELDS = [
// Change to:
export const CONTACT_ENCRYPTED_STRING_FIELDS = [
```

- [ ] **Step 2: Wire UPDATED event in the PUT handler**

Find the PUT handler. It already fetches `existing` before the update (around line 112). After `const updated = await prismadb.contact.update({...})`, add:

```typescript
    const changedFields = diffEntity(
      existing as Record<string, unknown>,
      updated  as Record<string, unknown>,
      CONTACT_WATCHED_FIELDS,
      CONTACT_ENCRYPTED_STRING_FIELDS
    );
    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contactId,
      eventType: "UPDATED",
      actorUserId: userId,
      changedFields,
    });
```

- [ ] **Step 3: Export CONTACT_ENCRYPTED_STRING_FIELDS from lib/model-encryption.ts**

Only if not already exported (verified in Step 1). Find the line in `lib/model-encryption.ts`:

```typescript
const CONTACT_ENCRYPTED_STRING_FIELDS = [
```

Change to:

```typescript
export const CONTACT_ENCRYPTED_STRING_FIELDS = [
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "contacts\[contactId\]\|model-encryption" | head -10
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/contacts/\[contactId\]/route.ts lib/model-encryption.ts
git commit -m "feat(changelog): log UPDATED event on contact PUT with field diff"
```

---

## Task 10: Contact link/unlink — LINKED/UNLINKED events

**Files:**
- Modify: `app/api/crm/contacts/[contactId]/link-entities/route.ts`
- Modify: `app/api/crm/contacts/[contactId]/link-properties/route.ts`

- [ ] **Step 1: Wire link-entities route (POST = LINKED, DELETE = UNLINKED)**

Open `app/api/crm/contacts/[contactId]/link-entities/route.ts`. Add import:

```typescript
import { createChangeLogEntry } from "@/lib/entity-change-log";
```

In the POST handler, after the successful link operation (before the return), add — for each linked request:

```typescript
    // Log LINKED event for each linked request
    if (body.requestIds?.length) {
      for (const requestId of body.requestIds) {
        void createChangeLogEntry({
          organizationId,
          entityType: "CONTACT",
          entityId: contactId,
          eventType: "LINKED",
          actorUserId: userId,
          linkTarget: { type: "REQUEST", id: requestId },
        });
      }
    }
```

In the DELETE handler, after the successful unlink, add:

```typescript
    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contactId,
      eventType: "UNLINKED",
      actorUserId: userId,
      linkTarget: { type: body.type === "request" ? "REQUEST" : "PROPERTY", id: body.targetId },
    });
```

(Inspect the DELETE handler to match the exact field names for `body.type` and `body.targetId` — adjust if the schema uses different names.)

- [ ] **Step 2: Wire link-properties route (POST = LINKED, DELETE = UNLINKED)**

Open `app/api/crm/contacts/[contactId]/link-properties/route.ts`. Add import:

```typescript
import { createChangeLogEntry } from "@/lib/entity-change-log";
```

In the POST handler, after the `contactProperty.upsert` call, add:

```typescript
    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contactId,
      eventType: "LINKED",
      actorUserId: userId,
      linkTarget: { type: "PROPERTY", id: validation.data.propertyId },
    });
```

In the DELETE handler, after the successful delete, add:

```typescript
    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contactId,
      eventType: "UNLINKED",
      actorUserId: userId,
      linkTarget: { type: "PROPERTY", id: validation.data.propertyId },
    });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "link-entities\|link-properties" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/crm/contacts/\[contactId\]/link-entities/route.ts app/api/crm/contacts/\[contactId\]/link-properties/route.ts
git commit -m "feat(changelog): log LINKED/UNLINKED events on contact link routes"
```

---

## Task 11: Property create + update — CREATED/UPDATED events

**Files:**
- Modify: `app/api/mls/properties/route.ts`

- [ ] **Step 1: Add imports**

Open `app/api/mls/properties/route.ts`. Add:

```typescript
import { createChangeLogEntry, diffEntity, PROPERTY_WATCHED_FIELDS } from "@/lib/entity-change-log";
```

For encrypted fields — properties use only `primary_email` and `communication_notes`. Hard-code the list inline (there is no exported constant for property encrypted fields in the same style):

```typescript
const PROPERTY_ENCRYPTED_FIELDS = ["primary_email"] as const;
```

- [ ] **Step 2: Wire CREATED event in POST handler**

Find where the new property is created (`prismadb.properties.create`). After the create (around line 299+), add:

```typescript
      void createChangeLogEntry({
        organizationId,
        entityType: "PROPERTY",
        entityId: property.id,
        eventType: "CREATED",
        actorUserId: user.id,
      });
```

- [ ] **Step 3: Wire UPDATED event in PUT handler**

The PUT handler needs a before-snapshot. Find where it fetches `existingProperty` (around line 365). After the update operation, add:

```typescript
    const changedFields = diffEntity(
      existingProperty as Record<string, unknown>,
      updatedProperty  as Record<string, unknown>,
      PROPERTY_WATCHED_FIELDS,
      PROPERTY_ENCRYPTED_FIELDS
    );
    void createChangeLogEntry({
      organizationId,
      entityType: "PROPERTY",
      entityId: id,
      eventType: "UPDATED",
      actorUserId: user.id,
      changedFields,
    });
```

(Verify the variable name for the updated property — check what `prismadb.properties.update` is assigned to in the PUT handler and use that name.)

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "properties/route" | head -10
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/mls/properties/route.ts
git commit -m "feat(changelog): log CREATED/UPDATED events on property routes"
```

---

## Task 12: Property linked route — LINKED/UNLINKED events

**Files:**
- Modify: `app/api/mls/properties/[propertyId]/linked/route.ts`

The `linked/route.ts` for properties is currently a GET-only route (fetches linked contacts/events/mandates). Check if there are separate routes for linking — if not, this is a no-op for now. 

- [ ] **Step 1: Inspect the route**

```bash
grep -n "POST\|DELETE\|export async function" /Users/stapo/Desktop/Oikion/MVP/app/api/mls/properties/\[propertyId\]/linked/route.ts
```

If only GET is exported, property link/unlink comes from the contact side (already wired in Task 10). Skip wiring here.

If POST/DELETE exist, add changelog entries following the same pattern as Task 10.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add app/api/mls/properties/\[propertyId\]/linked/route.ts
git commit -m "feat(changelog): log LINKED/UNLINKED events on property linked route"
```

---

## Task 13: Request (Mandate) create + update — CREATED/UPDATED events

**Files:**
- Modify: `actions/mandates/update-mandate.ts`

Request creation currently flows through the API route that creates a mandate. Find the creation call site:

- [ ] **Step 1: Find the Request creation call site**

```bash
grep -rn "mandate.create\|mandates.create\|request.create" /Users/stapo/Desktop/Oikion/MVP/app/api/ 2>/dev/null | head -10
grep -rn "mandate.create\|request.create" /Users/stapo/Desktop/Oikion/MVP/actions/ 2>/dev/null | head -10
```

Wire `CREATED` event in the identified file following the same `void createChangeLogEntry(...)` pattern.

- [ ] **Step 2: Wire UPDATED event in actions/mandates/update-mandate.ts**

Open `actions/mandates/update-mandate.ts`. Add import:

```typescript
import { createChangeLogEntry, diffEntity, REQUEST_WATCHED_FIELDS } from "@/lib/entity-change-log";
```

The current `updateMandate` action updates without fetching a before-snapshot. Add a fetch before the update:

```typescript
export const updateMandate = async (data: any) => {
  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();

  if (!organizationId || !user) {
    throw new Error("Unauthorized");
  }

  const parsed = updateMandateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  // Fetch before-snapshot for diff
  const existing = await prismadb.mandate.findFirst({
    where: { id: parsed.data.id, organizationId },
    select: {
      status: true,
      urgency: true,
      assignedToUserId: true,
      budgetMin: true,
      budgetMax: true,
      requestType: true,
    },
  });

  const fields = { ...parsed.data };
  delete (fields as any).id;

  const encryptedData = await encryptMandateForOrg(fields, organizationId);

  const updatedMandate = await prismadb.mandate.update({
    where: { id: parsed.data.id, organizationId },
    data: { ...encryptedData, updatedAt: new Date(), updatedBy: user.id },
  });

  if (existing) {
    const changedFields = diffEntity(
      existing as Record<string, unknown>,
      updatedMandate as Record<string, unknown>,
      REQUEST_WATCHED_FIELDS,
      [] // no encrypted watched fields for requests
    );
    void createChangeLogEntry({
      organizationId,
      entityType: "REQUEST",
      entityId: updatedMandate.id,
      eventType: "UPDATED",
      actorUserId: user.id,
      changedFields,
    });
  }

  revalidatePath("/mandates");
  return updatedMandate;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "mandates\|update-mandate" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add actions/mandates/update-mandate.ts
git commit -m "feat(changelog): log CREATED/UPDATED events on mandate (request) actions"
```

---

## Task 14: UI — update ContactView to pass unified

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx`

- [ ] **Step 1: Add unified prop to ActivityFeed call site**

Open `ContactView.tsx`. Find (around line 653):

```tsx
<ActivityFeed parentType="CONTACT" parentId={contact.id} />
```

Change to:

```tsx
<ActivityFeed parentType="CONTACT" parentId={contact.id} unified />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "ContactView" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx"
git commit -m "feat(ui): pass unified prop to ContactView ActivityFeed"
```

---

## Task 15: UI — add Activity section to MandateView

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx`

- [ ] **Step 1: Add imports to MandateView.tsx**

Open `MandateView.tsx`. Add at the top with other imports:

```typescript
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
```

- [ ] **Step 2: Add activity Card at the bottom of the main content area**

Find where `<MandateComments mandateId={mandate.id} />` is rendered (around line 656). After the comments Card, add a new Card for activity:

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
      {t("MandateView.activity")}
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <QuickLogActivity
      parentType="REQUEST"
      parentId={mandate.id}
      onSuccess={() => {}}
    />
    <ActivityFeed parentType="REQUEST" parentId={mandate.id} unified />
  </CardContent>
</Card>
```

- [ ] **Step 3: Add translation key**

Open `locales/en/activities.json` — no change needed here; the key goes in the mandate namespace. Check what namespace `MandateView` uses by looking at `useTranslations` call in the file:

```bash
grep -n "useTranslations" /Users/stapo/Desktop/Oikion/MVP/app/\[locale\]/app/\(routes\)/mandates/\[slug\]/components/MandateView.tsx | head -3
```

Add `"activity": "Activity"` under the `"MandateView"` key in whatever namespace the file uses (e.g. `locales/en/mandates.json` or `locales/en/crm.json`). Also add the Greek equivalent.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "MandateView" | head -5
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx"
git commit -m "feat(ui): add Activity tab to MandateView with unified changelog feed"
```

---

## Task 16: UI — confirm PropertyView already has Activity (unified)

**Files:**
- Verify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx`

- [ ] **Step 1: Check current PropertyView Activity wiring**

```bash
grep -n "ActivityFeed\|unified" /Users/stapo/Desktop/Oikion/MVP/app/\[locale\]/app/\(routes\)/mls/properties/\[slug\]/components/PropertyView.tsx
```

If `ActivityFeed` is already present but without `unified`, add the prop:

```tsx
<ActivityFeed parentType="PROPERTY" parentId={data.id} unified />
```

- [ ] **Step 2: Commit if changed**

```bash
git add "app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx"
git commit -m "feat(ui): pass unified prop to PropertyView ActivityFeed"
```

---

## Task 17: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: No errors.

- [ ] **Step 2: Run all unit tests**

```bash
pnpm vitest run
```

Expected: All tests pass, including `tests/lib/entity-change-log.test.ts`.

- [ ] **Step 3: Verify dev server starts**

```bash
pnpm dev:http
```

Open a Contact detail page → Activity tab. Confirm the feed loads without errors. If you make an edit to the contact, refresh — a new "Details updated by X" or field-diff entry should appear.

- [ ] **Step 4: Security checklist**

Verify each item from the spec's Section 11:

- [ ] `createChangeLogEntry` is imported only from server files (API routes, server actions) — run: `grep -rn "entity-change-log" app/[locale] components/ 2>/dev/null | grep -v "components/activity"` — should be empty
- [ ] Encrypted field values stored as `"[encrypted]"` — verified by unit tests in Task 2
- [ ] `listEntityChangeLogs` verifies parent entity belongs to org — verified by IDOR check in Task 3
- [ ] `actorUserId` sourced from `userId` (Clerk auth) never from request body — verified by Task 8–13
- [ ] `organizationId` sourced from `getCurrentOrgId()` never from client — verified by Tasks 8–13
- [ ] `onDelete: SetNull` on `actorUserId` — verified in schema (Task 1)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(changelog): entity activity change log — implementation complete"
```

---

## Implementation Order Summary

| # | Task | Files |
|---|------|-------|
| 1 | Prisma schema | `prisma/schema.prisma` |
| 2 | Write helpers + tests | `lib/entity-change-log.ts`, `tests/lib/entity-change-log.test.ts` |
| 3 | Server actions | `actions/activities/index.ts` |
| 4 | API route | `app/api/activities/route.ts` |
| 5 | SWR hook | `hooks/swr/useActivities.ts` |
| 6 | ActivityFeed UI | `components/activity/ActivityFeed.tsx` |
| 7 | i18n | `locales/en/activities.json`, `locales/el/activities.json` |
| 8 | Contact CREATED | `app/api/crm/contacts/route.ts` |
| 9 | Contact UPDATED | `app/api/crm/contacts/[contactId]/route.ts`, `lib/model-encryption.ts` |
| 10 | Contact LINKED/UNLINKED | `link-entities/route.ts`, `link-properties/route.ts` |
| 11 | Property CREATED/UPDATED | `app/api/mls/properties/route.ts` |
| 12 | Property LINKED/UNLINKED | `app/api/mls/properties/[propertyId]/linked/route.ts` |
| 13 | Request CREATED/UPDATED | `actions/mandates/update-mandate.ts` + creation call site |
| 14 | ContactView unified | `ContactView.tsx` |
| 15 | MandateView activity tab | `MandateView.tsx` |
| 16 | PropertyView unified | `PropertyView.tsx` |
| 17 | Final verification | — |
