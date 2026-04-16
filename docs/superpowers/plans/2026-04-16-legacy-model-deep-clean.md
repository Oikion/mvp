# Legacy Model Deep-Clean Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all legacy `clients`, `mandates`, `accounts`, and `client-contacts` models, routes, APIs, and actions from the codebase, leaving only the v2 `contacts` and `requests` entities.

**Architecture:** The codebase is mid-migration from Entity Architecture v1 (Client/Mandate) to v2 (Contact/Request). Both models coexist in the Prisma schema. The cleanup proceeds bottom-up: fix bugs first, then remove UI routes, then remove APIs, then remove schema models. Each phase leaves the app in a working state.

**Tech Stack:** Next.js 15 App Router, Prisma 6, TypeScript, shadcn/ui, next-intl, pnpm

---

## Audit: What Each Legacy Thing Is

Before any changes, here is exactly what exists, why, and the risk of deletion.

### 1. `accounts` CRM route — `app/[locale]/app/(routes)/crm/accounts/`

**What it is:** A list view + detail view that displays the same data as the `contacts` route. `get-accounts.ts` is literally a wrapper that calls `getClients()`. The `[accountId]` detail page calls `getAccount()` → `prismadb.clients.findFirst()`. The 5 table cells (`EmailCell`, `StatusCell`, `AssignedUserCell`, `PhoneCell`, `NameCell`) all import `updateClient` from legacy actions.

**Why it exists:** Historical naming — before v2, contacts were called "accounts" in parts of the UI. The route was never cleaned up during the v2 migration.

**What breaks if deleted:**
- MLS Properties table imports 3 shared components from `crm/accounts/table-components/` (re-exports) — **these must be moved first**
- `SharedEntitiesList.tsx` links to `/app/crm/accounts/:id`
- `DealDetail.tsx` links to `/app/crm/accounts/:id`
- `EntityLinker.tsx` uses `tCrm("accounts")` i18n key
- Data is NOT lost — it's in the `Clients` Prisma model which stays until schema phase

**Verdict:** Delete this route. Move shared table components first. Fix all links to point to `/app/crm/contacts/`.

---

### 2. `client-contacts` API — `app/api/crm/client-contacts/route.ts`

**What it is:** An API that creates/updates records in the `client_Contacts` Prisma model — a pre-v2 concept of "individual people associated with a company account" (like a company contact directory). This is completely separate from the v2 `Contact` model.

**Why it exists:** Before v2, the data model had `Client` (company) → `client_Contacts` (people at that company). The v2 migration replaced both with the unified `Contact` model.

**Critical bug found:** `NewContactForm.tsx` in the contacts module (`app/[locale]/app/(routes)/crm/contacts/components/NewContactForm.tsx:104`) still POSTs to `/api/crm/client-contacts` instead of `/api/crm/contacts`. This means new contacts created from the Contacts tab go into the old dead table, not the `Contact` model.

**What breaks if deleted:** The `NewContactForm.tsx` bug means contacts aren't being created properly anyway. Fix the form first, then delete the route. No data migration needed — the `client_Contacts` table is a ghost table; real contacts live in `Contact`.

**Verdict:** Fix `NewContactForm.tsx` to POST to `/api/crm/contacts`, then delete this API route.

---

### 3. `clients` CRM route — `app/[locale]/app/(routes)/crm/clients/`

**What it is:** The old primary CRM list + detail view. Has its own `NewClientWizard`, `EditClientForm`, `ClientView`, etc. Still POSTs to `/api/crm/clients` which stores data in the `Clients` Prisma model.

**Why it exists:** This was the main CRM before v2. The v2 migration added the `contacts` route but didn't remove `clients`.

**What breaks if deleted:**
- Many navigation links point to `/app/crm/clients/` (GlobalSearch, notifications, calendar, mentions, entity cards)
- `NewClientWizard` is still the wizard for creating clients — if contacts route has its own full wizard, this is safe to remove
- All links must be updated to `/app/crm/contacts/`

**Verdict:** Delete this route after fixing all navigation links. The `contacts` route with `NewContactWizard` replaces it.

---

### 4. `mandates` Prisma model + APIs + actions

**What they are:** The full `Mandate` model (50+ fields, line 1611 in schema), `MandateComment` model, `app/api/mandates/` API routes, and `actions/mandates/` action files. These are the v1 equivalent of `Request`/`RequestComment`.

**Why they exist:** v2 renamed `Mandate` → `Request` but kept the old model for data compatibility during migration. A migration script exists at `scripts/migrate-mandates-to-requests.ts`.

**22 real files still use `prismadb.mandate.*`:**
- `actions/mandates/get-mandate.ts`, `get-mandates.ts`, `update-mandate.ts`, `update-mandate-visibility.ts`
- `actions/network/get-cross-org-matches.ts`, `get-my-network-items.ts`
- `app/api/mandates/[mandateId]/comments/route.ts`, `linked/route.ts`, `[mandateId]/route.ts`, `draft/route.ts`, `link-entities/route.ts`, `route.ts`
- `app/api/export/mandates/route.ts`
- `app/api/documents/[documentId]/link-entities/route.ts`
- `app/api/e2ee/entity-sessions/route.ts`
- `lib/resolve-entity.ts`, `lib/search/entity-search.ts`, `lib/user-departure/nullify-org-references.ts`
- `scripts/migrate-mandates-to-requests.ts` (migration tool — keep until data migrated)

**What breaks if deleted:** All of the above. The entire mandate system stops working. These must be migrated to `prismadb.request.*` before the model can be removed.

**Verdict:** Migrate all 22 files query by query to use `Request` model, then delete the Mandate model from schema.

---

### 5. Legacy CRM actions — `actions/crm/` (partial)

**What they are:** `get-clients.ts`, `get-client.ts`, `update-client.ts`, `update-client-visibility.ts`, `get-shared-clients.ts`, `get-shared-client.ts`, `get-client-contacts.ts`, `get-accounts.ts`, `get-account.ts`, `get-contacts-by-accountId.ts`, `get-accounts-by-contactId.ts`

All query `prismadb.clients` or `prismadb.client_Contacts`. Already have v2 equivalents in `actions/contacts/`.

**What breaks:** Everything that imports them. This is the final cleanup step after routes are removed.

---

### 6. What NOT to touch

- **`crm_Accounts_Tasks` model**: Despite the name, this is the **general CRM task system** (tasks, comments, calendar sync, documents). It powers core app functionality. Do NOT rename or delete in this plan.
- **`MyAccount` model**: Financial/accounting settings, unrelated to CRM contacts.
- **`actions/crm/get-contact.ts`, `get-contacts.ts`**: These are v2 — keep them.

---

## File Map

### Files to DELETE:
- `app/[locale]/app/(routes)/crm/accounts/` (entire directory)
- `app/[locale]/app/(routes)/crm/clients/` (entire directory)
- `app/api/crm/client-contacts/route.ts`
- `app/api/crm/clients/` (entire directory — after requests API fully covers use cases)
- `app/api/mandates/` (entire directory — after migrating to requests)
- `app/api/export/mandates/route.ts`
- `actions/crm/get-clients.ts`, `get-client.ts`, `update-client.ts`, `update-client-visibility.ts`
- `actions/crm/get-shared-clients.ts`, `get-shared-client.ts`
- `actions/crm/get-client-contacts.ts`, `get-accounts.ts`, `get-account.ts`
- `actions/crm/get-contacts-by-accountId.ts`, `get-accounts-by-contactId.ts`
- `actions/mandates/` (entire directory)
- `lib/validations/mandates.ts` (if exists, after migration)
- `locales/en/mandates.json`, `locales/el/mandates.json` (after removing imports)

### Files to MOVE:
- `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-faceted-filter.tsx` → `components/ui/data-table/`
- `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-view-options.tsx` → `components/ui/data-table/`
- `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-pagination.tsx` → `components/ui/data-table/`
- `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-column-header.tsx` → `components/ui/data-table/`
- `app/[locale]/app/(routes)/crm/accounts/table-components/data-table.tsx` → `components/ui/data-table/`

### Files to MODIFY:

**Fix form bug:**
- `app/[locale]/app/(routes)/crm/contacts/components/NewContactForm.tsx` — change POST target

**Fix MLS re-exports:**
- `app/[locale]/app/(routes)/mls/properties/table-components/data-table-faceted-filter.tsx`
- `app/[locale]/app/(routes)/mls/properties/table-components/data-table-view-options.tsx`
- `app/[locale]/app/(routes)/mls/properties/table-components/data-table-pagination.tsx`

**Fix navigation links (clients → contacts):**
- `components/GlobalSearch.tsx`
- `components/entity/EntityCardActions.tsx`
- `components/mentions/MentionShortcutOverlay.tsx`
- `components/notifications/NotificationPopover.tsx`
- `components/linking/LinkedEntitiesPanel.tsx`
- `components/calendar/EventDetailCard.tsx`
- `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`
- `app/[locale]/app/(routes)/crm/tasks/viewtask/[taskId]/components/TaskViewPage.tsx`

**Fix navigation links (accounts → contacts):**
- `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`
- `app/[locale]/app/(routes)/network/shared/components/SharedEntitiesList.tsx`
- `app/[locale]/app/(routes)/deals/[dealId]/components/DealDetail.tsx`

**Mandate → Request migration (22 files listed above)**

**Schema:**
- `prisma/schema.prisma` — remove `Mandate`, `MandateComment`, `client_Contacts`, `clients` models

**Locale:**
- `app/[locale]/layout.tsx` — remove mandates imports

---

## Tasks

---

### Task 1: Move shared table components out of `accounts/`

The MLS properties table currently imports from `crm/accounts/table-components/`. Move these to `components/ui/data-table/` so they are not coupled to the accounts route.

**Files:**
- Move: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-faceted-filter.tsx` → `components/ui/data-table/data-table-faceted-filter.tsx`
- Move: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-view-options.tsx` → `components/ui/data-table/data-table-view-options.tsx`
- Move: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-pagination.tsx` → `components/ui/data-table/data-table-pagination.tsx`
- Move: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-column-header.tsx` → `components/ui/data-table/data-table-column-header.tsx`
- Move: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table.tsx` → `components/ui/data-table/data-table.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/data-table-faceted-filter.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/data-table-view-options.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/data-table-pagination.tsx`
- Modify: `app/[locale]/app/(routes)/crm/contacts/table-components/*.tsx` (update any imports from accounts/)

- [ ] **Step 1: Check current content and existing ui/data-table directory**

```bash
ls /Users/stapo/Desktop/Oikion/MVP/components/ui/data-table/ 2>/dev/null || echo "Directory does not exist"
ls "/Users/stapo/Desktop/Oikion/MVP/app/[locale]/app/(routes)/crm/accounts/table-components/"
```

- [ ] **Step 2: Check if components/ui/data-table/ already has these files**

```bash
grep -rn "from.*crm/accounts/table-components" /Users/stapo/Desktop/Oikion/MVP --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees
```

Expected: Should show the 3 MLS re-export files and any contact table files.

- [ ] **Step 3: Copy each table component to components/ui/data-table/**

Read each file in `crm/accounts/table-components/` and write it to `components/ui/data-table/`. Do NOT change their content — just move them.

```bash
# After reading each file, write to new location
# Files: data-table-faceted-filter.tsx, data-table-view-options.tsx,
#         data-table-pagination.tsx, data-table-column-header.tsx, data-table.tsx
```

- [ ] **Step 4: Update MLS re-export files to point to new location**

In `app/[locale]/app/(routes)/mls/properties/table-components/data-table-faceted-filter.tsx`, change:
```typescript
// Before:
export { DataTableFacetedFilter } from "@/app/[locale]/app/(routes)/crm/accounts/table-components/data-table-faceted-filter";
// After:
export { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
```

Repeat for `data-table-view-options.tsx` and `data-table-pagination.tsx`.

- [ ] **Step 5: Update any contacts table-components imports**

```bash
grep -rn "from.*crm/accounts/table-components" "/Users/stapo/Desktop/Oikion/MVP/app/[locale]/app/(routes)/crm/contacts" --include="*.tsx" --include="*.ts"
```

Update any found imports to use `@/components/ui/data-table/`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "data-table\|accounts/table" | head -20
```

Expected: No errors related to data-table imports.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ui): move shared data-table components out of crm/accounts"
```

---

### Task 2: Fix NewContactForm to POST to correct endpoint

**Critical bug:** `NewContactForm.tsx` POSTs to `/api/crm/client-contacts` (old dead table) instead of `/api/crm/contacts`. New contacts created from the Contacts tab are going into the wrong database table.

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/components/NewContactForm.tsx`

- [ ] **Step 1: Read the form to understand the full POST payload**

Read `app/[locale]/app/(routes)/crm/contacts/components/NewContactForm.tsx` lines 80–150.

- [ ] **Step 2: Read the contacts POST API to understand expected payload shape**

Read `app/api/crm/contacts/route.ts` — look at the POST handler and what fields it accepts.

- [ ] **Step 3: Compare field names**

The old `client-contacts` API accepted: `contact_first_name`, `contact_last_name`, `email`, `mobile_phone`, `relationship_to_client`, etc.

The new `contacts` API accepts camelCase fields: `firstName`, `lastName`, `primaryEmail`, `primaryPhone`, etc.

Map each field from the old form to the new contact API fields. Document the mapping here before proceeding.

- [ ] **Step 4: Update NewContactForm.tsx**

Change the POST target:
```typescript
// Before:
await axios.post("/api/crm/client-contacts", {
  contact_first_name: values.firstName,
  contact_last_name: values.lastName,
  // ... old field names
});

// After:
await axios.post("/api/crm/contacts", {
  firstName: values.firstName,
  lastName: values.lastName,
  // ... new field names matching contacts API
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "NewContactForm" | head -10
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/app/(routes)/crm/contacts/components/NewContactForm.tsx"
git commit -m "fix(crm): NewContactForm now POSTs to /api/crm/contacts instead of dead client-contacts endpoint"
```

---

### Task 3: Update all navigation links from `/crm/clients/` to `/crm/contacts/`

Many components still link to the old `/app/crm/clients/` route. Update all of them to `/app/crm/contacts/`.

**Files:**
- Modify: `components/GlobalSearch.tsx`
- Modify: `components/entity/EntityCardActions.tsx`
- Modify: `components/mentions/MentionShortcutOverlay.tsx`
- Modify: `components/notifications/NotificationPopover.tsx`
- Modify: `components/linking/LinkedEntitiesPanel.tsx`
- Modify: `components/calendar/EventDetailCard.tsx`
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`
- Modify: `app/[locale]/app/(routes)/crm/tasks/viewtask/[taskId]/components/TaskViewPage.tsx`

- [ ] **Step 1: Find all files that reference /crm/clients/ paths**

```bash
grep -rn "crm/clients" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees | grep -v "api/crm/clients\|actions/crm" | grep "router\.push\|href\|path\|Link"
```

- [ ] **Step 2: Update GlobalSearch.tsx**

Read `components/GlobalSearch.tsx`. Find the line:
```typescript
{ id: "go-clients", label: "Clients", icon: User, path: "/app/crm/clients", shortcut: "G C" },
```
Change to:
```typescript
{ id: "go-contacts", label: "Contacts", icon: User, path: "/app/crm/contacts", shortcut: "G C" },
```

- [ ] **Step 3: Update EntityCardActions.tsx**

Read `components/entity/EntityCardActions.tsx`. Find:
```typescript
return `/app/crm/clients/${entityFriendlyId ?? entityId}`;
```
Change to:
```typescript
return `/app/crm/contacts/${entityFriendlyId ?? entityId}`;
```

- [ ] **Step 4: Update MentionShortcutOverlay.tsx**

Read `components/mentions/MentionShortcutOverlay.tsx`. Find:
```typescript
path = `/${locale}/app/crm/clients/${item.friendlyId}`;
```
Change to:
```typescript
path = `/${locale}/app/crm/contacts/${item.friendlyId}`;
```

- [ ] **Step 5: Update NotificationPopover.tsx**

Read `components/notifications/NotificationPopover.tsx`. Find all `router.push(\`/app/crm/clients/...`)` calls and change `clients` to `contacts`.

- [ ] **Step 6: Update LinkedEntitiesPanel.tsx**

Read `components/linking/LinkedEntitiesPanel.tsx`. Find:
```typescript
onClick={() => router.push(`/app/crm/clients/${client.friendlyId}`)}
```
Change to:
```typescript
onClick={() => router.push(`/app/crm/contacts/${client.friendlyId}`)}
```

- [ ] **Step 7: Update EventDetailCard.tsx**

Read `components/calendar/EventDetailCard.tsx`. Find the `/app/crm/clients/` router push and change to `/app/crm/contacts/`.

- [ ] **Step 8: Update EventDetailView.tsx**

Read `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`. Change `/app/crm/clients/` → `/app/crm/contacts/`.

- [ ] **Step 9: Update TaskViewPage.tsx**

Read `app/[locale]/app/(routes)/crm/tasks/viewtask/[taskId]/components/TaskViewPage.tsx`. Find the `/app/crm/clients/` router push and change to `/app/crm/contacts/`.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "GlobalSearch\|EntityCardActions\|MentionShortcut\|Notification\|LinkedEntities\|EventDetail\|TaskViewPage" | head -20
```

Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git add components/GlobalSearch.tsx components/entity/EntityCardActions.tsx components/mentions/MentionShortcutOverlay.tsx components/notifications/NotificationPopover.tsx components/linking/LinkedEntitiesPanel.tsx components/calendar/EventDetailCard.tsx
git add "app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx"
git add "app/[locale]/app/(routes)/crm/tasks/viewtask/[taskId]/components/TaskViewPage.tsx"
git commit -m "fix(nav): update all /crm/clients links to /crm/contacts"
```

---

### Task 4: Update links from `/crm/accounts/` to `/crm/contacts/`

**Files:**
- Modify: `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`
- Modify: `app/[locale]/app/(routes)/network/shared/components/SharedEntitiesList.tsx`
- Modify: `app/[locale]/app/(routes)/deals/[dealId]/components/DealDetail.tsx`

- [ ] **Step 1: Update SharedEntitiesList.tsx**

Read `app/[locale]/app/(routes)/network/shared/components/SharedEntitiesList.tsx`. Find:
```typescript
return `/app/crm/accounts/${entity.friendlyId}`;
```
Change to:
```typescript
return `/app/crm/contacts/${entity.friendlyId}`;
```

- [ ] **Step 2: Update DealDetail.tsx**

Read `app/[locale]/app/(routes)/deals/[dealId]/components/DealDetail.tsx`. Find:
```typescript
<Link href={`/app/crm/accounts/${deal.client.id}`}>
```
Change to:
```typescript
<Link href={`/app/crm/contacts/${deal.contact?.id ?? deal.client.id}`}>
```
(Use the v2 `contact` field if available, fall back to `client.id` for now)

- [ ] **Step 3: Update sharing-hub/page.tsx**

Read `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`. The `networkItems.mandates` references will be handled in the mandate migration task. For now, just fix any `/crm/accounts/` links.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "SharedEntitiesList\|DealDetail\|sharing-hub" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/app/(routes)/network/shared/components/SharedEntitiesList.tsx"
git add "app/[locale]/app/(routes)/deals/[dealId]/components/DealDetail.tsx"
git add "app/[locale]/app/(routes)/network/sharing-hub/page.tsx"
git commit -m "fix(nav): update /crm/accounts links to /crm/contacts"
```

---

### Task 5: Delete `accounts` CRM route

Tasks 1 and 4 have cleared all dependencies. The `accounts` route can now be removed.

**Files:**
- Delete: `app/[locale]/app/(routes)/crm/accounts/` (entire directory)
- Modify: `app/[locale]/app/(routes)/crm/components/MainPageView.tsx` (remove `getAccounts` import)

- [ ] **Step 1: Confirm no remaining imports from accounts route**

```bash
grep -rn "from.*crm/accounts\|crm/accounts" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees | grep -v "table-components" | grep -v ".worktrees"
```

Expected: Only the `MainPageView.tsx` import of `getAccounts` remains.

- [ ] **Step 2: Update MainPageView.tsx**

Read `app/[locale]/app/(routes)/crm/components/MainPageView.tsx`. Remove:
```typescript
import { getAccounts } from "@/actions/crm/get-accounts";
// ...
const accounts = await getAccounts();
```
And remove `accounts` from any props being passed down. If `accounts` data is used in the component, replace it with a `contacts` fetch.

- [ ] **Step 3: Delete the accounts directory**

```bash
rm -rf "/Users/stapo/Desktop/Oikion/MVP/app/[locale]/app/(routes)/crm/accounts"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep -i "accounts\|Cannot find module" | head -20
```

Expected: No errors about missing accounts modules.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(crm): remove legacy accounts CRM route"
```

---

### Task 6: Delete `client-contacts` API route

Task 2 has fixed the form bug. The `client-contacts` API and model are now unused.

**Files:**
- Delete: `app/api/crm/client-contacts/route.ts`
- Delete: `actions/crm/get-client-contacts.ts`

- [ ] **Step 1: Confirm no remaining callers**

```bash
grep -rn "client-contacts\|client_Contacts\|getClientContacts" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components /Users/stapo/Desktop/Oikion/MVP/actions --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees | grep -v "route.ts" | grep -v "get-client-contacts.ts"
```

Expected: No results (or only `get-client-contacts.ts` which we're about to delete).

- [ ] **Step 2: Delete the files**

```bash
rm "/Users/stapo/Desktop/Oikion/MVP/app/api/crm/client-contacts/route.ts"
rmdir "/Users/stapo/Desktop/Oikion/MVP/app/api/crm/client-contacts" 2>/dev/null || true
rm "/Users/stapo/Desktop/Oikion/MVP/actions/crm/get-client-contacts.ts"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "client-contacts\|client_Contacts\|getClientContacts" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(crm): remove client-contacts legacy API and action"
```

---

### Task 7: Delete `clients` CRM route

The `/crm/contacts/` route is the v2 replacement. After fixing all nav links in Task 3, the `clients` route is safe to remove.

**Files:**
- Delete: `app/[locale]/app/(routes)/crm/clients/` (entire directory)

- [ ] **Step 1: Confirm no remaining nav links to /crm/clients**

```bash
grep -rn "crm/clients" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees | grep -v "api/crm/clients\|actions/crm"
```

Expected: No results (or only files inside the `clients/` directory itself).

- [ ] **Step 2: Delete the entire clients directory**

```bash
rm -rf "/Users/stapo/Desktop/Oikion/MVP/app/[locale]/app/(routes)/crm/clients"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep -i "crm/clients\|NewClientWizard\|ClientView\|ClientsPage" | head -20
```

Expected: No errors about missing modules.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(crm): remove legacy clients CRM route (replaced by contacts)"
```

---

### Task 8: Delete `app/api/crm/clients/` — legacy client REST API

The `clients` REST API (`POST /api/crm/clients`, `PUT /api/crm/clients`, `GET /api/crm/clients/:id`, etc.) served the old client wizard and forms. With the route removed, these endpoints are dead.

**Files:**
- Delete: `app/api/crm/clients/` (entire directory)

- [ ] **Step 1: Find any remaining callers of /api/crm/clients**

```bash
grep -rn "api/crm/clients\|/crm/clients" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees | grep -v "\"app/api/crm/clients\"" | grep -v "app/api/crm/clients/\[clientId\]"
```

Expected: No results (all callers were in the now-deleted `clients` route).

- [ ] **Step 2: Delete the clients API directory**

```bash
rm -rf "/Users/stapo/Desktop/Oikion/MVP/app/api/crm/clients"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "api/crm/clients" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): remove legacy /api/crm/clients endpoints"
```

---

### Task 9: Delete legacy CRM actions

With the routes and APIs gone, the legacy action files that query `prismadb.clients` are now unused.

**Files:**
- Delete: `actions/crm/get-clients.ts`
- Delete: `actions/crm/get-client.ts`
- Delete: `actions/crm/update-client.ts`
- Delete: `actions/crm/update-client-visibility.ts`
- Delete: `actions/crm/get-shared-clients.ts`
- Delete: `actions/crm/get-shared-client.ts`
- Delete: `actions/crm/get-accounts.ts`
- Delete: `actions/crm/get-account.ts`
- Delete: `actions/crm/get-contacts-by-accountId.ts`
- Delete: `actions/crm/get-accounts-by-contactId.ts`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -rn "from.*actions/crm/get-client\b\|from.*actions/crm/update-client\|from.*actions/crm/get-account\|from.*actions/crm/get-shared-client\|from.*actions/crm/get-contacts-by\|from.*actions/crm/get-accounts-by" /Users/stapo/Desktop/Oikion/MVP --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees
```

Expected: No results.

- [ ] **Step 2: Delete the files**

```bash
cd "/Users/stapo/Desktop/Oikion/MVP/actions/crm"
rm get-clients.ts get-client.ts update-client.ts update-client-visibility.ts
rm get-shared-clients.ts get-shared-client.ts
rm get-accounts.ts get-account.ts
rm get-contacts-by-accountId.ts get-accounts-by-contactId.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "get-client\|update-client\|get-account\|get-shared-client" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(crm): remove all legacy client actions (get-clients, update-client, get-accounts, etc.)"
```

---

### Task 10: Migrate `mandates` → `requests` in core lib files

These 3 files are foundational — they're referenced by many other systems. Migrate them first so everything else can reference the correct model.

**Files:**
- Modify: `lib/resolve-entity.ts`
- Modify: `lib/search/entity-search.ts`
- Modify: `lib/user-departure/nullify-org-references.ts`

- [ ] **Step 1: Read and understand lib/resolve-entity.ts mandate section**

Read `lib/resolve-entity.ts`. Find the mandate branch — understand what fields it reads and maps.

- [ ] **Step 2: Migrate resolve-entity.ts**

In `lib/resolve-entity.ts`, replace the `prismadb.mandate.findFirst(...)` branch with `prismadb.request.findFirst(...)`. Map the new `Request` field names:
- `title` → `title`
- `status` → check Request model for status enum
- `organizationId` → `organizationId`
- The `id` and `friendlyId` fields should exist on both

```typescript
// Before:
case "mandate": {
  const mandate = await prismadb.mandate.findFirst({
    where: { id: entityId, organizationId },
    select: { id: true, title: true, status: true, ... }
  });
  // ...
}

// After:
case "request": {
  const request = await prismadb.request.findFirst({
    where: { id: entityId, organizationId },
    select: { id: true, title: true, status: true, ... }
  });
  // ...
}
```

Also update any `"mandate"` string literals to `"request"` in the switch cases.

- [ ] **Step 3: Read and migrate entity-search.ts**

Read `lib/search/entity-search.ts`. Find all `prismadb.mandate.findMany(...)` calls. Replace with `prismadb.request.findMany(...)`. Map field names from Mandate to Request schema (check `prisma/schema.prisma` lines 3758+ for the Request model fields).

- [ ] **Step 4: Read and migrate nullify-org-references.ts**

Read `lib/user-departure/nullify-org-references.ts`. Find mandate update calls:
```typescript
await prismadb.mandate.updateMany({
  where: { organizationId, assignedTo: userId },
  data: { assignedTo: null }
});
```
Replace with:
```typescript
await prismadb.request.updateMany({
  where: { organizationId, assignedAgentId: userId },
  data: { assignedAgentId: null }
});
```
(Check the Request model for the exact field name for the assigned user — it may be `assignedAgentId` or similar.)

- [ ] **Step 5: Verify TypeScript compiles for these 3 files**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "resolve-entity\|entity-search\|nullify-org" | head -20
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/resolve-entity.ts lib/search/entity-search.ts lib/user-departure/nullify-org-references.ts
git commit -m "feat(requests): migrate core lib files from mandate to request model"
```

---

### Task 11: Migrate `mandates` → `requests` in network actions

**Files:**
- Modify: `actions/network/get-cross-org-matches.ts`
- Modify: `actions/network/get-my-network-items.ts`

- [ ] **Step 1: Read and migrate get-cross-org-matches.ts**

Read `actions/network/get-cross-org-matches.ts`. Replace `prismadb.mandate.findMany(...)` with `prismadb.request.findMany(...)`. Map all fields to their Request equivalents. The cross-org match logic likely queries mandate's `visibility`, `areas_of_interest`, or similar — map these to Request fields.

- [ ] **Step 2: Read and migrate get-my-network-items.ts**

Read `actions/network/get-my-network-items.ts`. Replace mandate queries with request queries. This file may return `{ properties: [...], mandates: [...] }` — change the response shape to `{ properties: [...], requests: [...] }`. Note: `sharing-hub/page.tsx` uses `networkItems.mandates` — update that file too when this action changes its return type.

- [ ] **Step 3: Update sharing-hub/page.tsx mandate references**

Read `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`. Find `networkItems.mandates` usages and change to `networkItems.requests`. Also update any displayed label or i18n key from "mandates" to "requests".

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "get-cross-org\|get-my-network\|sharing-hub" | head -20
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add actions/network/get-cross-org-matches.ts actions/network/get-my-network-items.ts
git add "app/[locale]/app/(routes)/network/sharing-hub/page.tsx"
git commit -m "feat(requests): migrate network actions from mandate to request model"
```

---

### Task 12: Migrate `mandates` → `requests` in API routes

**Files:**
- Modify: `app/api/mandates/route.ts`
- Modify: `app/api/mandates/[mandateId]/route.ts`
- Modify: `app/api/mandates/[mandateId]/comments/route.ts`
- Modify: `app/api/mandates/[mandateId]/linked/route.ts`
- Modify: `app/api/mandates/draft/route.ts`
- Modify: `app/api/mandates/link-entities/route.ts`
- Modify: `app/api/documents/[documentId]/link-entities/route.ts`
- Modify: `app/api/e2ee/entity-sessions/route.ts`

> **Important:** These API routes likely have equivalent `app/api/requests/` routes. Before rewriting, check if `app/api/requests/` routes already exist and are complete. If they do, the mandate API routes should redirect/alias to them rather than being rewritten.

- [ ] **Step 1: Check if requests API routes already exist**

```bash
ls /Users/stapo/Desktop/Oikion/MVP/app/api/requests/ 2>/dev/null || echo "No requests API directory"
```

- [ ] **Step 2a: If requests API exists — add redirect routes**

If `app/api/requests/` has full CRUD, the `app/api/mandates/` routes should be replaced with HTTP 308 redirects to the equivalent requests URLs. This allows any old bookmarked or cached API calls to still work:

```typescript
// app/api/mandates/route.ts replacement:
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/api/requests" + url.search, req.url), 308);
}
export async function POST(req: Request) {
  return NextResponse.redirect(new URL("/api/requests", req.url), 308);
}
```

- [ ] **Step 2b: If requests API does NOT exist — migrate the mandate API to serve requests**

Read each mandate API route. Replace `prismadb.mandate.*` queries with `prismadb.request.*`. Map all field names. Rename the routes from `app/api/mandates/` to `app/api/requests/` by creating new files and then deleting the old directory.

- [ ] **Step 3: Migrate document link-entities route**

Read `app/api/documents/[documentId]/link-entities/route.ts`. Find the mandate branch. Change to request:
```typescript
// Find the case "mandate" branch and change to:
case "request": {
  await prismadb.document.update({
    where: { id: documentId },
    data: { requests: { connect: { id: entityId } } }
  });
}
```

- [ ] **Step 4: Migrate e2ee/entity-sessions route**

Read `app/api/e2ee/entity-sessions/route.ts`. Find mandate query and replace with request query. The session is keyed by entity type and ID — update the `"mandate"` string key to `"request"`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "mandates\|mandate" | head -20
```

Expected: No errors related to mandate model (may still see mandate route files but no type errors).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(requests): migrate mandate API routes to request model"
```

---

### Task 13: Migrate `mandates` → `requests` in mandate actions

**Files:**
- Migrate: `actions/mandates/get-mandate.ts` → update to use `prismadb.request`
- Migrate: `actions/mandates/get-mandates.ts` → update to use `prismadb.request`
- Migrate: `actions/mandates/update-mandate.ts` → update to use `prismadb.request`
- Migrate: `actions/mandates/update-mandate-visibility.ts` → update to use `prismadb.request`

> **Check first:** If equivalent actions exist in `actions/requests/`, these can just re-export from there instead of being rewritten.

- [ ] **Step 1: Check if actions/requests/ exists**

```bash
ls /Users/stapo/Desktop/Oikion/MVP/actions/requests/ 2>/dev/null || echo "No requests actions directory"
```

- [ ] **Step 2a: If actions/requests/ has equivalents — create re-exports**

If `actions/requests/get-request.ts` exists, change `actions/mandates/get-mandate.ts` to:
```typescript
// Backward compat re-export — to be deleted once all callers migrated
export { getRequest as getMandate } from "@/actions/requests/get-request";
```

Repeat for each mandate action.

- [ ] **Step 2b: If actions/requests/ does NOT exist — migrate the mandate actions**

Read each mandate action. Replace `prismadb.mandate.*` with `prismadb.request.*`. Map field names to the Request model. Move the files to `actions/requests/` with new names (`get-request.ts`, etc.).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "actions/mandates" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(requests): migrate mandate actions to request model"
```

---

### Task 14: Migrate `mandates` → `requests` in export and remaining files

**Files:**
- Modify: `app/api/export/mandates/route.ts`
- Modify: Any remaining files found in step 1

- [ ] **Step 1: Confirm remaining mandate references**

```bash
grep -rn "prismadb\.mandate\." /Users/stapo/Desktop/Oikion/MVP --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .worktrees | grep -v "scripts/"
```

Expected: Should show only `app/api/export/mandates/route.ts` and any stragglers.

- [ ] **Step 2: Migrate export/mandates/route.ts**

Read `app/api/export/mandates/route.ts`. Replace `prismadb.mandate.findMany(...)` with `prismadb.request.findMany(...)`. Update field mappings for the export format. Rename the file to `app/api/export/requests/route.ts` (create new directory).

- [ ] **Step 3: Handle any remaining straggler files found in step 1**

For each remaining file, read it and migrate the mandate query to request.

- [ ] **Step 4: Verify TypeScript compiles with zero mandate model usages**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep -i "mandate" | head -20
```

Expected: No TypeScript errors (locale import warnings are OK at this stage).

- [ ] **Step 5: Remove mandate locale imports from layout**

Read `app/[locale]/layout.tsx` lines 48-98. Remove:
```typescript
import mandatesEn from "@/locales/en/mandates.json";
import mandatesEl from "@/locales/el/mandates.json";
```
And remove them from the messages object passed to `NextIntlClientProvider`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(requests): complete mandate→request migration, remove export/mandates, clean locale imports"
```

---

### Task 15: Delete mandate actions, delete mandate API directory

**Files:**
- Delete: `actions/mandates/` (entire directory)
- Delete: `app/api/mandates/` (entire directory, after redirect routes or migration complete)
- Delete: `app/api/export/mandates/route.ts` (if not already renamed)
- Delete: `locales/en/mandates.json`
- Delete: `locales/el/mandates.json`

- [ ] **Step 1: Confirm zero remaining callers of mandate actions**

```bash
grep -rn "from.*actions/mandates\|from.*api/mandates" /Users/stapo/Desktop/Oikion/MVP/app /Users/stapo/Desktop/Oikion/MVP/components /Users/stapo/Desktop/Oikion/MVP/actions --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .worktrees
```

Expected: No results.

- [ ] **Step 2: Delete directories and files**

```bash
rm -rf "/Users/stapo/Desktop/Oikion/MVP/actions/mandates"
rm -rf "/Users/stapo/Desktop/Oikion/MVP/app/api/mandates"
rm -f "/Users/stapo/Desktop/Oikion/MVP/locales/en/mandates.json"
rm -f "/Users/stapo/Desktop/Oikion/MVP/locales/el/mandates.json"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && pnpm vitest run 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cleanup): delete mandate actions, API directory, and locale files"
```

---

### Task 16: Remove `Mandate`, `MandateComment`, `clients`, and `client_Contacts` from Prisma schema

This is the final schema cleanup. All queries have been migrated. The models can now be removed.

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Verify zero Prisma queries remain on these models**

```bash
grep -rn "prismadb\.mandate\.\|prismadb\.clients\.\|prismadb\.client_Contacts\." /Users/stapo/Desktop/Oikion/MVP --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .worktrees | grep -v "scripts/"
```

Expected: No results (scripts are OK to leave for historical reference).

- [ ] **Step 2: Read the schema to identify exact line ranges**

Read `prisma/schema.prisma`. Find:
- `Mandate` model start/end lines
- `MandateComment` model start/end lines
- `clients` model start/end lines (if it still exists)
- `client_Contacts` model start/end lines

Also note any enum definitions used ONLY by these models (check if `MandateStatus`, `MandatePurpose`, etc. are used anywhere else).

- [ ] **Step 3: Remove the models from schema.prisma**

Delete the `Mandate` model block, `MandateComment` model block, `clients` model block, and `client_Contacts` model block from `prisma/schema.prisma`.

Also remove any enums that were ONLY used by these models. Do NOT remove enums shared with other models (e.g., `PropertyPurpose` is used by `Request` — keep it).

- [ ] **Step 4: Run prisma generate to check for schema errors**

Tell the user: run `pnpm prisma generate` and check for schema validation errors.

- [ ] **Step 5: Create the migration**

Tell the user: run `pnpm db:migrate` (dev) with migration name `remove_legacy_client_mandate_models`.

The migration will generate DROP TABLE statements for these tables. **Before applying:** verify there is no data in production tables that has not been migrated to Contact/Request. Run the data migration scripts if needed.

- [ ] **Step 6: Verify TypeScript compiles after schema removal**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | head -30
```

Expected: No type errors. The Prisma client no longer has `prismadb.mandate` etc. so any missed queries will surface as TypeScript errors here.

- [ ] **Step 7: Run all tests**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && pnpm vitest run 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): remove legacy Mandate, MandateComment, clients, client_Contacts models"
```

---

### Task 17: Clean up remaining mandate/client string references in UI

After schema cleanup, hunt down any leftover UI strings, i18n keys, and type comments that still say "mandate" or "client" (as an entity concept).

**Files:**
- Modify: `app/[locale]/app/(routes)/settings/(org-required)/departures/[departureId]/DepartureDetailClient.tsx`
- Modify: `app/[locale]/app/(routes)/profile/components/DataControlTab.tsx`
- Modify: `app/[locale]/app/(onboarding)/create-organization/components/ImportDataStep.tsx`
- Modify: `components/GlobalSearch.tsx` (if any remaining "Clients" label)
- Modify: Any i18n namespace files that still have "mandate" keys used in UI

- [ ] **Step 1: Find remaining mandate string literals in UI**

```bash
grep -rn "\"mandates\"\|'mandates'\|mandates\.\|Mandate\|\"clients\"\|'clients'" /Users/stapo/Desktop/Oikion/MVP/app --include="*.tsx" | grep -v node_modules | grep -v .worktrees | grep -v "api/\|route.ts\|scripts/" | head -30
```

- [ ] **Step 2: Update DepartureDetailClient.tsx**

Read the file. Find `td("mandates")` and `entities.mandates.map(...)`. Change to `td("requests")` and `entities.requests.map(...)`. Update the corresponding i18n key in the `settings` locale files.

- [ ] **Step 3: Update DataControlTab.tsx**

Read the file. Find `{ key: "mandates", icon: ClipboardList }`. Change to `{ key: "requests", icon: ClipboardList }`. Update the corresponding display label.

- [ ] **Step 4: Update ImportDataStep.tsx**

Read the file. Find `{ key: "mandates", Icon: FileText }`. Change to `{ key: "requests", Icon: FileText }`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && pnpm vitest run 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(ui): replace remaining mandate/client string references with request/contact"
```

---

## Execution Order Summary

```
Task 1  → Move shared table components (unblocks Task 5)
Task 2  → Fix NewContactForm bug (unblocks Task 6)
Task 3  → Fix /crm/clients nav links (unblocks Task 7)
Task 4  → Fix /crm/accounts nav links (unblocks Task 5)
Task 5  → Delete accounts route (depends on 1, 4)
Task 6  → Delete client-contacts API (depends on 2)
Task 7  → Delete clients route (depends on 3)
Task 8  → Delete clients API (depends on 7)
Task 9  → Delete legacy CRM actions (depends on 8)
Task 10 → Migrate core lib files (mandate→request)
Task 11 → Migrate network actions
Task 12 → Migrate mandate API routes
Task 13 → Migrate mandate actions
Task 14 → Migrate export + remaining files
Task 15 → Delete mandate directories (depends on 10-14)
Task 16 → Remove schema models (depends on 9, 15)
Task 17 → Clean up UI string references
```

**Safe to run in parallel:**
- Tasks 1–4 can all run simultaneously (independent)
- Tasks 5–9 run sequentially after their dependencies
- Tasks 10–14 can run simultaneously (mandate migration, independent files)
- Task 15 waits for 10–14
- Task 16 waits for 9 and 15
- Task 17 can run any time after Task 16

---

## Data Migration Note

Before Task 16 (schema removal) in production:
1. Run `scripts/migrate-mandates-to-requests.ts` to copy any remaining Mandate rows to Request
2. Run `scripts/migrate-clients-to-contacts.ts` to copy any remaining Clients rows to Contact
3. Verify zero rows remain in the legacy tables
4. Then apply the schema migration

These scripts already exist in `scripts/` and were built for exactly this purpose.
