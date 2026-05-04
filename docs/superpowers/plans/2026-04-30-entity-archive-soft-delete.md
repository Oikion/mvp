# Entity Archive — Soft Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-delete on Properties, Contacts, Requests, Deals, CalendarEvents, and Documents with a reversible archive mechanism, guarded by owner-only permissions, and expose an `/archive` section for restore and permanent purge.

**Architecture:** Each of the 6 target models gains `archivedAt DateTime?` + `archivedBy String?` fields. A `withoutArchived()` query guard is spread into every active-data WHERE clause. Three new PermissionKey values gate access to the `/archive` route section. Internal DELETE routes soft-archive instead of hard-delete; v1 external routes additionally return HTTP 410 Gone on subsequent GET/PUT of archived entities.

**Tech Stack:** Prisma 6, Next.js 16 App Router, Clerk auth, `@/lib/permissions`, `@/lib/api-response`, `@/lib/tenant` (prismaForOrg), shadcn/ui, next-intl (el/en)

---

## File Structure

**Modified:**
- `prisma/schema.prisma` — 6 models, 2 new fields + 2 indexes each
- `lib/permissions/types.ts` — 3 new PermissionKey values + `"archive"` ModuleId
- `lib/permissions/defaults.ts` — DEFAULT_PERMISSIONS (3 new keys), ALL_MODULES, RESTRICTED_MODULES, PERMISSION_DESCRIPTIONS, MODULE_DISPLAY_NAMES
- `lib/permissions/action-permissions.ts` — ArchiveAction type + ACTION_MODULES.archive
- `app/api/mls/properties/[propertyId]/route.ts` — DELETE → archive (skip blob delete)
- `app/api/crm/contacts/[contactId]/route.ts` — DELETE → archive (was deletedAt)
- `app/api/requests/[requestId]/route.ts` — DELETE → archive (was deletedAt)
- `app/api/deals/[dealId]/route.ts` — DELETE → archive (was deletedAt)
- `app/api/documents/[documentId]/route.ts` — DELETE → archive (skip blob delete)
- `app/api/calendar/events/[eventId]/route.ts` — DELETE → archive (keep reminder cancellation)
- `app/api/v1/mls/properties/[propertyId]/route.ts` — DELETE → archive, GET/PUT → 410
- `app/api/v1/crm/contacts/[contactId]/route.ts` — DELETE → archive, GET/PUT → 410
- `app/api/v1/documents/[documentId]/route.ts` — DELETE → archive, GET/PUT → 410
- `app/api/v1/calendar/events/[eventId]/route.ts` — DELETE → archive, GET/PUT → 410
- `locales/en/navigation.json` — add `"archive"` key
- `locales/el/navigation.json` — add `"archive"` key
- `i18n.ts` — register archive namespace (both branches)
- `app/[locale]/layout.tsx` — register archive namespace (both branches)

**Created:**
- `lib/query-guards.ts` — `withoutArchived()` utility
- `app/api/archive/[entityType]/[id]/linked-counts/route.ts` — linked record counts for cascade dialog
- `actions/archive/archive-entity.ts` — server action: archive
- `actions/archive/restore-entity.ts` — server action: restore
- `actions/archive/purge-entity.ts` — server action: permanent delete
- `actions/archive/get-archived-entities.ts` — server action: list archived by type
- `actions/archive/get-linked-counts.ts` — server action: get cascade counts
- `app/[locale]/app/(routes)/archive/layout.tsx` — permission guard layout
- `app/[locale]/app/(routes)/archive/page.tsx` — overview stats page
- `app/[locale]/app/(routes)/archive/components/ArchiveOverview.tsx`
- `app/[locale]/app/(routes)/archive/components/ArchivedList.tsx`
- `app/[locale]/app/(routes)/archive/components/ArchiveActions.tsx`
- `app/[locale]/app/(routes)/archive/properties/page.tsx`
- `app/[locale]/app/(routes)/archive/contacts/page.tsx`
- `app/[locale]/app/(routes)/archive/requests/page.tsx`
- `app/[locale]/app/(routes)/archive/deals/page.tsx`
- `app/[locale]/app/(routes)/archive/events/page.tsx`
- `app/[locale]/app/(routes)/archive/documents/page.tsx`
- `locales/en/archive.json`
- `locales/el/archive.json`
- `tests/archive/query-guards.test.ts`
- `tests/archive/archive-permissions.test.ts`

---

## Task 1: Schema — Add Archive Fields to 6 Models

**Files:**
- Modify: `prisma/schema.prisma` — 6 model blocks

- [ ] **Step 1: Add fields to CalendarEvent model (line 81)**

Open `prisma/schema.prisma`. In the `model CalendarEvent` block, add two fields before the closing `@@` directives (after the last field, before `@@unique`):

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes after the existing `@@index([startTime])`:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 2: Add fields to Deal model (line 147)**

In `model Deal`, add after the existing `deletedAt DateTime?` field (around line 204):

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes after the existing `@@index([deletedAt])`:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 3: Add fields to Documents model (line 280)**

In `model Documents`, add after the last scalar field (before `@@` directives):

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes at the end of the index block:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 4: Add fields to Properties model (line 535)**

In `model Properties`, add after the last scalar field (before `@@` directives):

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 5: Add fields to Contact model (~line 3439)**

In `model Contact`, add after the existing `deletedAt DateTime?` field:

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 6: Add fields to Request model (~line 3657)**

In `model Request`, add after the existing `deletedAt DateTime?` field:

```prisma
  archivedAt  DateTime?
  archivedBy  String?
```

Add two new indexes:

```prisma
  @@index([archivedAt])
  @@index([organizationId, archivedAt])
```

- [ ] **Step 7: Run migration**

```bash
pnpm db:migrate
```

When prompted for a migration name, enter: `add_archive_fields_to_entities`

Expected output ends with: `Your database is now in sync with your schema.`

- [ ] **Step 8: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add archivedAt/archivedBy to 6 entity models"
```

---

## Task 2: Permission Layer — Types and Defaults

**Files:**
- Modify: `lib/permissions/types.ts`
- Modify: `lib/permissions/defaults.ts`

- [ ] **Step 1: Add 3 new PermissionKey values to types.ts**

In `lib/permissions/types.ts`, extend the `PermissionKey` union (currently ends at `"canManageIntegrations"`):

```typescript
export type PermissionKey =
  | "canViewAllModules"
  | "canEdit"
  | "canDelete"
  | "canCreate"
  | "canExport"
  | "canReassignAgent"
  | "canManageRoles"
  | "canInviteUsers"
  | "canRemoveUsers"
  | "canTransferOwnership"
  | "canViewAnalytics"
  | "canManageIntegrations"
  | "canViewArchive"
  | "canRestoreArchived"
  | "canPermanentDelete";
```

- [ ] **Step 2: Add "archive" to ModuleId in types.ts**

Extend the `ModuleId` union (currently ends at `"network"`):

```typescript
export type ModuleId =
  | "dashboard"
  | "feed"
  | "mls"
  | "crm"
  | "calendar"
  | "documents"
  | "reports"
  | "deals"
  | "social"
  | "employees"
  | "admin"
  | "network"
  | "archive";
```

- [ ] **Step 3: Verify TypeScript compiles after types.ts change**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about missing keys in DEFAULT_PERMISSIONS (which we'll fix next). If no errors appear yet, that's fine too.

- [ ] **Step 4: Add the 3 new keys to DEFAULT_PERMISSIONS in defaults.ts**

In `lib/permissions/defaults.ts`, update each role block in `DEFAULT_PERMISSIONS`:

```typescript
export const DEFAULT_PERMISSIONS: Record<OrgRole, PermissionConfig> = {
  [OrgRole.OWNER]: {
    // ... existing keys ...
    canManageIntegrations: true,
    canViewArchive: true,
    canRestoreArchived: true,
    canPermanentDelete: true,
  },
  [OrgRole.LEAD]: {
    // ... existing keys ...
    canManageIntegrations: false,
    canViewArchive: false,
    canRestoreArchived: false,
    canPermanentDelete: false,
  },
  [OrgRole.MEMBER]: {
    // ... existing keys ...
    canManageIntegrations: false,
    canViewArchive: false,
    canRestoreArchived: false,
    canPermanentDelete: false,
  },
  [OrgRole.VIEWER]: {
    // ... existing keys ...
    canManageIntegrations: false,
    canViewArchive: false,
    canRestoreArchived: false,
    canPermanentDelete: false,
  },
};
```

- [ ] **Step 5: Add "archive" to ALL_MODULES (not DEFAULT_VIEWER_MODULES)**

```typescript
export const ALL_MODULES: ModuleId[] = [
  "dashboard",
  "feed",
  "mls",
  "crm",
  "calendar",
  "documents",
  "reports",
  "deals",
  "social",
  "employees",
  "admin",
  "network",
  "archive",
];
```

`DEFAULT_VIEWER_MODULES` is NOT changed — archive is owner-only.

- [ ] **Step 6: Add "archive" to RESTRICTED_MODULES**

```typescript
export const RESTRICTED_MODULES: Record<ModuleId, keyof PermissionConfig | null> = {
  // ... existing entries ...
  network: null,
  archive: "canViewArchive",
};
```

- [ ] **Step 7: Add 3 new PERMISSION_DESCRIPTIONS entries**

```typescript
export const PERMISSION_DESCRIPTIONS: Record<keyof PermissionConfig, string> = {
  // ... existing entries ...
  canManageIntegrations: "Manage API keys and webhooks",
  canViewArchive: "Access the archive section to view soft-deleted entities",
  canRestoreArchived: "Restore archived entities back to active state",
  canPermanentDelete: "Permanently delete archived entities (irreversible)",
};
```

- [ ] **Step 8: Add "archive" to MODULE_DISPLAY_NAMES**

```typescript
export const MODULE_DISPLAY_NAMES: Record<ModuleId, string> = {
  // ... existing entries ...
  network: "Network",
  archive: "Archive",
};
```

- [ ] **Step 9: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors from permissions files.

- [ ] **Step 10: Commit**

```bash
git add lib/permissions/types.ts lib/permissions/defaults.ts
git commit -m "feat(permissions): add canViewArchive/canRestoreArchived/canPermanentDelete + archive module"
```

---

## Task 3: Action Permissions — ArchiveAction Type

**Files:**
- Modify: `lib/permissions/action-permissions.ts`

- [ ] **Step 1: Add ArchiveAction type before the ActionPermission union**

In `lib/permissions/action-permissions.ts`, add a new section before the `ActionPermission` union (currently ends at `| ImportAction;` around line 300):

```typescript
// =============================================================================
// ARCHIVE MODULE
// =============================================================================

export type ArchiveAction =
  | "archive:view"
  | "archive:restore"
  | "archive:purge";
```

- [ ] **Step 2: Add ArchiveAction to the ActionPermission union**

Extend the union (currently ends with `| ImportAction;`):

```typescript
export type ActionPermission =
  // ... all existing types ...
  | ImportAction
  | ArchiveAction;
```

- [ ] **Step 3: Add archive to ACTION_MODULES**

In `ACTION_MODULES` (currently ends with the `import` block closing `} as const;`), add before the closing brace:

```typescript
  archive: [
    "archive:view",
    "archive:restore",
    "archive:purge",
  ] as const,
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/permissions/action-permissions.ts
git commit -m "feat(permissions): add ArchiveAction type and archive ACTION_MODULES entry"
```

---

## Task 4: Query Guard Utility

**Files:**
- Create: `lib/query-guards.ts`
- Create: `tests/archive/query-guards.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/archive/query-guards.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { withoutArchived } from "@/lib/query-guards";

describe("withoutArchived", () => {
  it("returns { archivedAt: null }", () => {
    expect(withoutArchived()).toEqual({ archivedAt: null });
  });

  it("is spreadable into a Prisma where clause", () => {
    const where = { organizationId: "org_123", ...withoutArchived() };
    expect(where).toEqual({ organizationId: "org_123", archivedAt: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/archive/query-guards.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/query-guards'`

- [ ] **Step 3: Create lib/query-guards.ts**

```typescript
export const withoutArchived = () => ({ archivedAt: null });
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/archive/query-guards.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/query-guards.ts tests/archive/query-guards.test.ts
git commit -m "feat: add withoutArchived query guard utility with tests"
```

---

## Task 5: Internal API — Properties Route

**Files:**
- Modify: `app/api/mls/properties/[propertyId]/route.ts`

The current DELETE handler at line ~66 deletes blob images and then hard-deletes the record. We switch to an archive update and skip blob deletion (blobs are only removed on permanent purge).

- [ ] **Step 1: Add auth import and replace the DELETE body**

The file already imports `getCurrentOrgId` and `getCurrentUser`. We need `userId` for `archivedBy`, but the file uses `getCurrentUser()` / `getCurrentOrgId()` rather than `auth()` directly. `getCurrentUser()` returns the user object which includes `id`.

Replace the entire DELETE handler body (from `export async function DELETE` to its closing `}`) with:

```typescript
export async function DELETE(
  _req: Request,
  props: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await props.params;

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  try {
    const deleteCheck = await canPerformActionOnEntity(
      "property:delete",
      "property",
      propertyId,
      undefined
    );
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const property = await prismaTenant.properties.findFirst({
      where: { friendlyId: propertyId, organizationId },
      select: { id: true, assigned_to: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    await prismaTenant.properties.update({
      where: { id: property.id, organizationId },
      data: { archivedAt: new Date(), archivedBy: currentUser.id },
    });

    await invalidateCache([
      "properties:list",
      `property:${propertyId}`,
    ]);

    return NextResponse.json({ message: "Property archived" }, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_ARCHIVE]", error);
    return NextResponse.json(
      { error: "Failed to archive property" },
      { status: 500 }
    );
  }
}
```

Remove the unused import `deleteFromBlob` if it's only used in the now-removed blob loop. Also remove `deleteEntitySessionsForEntity` import if it's only used in DELETE.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "properties\[propertyId\]" | head -10
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/mls/properties/[propertyId]/route.ts
git commit -m "feat(api): archive property on DELETE instead of hard-delete"
```

---

## Task 6: Internal API — Contacts, Requests, Deals Routes

**Files:**
- Modify: `app/api/crm/contacts/[contactId]/route.ts`
- Modify: `app/api/requests/[requestId]/route.ts`
- Modify: `app/api/deals/[dealId]/route.ts`

These three routes already have `archivedAt` semantics close to what we need — they use `deletedAt` today. The change is mechanical: replace the `data: { deletedAt: new Date() }` update with `data: { archivedAt: new Date(), archivedBy: userId }`.

- [ ] **Step 1: Update contacts route DELETE**

In `app/api/crm/contacts/[contactId]/route.ts`, change the DELETE handler.

The current handler (line ~261) uses `getCurrentOrgId()` but doesn't get a `userId`. Add `getCurrentUser()` call and swap `deletedAt` for `archivedAt`/`archivedBy`:

```typescript
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const deleteCheck = await canPerformAction("contact:delete");
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;

    const existing = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prismadb.contact.update({
      where: { id: contactId, organizationId },
      data: { archivedAt: new Date(), archivedBy: currentUser.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CONTACT_ARCHIVE]", error);
    return NextResponse.json({ error: "Failed to archive contact" }, { status: 500 });
  }
}
```

Ensure `getCurrentUser` is imported at the top of the file (it likely already is from the GET handler).

- [ ] **Step 2: Update requests route DELETE**

In `app/api/requests/[requestId]/route.ts`, the DELETE handler (line ~268) already uses `auth()` for `userId`. Replace the `data: { deletedAt: new Date() }` update:

```typescript
    await prismadb.request.update({
      where: { id: existing.id, organizationId },
      data: { archivedAt: new Date(), archivedBy: userId },
    });
```

Also update the return message and the console.error tag:

```typescript
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REQUEST_ARCHIVE]", error);
```

- [ ] **Step 3: Update deals route DELETE**

In `app/api/deals/[dealId]/route.ts`, the DELETE handler (line ~292) already uses `auth()` for `userId`. Replace the `data: { deletedAt: new Date() }` update:

```typescript
    await prismadb.deal.update({
      where: { id: dealId, organizationId },
      data: { archivedAt: new Date(), archivedBy: userId },
    });
```

Update the console.error tag:

```typescript
  } catch (error) {
    console.error("[DEAL_ARCHIVE]", error);
```

- [ ] **Step 4: Verify TypeScript compiles for all three files**

```bash
npx tsc --noEmit 2>&1 | grep -E "contacts|requests|deals" | head -15
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/contacts/[contactId]/route.ts \
        app/api/requests/[requestId]/route.ts \
        app/api/deals/[dealId]/route.ts
git commit -m "feat(api): archive contacts/requests/deals on DELETE instead of soft-deletedAt"
```

---

## Task 7: Internal API — Documents and Calendar Events Routes

**Files:**
- Modify: `app/api/documents/[documentId]/route.ts`
- Modify: `app/api/calendar/events/[eventId]/route.ts`

- [ ] **Step 1: Update documents route DELETE**

In `app/api/documents/[documentId]/route.ts`, the DELETE handler (line ~129) currently deletes the blob file then hard-deletes. Replace with an archive update and skip blob deletion (blob is only removed on purge):

```typescript
export async function DELETE(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;

    const document = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
      select: { id: true },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    await prismadb.documents.update({
      where: { id: params.documentId, organizationId },
      data: { archivedAt: new Date(), archivedBy: currentUser.id },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_ARCHIVE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

Remove the unused `deleteFromBlob` import if it is only referenced in the now-removed blob deletion code.

- [ ] **Step 2: Update calendar events route DELETE**

In `app/api/calendar/events/[eventId]/route.ts`, the DELETE handler (line ~701) cancels reminders, emits activity logs, then hard-deletes. Keep all of that but replace the final `prismadb.calendarEvent.delete()` call:

Find this code (line ~812):

```typescript
    // Delete event (reminders cascade delete)
    await prismadb.calendarEvent.delete({
      where: { id: resolvedId },
    });

    return NextResponse.json({
      message: "Event deleted successfully",
    });
```

Replace with:

```typescript
    // Archive event instead of hard-delete — reminders are already cancelled above
    await prismadb.calendarEvent.update({
      where: { id: resolvedId },
      data: { archivedAt: new Date(), archivedBy: currentUser.id },
    });

    return NextResponse.json({
      message: "Event archived successfully",
    });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "documents|calendar" | head -15
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/documents/[documentId]/route.ts \
        app/api/calendar/events/[eventId]/route.ts
git commit -m "feat(api): archive documents/events on DELETE, skip blob deletion"
```

---

## Task 8: Linked-Counts API Route

**Files:**
- Create: `app/api/archive/[entityType]/[id]/linked-counts/route.ts`

This endpoint is called by the cascade confirmation dialog before the DELETE request is sent. It returns counts of records that would cascade-archive or be unlinked.

- [ ] **Step 1: Create the route**

```bash
mkdir -p app/api/archive/\[entityType\]/\[id\]/linked-counts
```

Create `app/api/archive/[entityType]/[id]/linked-counts/route.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/api-response";

type EntityType = "property" | "contact" | "request" | "deal" | "event" | "document";

const VALID_ENTITY_TYPES: EntityType[] = [
  "property",
  "contact",
  "request",
  "deal",
  "event",
  "document",
];

export async function GET(
  req: Request,
  props: { params: Promise<{ entityType: string; id: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { entityType, id } = await props.params;

    if (!VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      return apiBadRequest("Invalid entity type");
    }

    const counts = await getLinkedCounts(entityType as EntityType, id, organizationId);
    return apiSuccess(counts);
  } catch (error) {
    console.error("[ARCHIVE_LINKED_COUNTS]", error);
    return apiInternalError("Failed to get linked counts", error);
  }
}

async function getLinkedCounts(
  entityType: EntityType,
  id: string,
  organizationId: string
): Promise<Record<string, number>> {
  switch (entityType) {
    case "property": {
      const [requests, showings] = await Promise.all([
        prismadb.request.count({
          where: { propertyId: id, organizationId, archivedAt: null, deletedAt: null },
        }),
        prismadb.propertyShowing.count({
          where: { propertyId: id, organizationId },
        }),
      ]);
      return { requests, showings };
    }
    case "contact": {
      const requests = await prismadb.request.count({
        where: { contactId: id, organizationId, archivedAt: null, deletedAt: null },
      });
      return { requests };
    }
    case "request": {
      const deals = await prismadb.deal.count({
        where: { requestId: id, organizationId, archivedAt: null, deletedAt: null },
      });
      return { deals };
    }
    case "deal":
    case "event":
    case "document":
      return {};
    default:
      return {};
  }
}
```

Note: `propertyShowing.count` and `request.contactId` — verify these field names against your schema. Adjust if the relation field is named differently (e.g. `assignedContactId`).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "linked-counts" | head -10
```

Expected: no errors (or adjust field names if Prisma types differ).

- [ ] **Step 3: Commit**

```bash
git add app/api/archive/
git commit -m "feat(api): add linked-counts route for archive cascade dialog"
```

---

## Task 9: Server Actions

**Files:**
- Create: `actions/archive/archive-entity.ts`
- Create: `actions/archive/restore-entity.ts`
- Create: `actions/archive/purge-entity.ts`
- Create: `actions/archive/get-archived-entities.ts`
- Create: `actions/archive/get-linked-counts.ts`

- [ ] **Step 1: Create actions/archive/archive-entity.ts**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

export type ArchivableEntityType =
  | "property"
  | "contact"
  | "request"
  | "deal"
  | "event"
  | "document";

export async function archiveEntity(
  entityType: ArchivableEntityType,
  id: string,
  cascade: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const deleteCheck = await canPerformAction("canDelete" as any);
  if (!deleteCheck.allowed) return { success: false, error: "Permission denied" };

  const now = new Date();

  try {
    await prismadb.$transaction(async (tx) => {
      switch (entityType) {
        case "property":
          await tx.properties.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            await tx.request.updateMany({
              where: { propertyId: id, organizationId, archivedAt: null },
              data: { archivedAt: now, archivedBy: userId },
            });
          }
          break;
        case "contact":
          await tx.contact.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            await tx.request.updateMany({
              where: { contactId: id, organizationId, archivedAt: null },
              data: { archivedAt: now, archivedBy: userId },
            });
          }
          break;
        case "request":
          await tx.request.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            await tx.deal.updateMany({
              where: { requestId: id, organizationId, archivedAt: null },
              data: { archivedAt: now, archivedBy: userId },
            });
          }
          break;
        case "deal":
          await tx.deal.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
        case "event":
          await tx.calendarEvent.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
        case "document":
          await tx.documents.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[ARCHIVE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to archive entity" };
  }
}
```

Note: `request.contactId` — verify this is the correct field name in your schema. Adjust if needed.

- [ ] **Step 2: Create actions/archive/restore-entity.ts**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

import type { ArchivableEntityType } from "./archive-entity";

export async function restoreEntity(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const check = await canPerformAction("archive:restore" as any);
  if (!check.allowed) return { success: false, error: "Permission denied" };

  try {
    switch (entityType) {
      case "property":
        await prismadb.properties.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "contact":
        await prismadb.contact.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "request":
        await prismadb.request.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "deal":
        await prismadb.deal.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "event":
        await prismadb.calendarEvent.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "document":
        await prismadb.documents.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
    }

    return { success: true };
  } catch (error) {
    console.error("[RESTORE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to restore entity" };
  }
}
```

- [ ] **Step 3: Create actions/archive/purge-entity.ts**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { deleteFromBlob } from "@/lib/vercel-blob";

import type { ArchivableEntityType } from "./archive-entity";

export async function purgeEntity(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const check = await canPerformAction("archive:purge" as any);
  if (!check.allowed) return { success: false, error: "Permission denied" };

  try {
    switch (entityType) {
      case "property": {
        // Delete blob images before purging the record
        const images = await prismadb.propertyImage.findMany({
          where: { propertyId: id },
          select: { url: true },
        });
        for (const img of images) {
          await deleteFromBlob(img.url).catch((e) =>
            console.error("[PURGE_PROPERTY_BLOB]", e)
          );
        }
        await prismadb.properties.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      }
      case "contact":
        await prismadb.contact.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "request":
        await prismadb.request.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "deal":
        await prismadb.deal.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "event":
        await prismadb.calendarEvent.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "document": {
        const doc = await prismadb.documents.findFirst({
          where: { id, organizationId, archivedAt: { not: null } },
          select: { document_file_url: true },
        });
        if (doc?.document_file_url) {
          await deleteFromBlob(doc.document_file_url).catch((e) =>
            console.error("[PURGE_DOCUMENT_BLOB]", e)
          );
        }
        await prismadb.documents.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[PURGE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to purge entity" };
  }
}
```

- [ ] **Step 4: Create actions/archive/get-archived-entities.ts**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

import type { ArchivableEntityType } from "./archive-entity";

export interface ArchivedEntityRow {
  id: string;
  label: string;
  archivedAt: Date;
  archivedBy: string | null;
}

export async function getArchivedEntities(
  entityType: ArchivableEntityType
): Promise<{ data: ArchivedEntityRow[]; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { data: [], error: "Unauthorized" };

  const check = await canPerformAction("archive:view" as any);
  if (!check.allowed) return { data: [], error: "Permission denied" };

  try {
    const where = { organizationId, archivedAt: { not: null } };

    switch (entityType) {
      case "property": {
        const rows = await prismadb.properties.findMany({
          where,
          select: { id: true, property_name: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.property_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "contact": {
        const rows = await prismadb.contact.findMany({
          where,
          select: { id: true, displayName: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.displayName ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "request": {
        const rows = await prismadb.request.findMany({
          where,
          select: { id: true, title: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.title ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "deal": {
        const rows = await prismadb.deal.findMany({
          where,
          select: { id: true, friendlyId: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.friendlyId,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "event": {
        const rows = await prismadb.calendarEvent.findMany({
          where,
          select: { id: true, title: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.title ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "document": {
        const rows = await prismadb.documents.findMany({
          where,
          select: { id: true, document_name: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.document_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      default:
        return { data: [] };
    }
  } catch (error) {
    console.error("[GET_ARCHIVED_ENTITIES]", entityType, error);
    return { data: [], error: "Failed to fetch archived entities" };
  }
}
```

Note: `r.displayName` on Contact, `r.title` on Request — verify these field names match your schema. Adjust selects as needed.

- [ ] **Step 5: Create actions/archive/get-linked-counts.ts**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";

import type { ArchivableEntityType } from "./archive-entity";

export async function getLinkedCounts(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ data: Record<string, number>; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { data: {}, error: "Unauthorized" };

  const res = await fetch(
    `/api/archive/${entityType}/${id}/linked-counts`,
    { cache: "no-store" }
  );

  if (!res.ok) return { data: {}, error: "Failed to fetch linked counts" };
  const json = await res.json();
  return { data: json.data ?? {} };
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "actions/archive" | head -15
```

Expected: no errors (adjust any field names that don't match the generated Prisma types).

- [ ] **Step 7: Commit**

```bash
git add actions/archive/
git commit -m "feat(actions): add archive/restore/purge/get-archived-entities/get-linked-counts server actions"
```

---

## Task 10: i18n — Archive Namespace + Navigation Keys

**Files:**
- Create: `locales/en/archive.json`
- Create: `locales/el/archive.json`
- Modify: `locales/en/navigation.json`
- Modify: `locales/el/navigation.json`
- Modify: `i18n.ts`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Create locales/en/archive.json**

```json
{
  "title": "Archive",
  "overview": {
    "title": "Archive Overview",
    "description": "View and manage soft-deleted records",
    "stats": {
      "properties": "Archived Properties",
      "contacts": "Archived Contacts",
      "requests": "Archived Requests",
      "deals": "Archived Deals",
      "events": "Archived Events",
      "documents": "Archived Documents"
    }
  },
  "actions": {
    "restore": "Restore",
    "purge": "Delete Permanently",
    "restoreConfirm": "Restore this item?",
    "purgeConfirm": "This action cannot be undone. Permanently delete this item?",
    "purgeButton": "Delete permanently",
    "cancelButton": "Cancel"
  },
  "cascade": {
    "title": "Archive linked records?",
    "willArchive": "{count, plural, one {# linked record} other {# linked records}} will also be archived.",
    "willUnlink": "{count, plural, one {# related record} other {# related records}} will be unlinked (not archived).",
    "archiveAll": "Archive linked records",
    "archiveOnly": "Archive this item only"
  },
  "empty": "No archived items",
  "pages": {
    "properties": "Archived Properties",
    "contacts": "Archived Contacts",
    "requests": "Archived Requests",
    "deals": "Archived Deals",
    "events": "Archived Events",
    "documents": "Archived Documents"
  },
  "table": {
    "name": "Name",
    "archivedAt": "Archived On",
    "archivedBy": "Archived By",
    "actions": "Actions"
  }
}
```

- [ ] **Step 2: Create locales/el/archive.json**

```json
{
  "title": "Αρχείο",
  "overview": {
    "title": "Επισκόπηση Αρχείου",
    "description": "Προβολή και διαχείριση αρχειοθετημένων εγγραφών",
    "stats": {
      "properties": "Αρχειοθετημένα Ακίνητα",
      "contacts": "Αρχειοθετημένες Επαφές",
      "requests": "Αρχειοθετημένα Αιτήματα",
      "deals": "Αρχειοθετημένες Συμφωνίες",
      "events": "Αρχειοθετημένα Γεγονότα",
      "documents": "Αρχειοθετημένα Έγγραφα"
    }
  },
  "actions": {
    "restore": "Επαναφορά",
    "purge": "Οριστική Διαγραφή",
    "restoreConfirm": "Επαναφορά αυτής της εγγραφής;",
    "purgeConfirm": "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Οριστική διαγραφή;",
    "purgeButton": "Οριστική διαγραφή",
    "cancelButton": "Ακύρωση"
  },
  "cascade": {
    "title": "Αρχειοθέτηση συνδεδεμένων εγγραφών;",
    "willArchive": "{count, plural, one {# συνδεδεμένη εγγραφή} other {# συνδεδεμένες εγγραφές}} θα αρχειοθετηθ{count, plural, one {εί} other {ούν}} επίσης.",
    "willUnlink": "{count, plural, one {# σχετική εγγραφή} other {# σχετικές εγγραφές}} θα αποσυνδεθ{count, plural, one {εί} other {ούν}} (όχι αρχειοθέτηση).",
    "archiveAll": "Αρχειοθέτηση συνδεδεμένων",
    "archiveOnly": "Αρχειοθέτηση μόνο αυτής"
  },
  "empty": "Δεν υπάρχουν αρχειοθετημένες εγγραφές",
  "pages": {
    "properties": "Αρχειοθετημένα Ακίνητα",
    "contacts": "Αρχειοθετημένες Επαφές",
    "requests": "Αρχειοθετημένα Αιτήματα",
    "deals": "Αρχειοθετημένες Συμφωνίες",
    "events": "Αρχειοθετημένα Γεγονότα",
    "documents": "Αρχειοθετημένα Έγγραφα"
  },
  "table": {
    "name": "Όνομα",
    "archivedAt": "Αρχειοθετήθηκε",
    "archivedBy": "Από",
    "actions": "Ενέργειες"
  }
}
```

- [ ] **Step 3: Add "archive" key to locales/en/navigation.json**

In `locales/en/navigation.json`, inside the `ModuleMenu` object, add after `"calendar": "Calendar"`:

```json
"archive": "Archive",
```

- [ ] **Step 4: Add "archive" key to locales/el/navigation.json**

In `locales/el/navigation.json`, inside the `ModuleMenu` object, add after `"calendar"`:

```json
"archive": "Αρχείο",
```

- [ ] **Step 5: Register archive namespace in i18n.ts**

In `i18n.ts`, add the import lines after `documentTemplatesEn` (line ~46) and `documentTemplatesEl` (line ~90):

```typescript
import archiveEn from "./locales/en/archive.json";
```

And:

```typescript
import archiveEl from "./locales/el/archive.json";
```

In the `loadMessages` function, in the `el` branch (after `messages["document-templates"] = documentTemplatesEl;`):

```typescript
    messages.archive = archiveEl;
```

In the `en` branch (after `messages["document-templates"] = documentTemplatesEn;`):

```typescript
    messages.archive = archiveEn;
```

- [ ] **Step 6: Register archive namespace in app/[locale]/layout.tsx**

Find the `getLocales()` function in `app/[locale]/layout.tsx`. Add the same import pattern and assignment that exists for other namespaces. Add imports near the top of the file:

```typescript
import archiveEn from "@/locales/en/archive.json";
import archiveEl from "@/locales/el/archive.json";
```

In the el/en branches of `getLocales()`:

```typescript
messages.archive = archiveEl; // in el branch
messages.archive = archiveEn; // in en branch
```

- [ ] **Step 7: Verify build**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build completes without missing-key errors. If you see TypeScript errors about `messages.d.ts`, add `archive: typeof archiveEn` to the `AppMessages` interface there.

- [ ] **Step 8: Commit**

```bash
git add locales/en/archive.json locales/el/archive.json \
        locales/en/navigation.json locales/el/navigation.json \
        i18n.ts app/\[locale\]/layout.tsx
git commit -m "feat(i18n): add archive namespace and navigation key (en + el)"
```

---

## Task 11: Archive Layout and Overview Page

**Files:**
- Create: `app/[locale]/app/(routes)/archive/layout.tsx`
- Create: `app/[locale]/app/(routes)/archive/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/components/ArchiveOverview.tsx`

- [ ] **Step 1: Create the archive layout**

Create `app/[locale]/app/(routes)/archive/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/permissions/service";

export default async function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPermissionContext();

  if (!ctx.permissions.canViewArchive) {
    redirect("/app/dashboard");
  }

  return <>{children}</>;
}
```

Note: `getPermissionContext` — check `lib/permissions/service.ts` for the correct exported function name. If it exports a different name (e.g. `getUserPermissionContext`), use that instead.

- [ ] **Step 2: Create the overview component**

Create `app/[locale]/app/(routes)/archive/components/ArchiveOverview.tsx`:

```typescript
import { prismadb } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

async function getArchiveCounts(organizationId: string) {
  const [properties, contacts, requests, deals, events, documents] =
    await Promise.all([
      prismadb.properties.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.contact.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.request.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.deal.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.calendarEvent.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.documents.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
    ]);

  return { properties, contacts, requests, deals, events, documents };
}

export default async function ArchiveOverview() {
  const { orgId: organizationId } = await auth();
  if (!organizationId) return null;

  const counts = await getArchiveCounts(organizationId);

  const modules = [
    { key: "properties", href: "/app/archive/properties", count: counts.properties },
    { key: "contacts", href: "/app/archive/contacts", count: counts.contacts },
    { key: "requests", href: "/app/archive/requests", count: counts.requests },
    { key: "deals", href: "/app/archive/deals", count: counts.deals },
    { key: "events", href: "/app/archive/events", count: counts.events },
    { key: "documents", href: "/app/archive/documents", count: counts.documents },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {modules.map((m) => (
        <a
          key={m.key}
          href={m.href}
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="text-2xl font-semibold tabular-nums">{m.count}</p>
          <p className="text-sm text-muted-foreground capitalize">{m.key}</p>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create the overview page**

Create `app/[locale]/app/(routes)/archive/page.tsx`:

```typescript
import { Suspense } from "react";
import ArchiveOverview from "./components/ArchiveOverview";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage soft-deleted records
        </p>
      </div>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchiveOverview />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "archive/layout\|archive/page\|ArchiveOverview" | head -10
```

Expected: no errors. Fix any import paths that differ in this codebase (e.g. `SuspenseLoading` path).

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/archive/layout.tsx \
        app/\[locale\]/app/\(routes\)/archive/page.tsx \
        app/\[locale\]/app/\(routes\)/archive/components/ArchiveOverview.tsx
git commit -m "feat(archive): add archive layout with permission guard and overview page"
```

---

## Task 12: Archive Components — List and Actions

**Files:**
- Create: `app/[locale]/app/(routes)/archive/components/ArchivedList.tsx`
- Create: `app/[locale]/app/(routes)/archive/components/ArchiveActions.tsx`

- [ ] **Step 1: Create ArchiveActions.tsx (restore / purge buttons with confirm dialogs)**

Create `app/[locale]/app/(routes)/archive/components/ArchiveActions.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { restoreEntity } from "@/actions/archive/restore-entity";
import { purgeEntity } from "@/actions/archive/purge-entity";
import type { ArchivableEntityType } from "@/actions/archive/archive-entity";

interface ArchiveActionsProps {
  entityType: ArchivableEntityType;
  id: string;
  canRestore: boolean;
  canPurge: boolean;
  onSuccess: () => void;
}

export default function ArchiveActions({
  entityType,
  id,
  canRestore,
  canPurge,
  onSuccess,
}: ArchiveActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreEntity(entityType, id);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? "Failed to restore");
      }
    });
  }

  function handlePurge() {
    startTransition(async () => {
      const result = await purgeEntity(entityType, id);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? "Failed to purge");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}

      {canRestore && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={isPending}
        >
          Restore
        </Button>
      )}

      {canPurge && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>
              Delete permanently
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurge}>
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ArchivedList.tsx**

Create `app/[locale]/app/(routes)/archive/components/ArchivedList.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ArchiveActions from "./ArchiveActions";
import type { ArchivableEntityType } from "@/actions/archive/archive-entity";
import type { ArchivedEntityRow } from "@/actions/archive/get-archived-entities";

interface ArchivedListProps {
  entityType: ArchivableEntityType;
  initialRows: ArchivedEntityRow[];
  canRestore: boolean;
  canPurge: boolean;
  refetch: () => Promise<ArchivedEntityRow[]>;
}

export default function ArchivedList({
  entityType,
  initialRows,
  canRestore,
  canPurge,
  refetch,
}: ArchivedListProps) {
  const [rows, setRows] = useState(initialRows);

  const handleSuccess = useCallback(async () => {
    const fresh = await refetch();
    setRows(fresh);
  }, [refetch]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No archived items
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Archived On</TableHead>
          <TableHead>Archived By</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(row.archivedAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {row.archivedBy ?? "—"}
            </TableCell>
            <TableCell>
              <ArchiveActions
                entityType={entityType}
                id={row.id}
                canRestore={canRestore}
                canPurge={canPurge}
                onSuccess={handleSuccess}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "ArchiveActions\|ArchivedList" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/archive/components/
git commit -m "feat(archive): add ArchivedList and ArchiveActions components"
```

---

## Task 13: Archive Sub-Pages (6 entity pages)

**Files:**
- Create: `app/[locale]/app/(routes)/archive/properties/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/contacts/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/requests/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/deals/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/events/page.tsx`
- Create: `app/[locale]/app/(routes)/archive/documents/page.tsx`

All 6 pages follow the identical pattern: fetch archived rows with the relevant server action, get permission context, render `ArchivedList`. Only the `entityType` string, page title, and action differ.

- [ ] **Step 1: Create the properties archived page**

Create `app/[locale]/app/(routes)/archive/properties/page.tsx`:

```typescript
import { Suspense } from "react";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedPropertiesContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("property"),
    getPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="property"
      initialRows={data}
      canRestore={ctx.permissions.canRestoreArchived}
      canPurge={ctx.permissions.canPermanentDelete}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("property");
        return data;
      }}
    />
  );
}

export default function ArchivedPropertiesPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Archived Properties</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedPropertiesContainer />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Create the remaining 5 pages**

Create each page following the identical pattern above with only `entityType` and title changing:

`contacts/page.tsx` — `entityType="contact"`, title `"Archived Contacts"`
`requests/page.tsx` — `entityType="request"`, title `"Archived Requests"`
`deals/page.tsx` — `entityType="deal"`, title `"Archived Deals"`
`events/page.tsx` — `entityType="event"`, title `"Archived Events"`
`documents/page.tsx` — `entityType="document"`, title `"Archived Documents"`

Example for contacts:

```typescript
import { Suspense } from "react";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedContactsContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("contact"),
    getPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="contact"
      initialRows={data}
      canRestore={ctx.permissions.canRestoreArchived}
      canPurge={ctx.permissions.canPermanentDelete}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("contact");
        return data;
      }}
    />
  );
}

export default function ArchivedContactsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Archived Contacts</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedContactsContainer />
      </Suspense>
    </div>
  );
}
```

Copy this pattern for requests, deals, events, documents.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "archive/" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/archive/properties/ \
        app/\[locale\]/app/\(routes\)/archive/contacts/ \
        app/\[locale\]/app/\(routes\)/archive/requests/ \
        app/\[locale\]/app/\(routes\)/archive/deals/ \
        app/\[locale\]/app/\(routes\)/archive/events/ \
        app/\[locale\]/app/\(routes\)/archive/documents/
git commit -m "feat(archive): add 6 entity-specific archived list pages"
```

---

## Task 14: v1 External API Changes — Archive + 410 Gone

**Files:**
- Modify: `app/api/v1/mls/properties/[propertyId]/route.ts`
- Modify: `app/api/v1/crm/contacts/[contactId]/route.ts`
- Modify: `app/api/v1/documents/[documentId]/route.ts`
- Modify: `app/api/v1/calendar/events/[eventId]/route.ts`

For each route: (1) DELETE handler switches from hard-delete to archive, (2) GET and PUT handlers add a 410 Gone check after the record is fetched.

- [ ] **Step 1: Update v1 properties route**

In `app/api/v1/mls/properties/[propertyId]/route.ts`:

**GET handler** — after `const existingProperty = await prismadb.properties.findFirst(...)` and the 404 check, add:

```typescript
    if (existingProperty.archivedAt) {
      return createApiErrorResponse(
        "This resource has been archived and is no longer available.",
        410
      );
    }
```

**PUT handler** — same 410 check after the 404 check.

**DELETE handler** — replace `await deleteEntitySessionsForEntity(...)` + `await prismadb.properties.delete(...)` + `dispatchPropertyWebhook(..., "property.deleted", ...)` with:

```typescript
    await prismadb.properties.update({
      where: { id: existingProperty.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });

    dispatchPropertyWebhook(context.organizationId, "property.archived", existingProperty).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Property archived successfully",
      propertyId,
    });
```

- [ ] **Step 2: Update v1 contacts route**

In `app/api/v1/crm/contacts/[contactId]/route.ts`:

**GET handler** — after the `deletedAt: null` 404 check, add (the `findFirst` already filters `deletedAt: null`; add the `archivedAt` guard after null-check):

The contact `findFirst` in GET currently filters `deletedAt: null`. Also filter `archivedAt: null` in the query:

```typescript
      where: {
        organizationId: context.organizationId,
        friendlyId: contactId,
        deletedAt: null,
        archivedAt: null,
      },
```

If the contact is found but has `archivedAt` set (old records before this deploy), add an explicit 410 check after the 404 check:

```typescript
    if (!existingContact) {
      return createApiErrorResponse("Contact not found", 404);
    }
    // 410 check for archived contacts found via other lookup paths
    if (existingContact.archivedAt) {
      return createApiErrorResponse(
        "This resource has been archived and is no longer available.",
        410
      );
    }
```

**PUT handler** — same pattern (add `archivedAt: null` to the query and the 410 check).

**DELETE handler** — replace `data: { deletedAt: new Date() }` with `data: { archivedAt: new Date(), archivedBy: context.createdById }` and replace the webhook event name:

```typescript
    await prismadb.contact.update({
      where: { id: existingContact.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });

    dispatchContactWebhook(context.organizationId, "contact.archived", {
      id: decryptedForWebhook.id,
      displayName: decryptedForWebhook.displayName,
      email: decryptedForWebhook.email,
      status: decryptedForWebhook.status,
      category: decryptedForWebhook.category,
      assignedAgentId: decryptedForWebhook.assignedAgentId,
    }).catch(console.error);
```

- [ ] **Step 3: Update v1 documents route**

In `app/api/v1/documents/[documentId]/route.ts`:

**GET and PUT** — add `archivedAt: null` to the `findFirst` query, and add 410 check after the 404 check.

**DELETE** — replace hard-delete with archive:

```typescript
    await prismadb.documents.update({
      where: { id: existingDocument.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });

    dispatchDocumentWebhook(context.organizationId, "document.archived", existingDocument).catch(
      console.error
    );
```

- [ ] **Step 4: Update v1 calendar events route**

In `app/api/v1/calendar/events/[eventId]/route.ts`:

**GET and PUT** — add `archivedAt: null` to queries + 410 check.

**DELETE** — replace the "soft cancel" or hard-delete with:

```typescript
    await prismadb.calendarEvent.update({
      where: { id: existingEvent.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });
```

- [ ] **Step 5: Verify TypeScript compiles for all 4 files**

```bash
npx tsc --noEmit 2>&1 | grep "api/v1" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/mls/properties/\[propertyId\]/route.ts \
        app/api/v1/crm/contacts/\[contactId\]/route.ts \
        app/api/v1/documents/\[documentId\]/route.ts \
        app/api/v1/calendar/events/\[eventId\]/route.ts
git commit -m "feat(v1-api): switch DELETE to archive, return 410 Gone for archived entities"
```

---

## Task 15: Tests — Permission Defaults

**Files:**
- Create: `tests/archive/archive-permissions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/archive/archive-permissions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { OrgRole } from "@prisma/client";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions/defaults";

describe("archive permission defaults", () => {
  it("grants all archive permissions to OWNER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.OWNER];
    expect(perms.canViewArchive).toBe(true);
    expect(perms.canRestoreArchived).toBe(true);
    expect(perms.canPermanentDelete).toBe(true);
  });

  it("denies all archive permissions to LEAD", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.LEAD];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });

  it("denies all archive permissions to MEMBER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.MEMBER];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });

  it("denies all archive permissions to VIEWER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.VIEWER];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/archive/archive-permissions.test.ts
```

Expected: FAIL — properties `canViewArchive` not found on type (before Task 2 is done) or value mismatch.

- [ ] **Step 3: Verify tests pass after Task 2 is complete**

If Task 2 has already been completed, they should pass immediately:

```bash
pnpm vitest run tests/archive/archive-permissions.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
pnpm vitest run 2>&1 | tail -20
```

Expected: all tests pass (or pre-existing failures only — don't introduce new failures).

- [ ] **Step 5: Commit**

```bash
git add tests/archive/archive-permissions.test.ts
git commit -m "test(archive): verify permission defaults for all roles"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| archivedAt/archivedBy on 6 models + indexes | Task 1 |
| 3 new PermissionKey values | Task 2 |
| "archive" ModuleId | Task 2 |
| Default grants (OWNER=all, others=none) | Task 2 |
| withoutArchived() utility | Task 4 |
| Internal API DELETE → archive (6 routes) | Tasks 5–7 |
| Documents/events blob and reminder handling | Task 7 |
| Linked-counts API for cascade dialog | Task 8 |
| Server actions (archive/restore/purge/list/counts) | Task 9 |
| i18n (en + el namespace + navigation key) | Task 10 |
| Archive layout with permission redirect | Task 11 |
| Archive overview stats page | Task 11 |
| ArchivedList + ArchiveActions components | Task 12 |
| 6 entity archive sub-pages | Task 13 |
| v1 API archive + 410 Gone | Task 14 |
| Tests | Tasks 4 + 15 |

**Placeholder scan:** No TBD/TODO found. All code blocks are complete.

**Type consistency:**
- `ArchivableEntityType` defined in `archive-entity.ts`, re-exported and used in restore/purge/get-archived/ArchivedList — consistent across all tasks.
- `ArchivedEntityRow` defined in `get-archived-entities.ts`, imported in `ArchivedList.tsx` — consistent.
- `getPermissionContext()` — used in layout and page containers. Verify this export name in `lib/permissions/service.ts` before running.

**Known caveats:**
- `request.contactId` field name — verify against your schema (the Request model may link to contacts differently, e.g. via a join table `RequestContact`). If the relation is many-to-many, the `updateMany` cascade in `archive-entity.ts` needs adjustment.
- `canPerformAction("canDelete" as any)` in `archive-entity.ts` — this casts to `any` because "canDelete" is a PermissionConfig key, not an ActionPermission. The archive action server actions should use `requireAction("archive:restore")` from `lib/permissions/action-guards` instead once that pattern is confirmed available.
- `createApiErrorResponse` with status 410 — verify `createApiErrorResponse` signature in the v1 API helper; it may only accept a subset of HTTP status codes. If it throws on 410, use `NextResponse.json({ error: "..." }, { status: 410 })` directly.
