# Entity Archive — Soft Delete System Design

**Date:** 2026-04-30
**Status:** Approved
**Branch:** staging

---

## 1. Problem Statement

Oikion currently hard-deletes entities (Properties, Contacts, Requests, Deals, Events, Documents) via DELETE API routes. This is irreversible and has caused data loss incidents in manual testing. The system needs a safe, reversible archive mechanism that:

- Prevents accidental data loss
- Gives org Owners visibility into and control over deleted data
- Keeps the active UI views clean (archived items invisible by default)
- Maintains the existing `deletedAt` system-level deletion flows (user departure, GDPR) untouched

---

## 2. Scope

**In scope:**
- Properties, Contacts, Requests, Deals, CalendarEvents, Documents
- Internal API routes (archive instead of hard-delete)
- External v1 API routes (archive + 410 Gone on subsequent access)
- New `/archive` section with permissions
- Cascade confirmation dialog
- Background process patching (matchmaking, XE sync, analytics)

**Out of scope:**
- Comments, Showings, DealParty, DealStageLog (child-only entities — not independently archivable)
- Org deletion, account deletion, GDPR flows — these retain hard-delete
- Agent departure data migration — retains existing `deletedAt` system

---

## 3. Schema Changes

Each of the 6 target models gets two new nullable fields and two new indexes:

```prisma
archivedAt  DateTime?
archivedBy  String?       // Clerk userId of the actor

@@index([archivedAt])
@@index([organizationId, archivedAt])
```

**Models receiving these fields:** `properties`, `contacts`, `requests` (Deal already has `deletedAt` — both coexist), `Deal`, `CalendarEvent`, `documents`.

**Existing `deletedAt` fields on Contact, Request, and Deal are left untouched.** They serve a different semantic: system-triggered deletion (user departure, GDPR). `archivedAt` is user-triggered archival. They are independent.

**Migration name:** `add_archive_fields_to_entities`

---

## 4. Permission System

Three new `PermissionKey` values added to `lib/permissions/types.ts`:

```typescript
"canViewArchive"        // Access the /archive section at all
"canRestoreArchived"    // Restore an archived item to active
"canPermanentDelete"    // Permanently purge an archived item (irreversible)
```

New `ModuleId`: `"archive"`

**Default grants** (in `lib/permissions/defaults.ts`):

| Role | canViewArchive | canRestoreArchived | canPermanentDelete |
|------|---------------|-------------------|-------------------|
| ORG_OWNER | ✅ | ✅ | ✅ |
| ADMIN | ❌ | ❌ | ❌ |
| AGENT | ❌ | ❌ | ❌ |
| VIEWER | ❌ | ❌ | ❌ |

All three permissions are togglable per-role for future customizable-roles support (Discord-style). The existing `canDelete` permission is **not removed** — it still gates the "Archive" button in active list views.

---

## 5. Query Guard Utility

New file: `lib/query-guards.ts`

```typescript
export const withoutArchived = () => ({ archivedAt: null });
```

Used as a spread in all active-data queries:

```typescript
prismadb.properties.findMany({
  where: { organizationId, ...withoutArchived() }
})
```

This is a shared utility so a future grace-period filter only requires a single file change.

---

## 6. Archive Action

**Archive (replaces hard-delete):**
```typescript
await prismadb.properties.update({
  where: { id, organizationId },
  data: { archivedAt: new Date(), archivedBy: userId },
});
```

**Restore:**
```typescript
await prismadb.properties.update({
  where: { id, organizationId },
  data: { archivedAt: null, archivedBy: null },
});
```

**Purge (permanent, irreversible):**
```typescript
await prismadb.properties.delete({
  where: { id, organizationId, archivedAt: { not: null } },
});
```

Purge includes a guard clause: `archivedAt: { not: null }` — prevents accidental purge of active records.

---

## 7. Cascade Confirmation Dialog

**Flow:**
1. User clicks "Archive" on entity with linked records
2. Client calls `GET /api/archive/[entityType]/[id]/linked-counts` → `{ requests: 2, deals: 1, showings: 3 }`
3. If any cascadeable OR unlinkable count > 0: AlertDialog displays summary
4. Dialog distinguishes: "2 requests and 1 deal will be archived. 3 showings will be unlinked (not archived)."
5. User chooses "Archive linked records" (`cascade: true`) or "Archive this item only" (`cascade: false`)
6. DELETE request sent with `cascade` flag in body
7. Server uses `$transaction` for atomic cascade + FK nullification

**Cascade depth:** One level only — no recursive cascading.

**Cascade map:**

| Entity archived | Cascades to |
|-----------------|-------------|
| Property | linked Requests |
| Contact | linked Requests |
| Request | linked Deals |
| Deal | (nothing cascadeable) |
| CalendarEvent | (nothing cascadeable) |
| Document | (nothing cascadeable) |

**Non-cascadeable relations** (e.g., Showings referencing a Property) get their FK set to `null` rather than being archived.

---

## 8. Active Views — Archived Item Visibility

Archived items are **completely invisible** in all active list views. The `withoutArchived()` guard is applied at the query level — no UI filtering needed. This is Approach A (cleanest UX, no visual clutter).

---

## 9. Archive Page Structure

Route: `/app/archive`

**Hierarchy:**
```
/archive                    ← Overview (statistics + recent activity)
/archive/properties         ← Archived properties list
/archive/contacts           ← Archived contacts list
/archive/requests           ← Archived requests list
/archive/deals              ← Archived deals list
/archive/events             ← Archived events list
/archive/documents          ← Archived documents list
```

**Layout (`layout.tsx`):** Server Component, permission-guards with redirect to `/app/dashboard` if `!ctx.permissions.canViewArchive`.

**Overview page:** Statistics cards (total archived per entity type, most recently archived), recent archive activity feed.

**Per-module pages:** Identical pattern — Server Component + `Container` + `Suspense` + `force-dynamic`.

**Reusable `ArchivedList` client component** handles the list + row-level Restore/Purge actions with permission checks per action.

---

## 10. v1 External API Changes

For each v1 entity route (`/api/v1/mls/properties/[id]`, `/api/v1/crm/contacts/[id]`, etc.):

- `DELETE` → archive (`archivedAt: new Date()`) instead of hard-delete
- `GET` → returns 410 Gone if `archivedAt` is set
- `PUT` → returns 410 Gone if `archivedAt` is set

```typescript
if (entity.archivedAt) {
  return NextResponse.json(
    { error: "This resource has been archived and is no longer available." },
    { status: 410 }
  );
}
```

Webhook events: `entity.deleted` → `entity.archived`; new `entity.purged` on permanent deletion.

---

## 11. Background Process Impact

All background queries reading active entity data must include `withoutArchived()`:

| Surface | Change |
|---------|--------|
| Matchmaking (`fetchActiveMandates`, `fetchActiveProperties`) | Add `archivedAt: null` predicate |
| XE sync cron | Skip archived properties in price sync |
| Analytics aggregations | Exclude archived records from funnel counts |
| Ably broadcasts | Emit `entity.archived` (replaces `entity.deleted`); emit `entity.purged` |
| SWR list hooks | No change — re-fetch on mutation already handles this |

---

## 12. File Inventory

**Schema:**
- `prisma/schema.prisma` — 6 models updated

**Permissions:**
- `lib/permissions/types.ts` — 3 new PermissionKey values, 1 new ModuleId
- `lib/permissions/defaults.ts` — default grants for 3 new permissions

**Query guard:**
- `lib/query-guards.ts` — new file

**Server actions:**
- `actions/archive/archive-entity.ts`
- `actions/archive/restore-entity.ts`
- `actions/archive/purge-entity.ts`
- `actions/archive/get-archived-entities.ts`
- `actions/archive/get-linked-counts.ts`

**Archive pages:**
- `app/[locale]/app/(routes)/archive/layout.tsx`
- `app/[locale]/app/(routes)/archive/page.tsx`
- `app/[locale]/app/(routes)/archive/properties/page.tsx`
- `app/[locale]/app/(routes)/archive/contacts/page.tsx`
- `app/[locale]/app/(routes)/archive/requests/page.tsx`
- `app/[locale]/app/(routes)/archive/deals/page.tsx`
- `app/[locale]/app/(routes)/archive/events/page.tsx`
- `app/[locale]/app/(routes)/archive/documents/page.tsx`
- `app/[locale]/app/(routes)/archive/components/ArchiveOverview.tsx`
- `app/[locale]/app/(routes)/archive/components/ArchivedList.tsx`
- `app/[locale]/app/(routes)/archive/components/ArchiveActions.tsx`

**Internal API routes (archive replaces hard-delete):**
- `app/api/mls/properties/[propertyId]/route.ts`
- `app/api/crm/contacts/[contactId]/route.ts`
- `app/api/documents/[documentId]/route.ts`
- `app/api/calendar/events/[eventId]/route.ts`
- `app/api/requests/[requestId]/route.ts`
- `app/api/deals/[dealId]/route.ts`

**External v1 API routes (archive + 410):**
- `app/api/v1/mls/properties/[propertyId]/route.ts`
- `app/api/v1/crm/contacts/[contactId]/route.ts`
- `app/api/v1/documents/[documentId]/route.ts`
- `app/api/v1/calendar/events/[eventId]/route.ts`

**Linked-count API:**
- `app/api/archive/[entityType]/[id]/linked-counts/route.ts`

**i18n:**
- `locales/en/navigation.json`
- `locales/el/navigation.json`
- `locales/en/archive.json` (new namespace)
- `locales/el/archive.json` (new namespace)

---

## 13. What Is NOT Changing

- Hard-delete on org deletion
- Hard-delete on account deletion
- `deletedAt` flows on Contact, Request, Deal (user departure / GDPR)
- `canDelete` permission (still gates the Archive button in active views)
- Any entity not in scope list above (Comments, Showings, etc.)
