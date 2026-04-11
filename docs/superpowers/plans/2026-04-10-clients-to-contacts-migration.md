# Clients → Contacts Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy `Clients` model and all related infrastructure from the codebase, replacing every reference with the already-existing `Contact` model (Phase 1 entity, camelCase fields).

**Architecture:** Two coexisting models currently exist — `Clients` (old, snake_case) and `Contact` (new, camelCase). This migration removes `Clients` entirely. A new `ContactProperty` M2M join table replaces `Client_Properties`. The `watchers String[]` field must be added to Contact for notification compatibility.

**Tech Stack:** Next.js 16 (App Router), Prisma 6, PostgreSQL, TypeScript, Clerk v6, SWR

---

## CRITICAL CONTEXT FOR THE EXECUTING AGENT

Read this entire section before touching any code.

### Two coexisting models — know the difference

**`Clients` (OLD — to be removed):**
- Table: `clients` (PascalCase model name)
- Fields: snake_case (`client_name`, `primary_email`, `primary_phone`, `client_status`, `assigned_to`, `afm`, `id_doc`, `company_gemi`, `allow_marketing`, `gdpr_consent`, `person_type`, `lead_source`, `language`)
- Encryption: `encryptClientForOrg` / `decryptClientForOrg` in `lib/model-encryption.ts`
- Prisma accessor: `prismadb.clients`

**`Contact` (NEW — to keep and extend):**
- Table: `contacts` (mapped via `@@map("contacts")`)
- Fields: camelCase (`displayName`, `email`, `primaryPhone`, `status`, `assignedAgentId`, `taxId`, `idDocument`, `companyGemi`, `allowMarketing`, `gdprConsentGiven`, `isCompany`, `source`, `languagePreference`)
- Encryption: `encryptContactForOrg` / `decryptContactForOrg` in `lib/model-encryption.ts`
- Prisma accessor: `prismadb.contact`
- Already has `legacyClientId String?` for traceability
- Soft delete: `deletedAt DateTime?` — included in `SOFT_DELETE_MODELS` in `lib/prisma.ts`

### Field mapping reference (Clients → Contact)
| Clients field | Contact field |
|---|---|
| `client_name` | `displayName` |
| `full_name` | _(composite of firstName + lastName)_ |
| `primary_email` | `email` |
| `secondary_email` | `secondaryEmail` |
| `primary_phone` | `primaryPhone` |
| `secondary_phone` | `secondaryPhone` |
| `office_phone` | `officePhone` |
| `client_status` | `status` |
| `assigned_to` | `assignedAgentId` |
| `afm` | `taxId` |
| `id_doc` | `idDocument` |
| `company_gemi` | `companyGemi` |
| `allow_marketing` | `allowMarketing` |
| `gdpr_consent` | `gdprConsentGiven` |
| `client_type` | `category[]` (array) |
| `person_type` | `isCompany` (bool) |
| `lead_source` | `source` |
| `language` | `languagePreference` |
| `description` | `notes` |
| `visibility` | `visibility` |
| billing_*/shipping_* | `addresses JSON[]` |
| `watchers` | `watchers` _(must be added to Contact schema)_ |
| `friendlyId` | `friendlyId` |

### What must be ADDED to Contact (schema gaps)
1. **`watchers String[]`** — needed by `notifyAccountWatchers()` in `lib/notifications/helpers.ts`
2. **`ContactProperty` M2M join table** — replaces `Client_Properties` for property linking (Contact currently only has `ownedProperties` via single FK `ownerId`, not many-to-many)

### Existing join tables to REMOVE from schema
- `ClientComment` — replaced by `ContactComment` (already exists)
- `Client_Contacts` — legacy table, orphan records
- `Client_Properties` — replaced by new `ContactProperty`
- `Mandate_Clients` — Mandate already has `RequestContact` M2M; this is unused
- `crm_Accounts_Tasks` — legacy tasks table referencing Clients

### Nullable FK fields to remove from other models
- `Deal.clientId` (nullable `String?`, with `Clients?` relation `onDelete: SetNull`)
- `PropertyShowing.clientId` (nullable `String?`, with `Clients?` relation `onDelete: SetNull`)
- `CalendarEvent` — has `Clients[]` via `"EventToClients"` relation (old) AND `Contact[]` via `"EventToContacts"` (new). Remove old one.
- `Documents` — has `Clients[]` via `"DocumentsToClients"` relation (old) AND `Contact[]` via `"DocumentsToContacts"` (new). Remove old one.

### Key file paths to know
```
prisma/schema.prisma
lib/model-encryption.ts
lib/notifications/helpers.ts
lib/webhooks.ts
lib/search/entity-search.ts
lib/prisma.ts
actions/crm/get-clients.ts                         → DELETE
actions/crm/get-client.ts                          → DELETE
actions/crm/get-shared-clients.ts                  → REWRITE for Contact
actions/crm/get-shared-client.ts                   → REWRITE for Contact
actions/crm/update-client.ts                       → DELETE
actions/crm/update-client-visibility.ts            → DELETE
actions/dashboard/get-recent-clients.ts            → REWRITE for Contact
actions/dashboard/get-accounts-count.ts            → REWRITE for Contact
app/api/crm/clients/route.ts                       → DELETE
app/api/crm/clients/[clientId]/route.ts            → DELETE
app/api/crm/clients/[clientId]/linked/route.ts     → DELETE
app/api/crm/clients/link-properties/route.ts       → DELETE
app/api/crm/contacts/[contactId]/linked/route.ts   → REWRITE (add ContactProperty)
app/api/mls/properties/[propertyId]/linked/route.ts → FIX (root 500 cause)
app/api/v1/crm/clients/route.ts                    → REPLACE with contacts
app/api/v1/crm/clients/[clientId]/route.ts         → REPLACE with contacts
hooks/swr/useClients.ts                            → DELETE (useContacts exists)
hooks/swr/useClientsPaginated.ts                   → DELETE
hooks/swr/useClientLinked.ts                       → DELETE (useContactLinked exists)
hooks/swr/useClientComments.ts                     → DELETE (useContactComments exists)
hooks/swr/index.ts                                 → REMOVE client hook exports
```

### Prisma accessor reminder
- `prismadb.clients` → `prismadb.contact` (singular, lowercase)
- `prismadb.client_Properties` → `prismadb.contactProperty` (new table)
- `prismadb.clientComment` → `prismadb.contactComment` (already exists)

---

## File Structure

**Files to CREATE:**
- `prisma/migrations/YYYYMMDD_remove_clients_add_contact_property/migration.sql` (auto-generated)
- `app/api/crm/contacts/[contactId]/link-properties/route.ts` (new — for ContactProperty M2M)
- `app/api/v1/crm/contacts/route.ts` (replaces v1 clients)
- `app/api/v1/crm/contacts/[contactId]/route.ts` (replaces v1 clients/[clientId])

**Files to DELETE:**
- `actions/crm/get-clients.ts`
- `actions/crm/get-client.ts`
- `actions/crm/update-client.ts`
- `actions/crm/update-client-visibility.ts`
- `app/api/crm/clients/route.ts`
- `app/api/crm/clients/[clientId]/route.ts`
- `app/api/crm/clients/[clientId]/linked/route.ts`
- `app/api/crm/clients/link-properties/route.ts`
- `app/api/v1/crm/clients/route.ts`
- `app/api/v1/crm/clients/[clientId]/route.ts`
- `hooks/swr/useClients.ts`
- `hooks/swr/useClientsPaginated.ts`
- `hooks/swr/useClientLinked.ts`
- `hooks/swr/useClientComments.ts`

**Files to MODIFY:**
- `prisma/schema.prisma`
- `lib/model-encryption.ts`
- `lib/notifications/helpers.ts`
- `lib/webhooks.ts`
- `lib/search/entity-search.ts`
- `lib/prisma.ts` (verify SOFT_DELETE_MODELS — Contact already present)
- `actions/crm/get-shared-clients.ts` → rewrite to use Contact
- `actions/crm/get-shared-client.ts` → rewrite to use Contact
- `actions/dashboard/get-recent-clients.ts` → rewrite to use Contact
- `actions/dashboard/get-accounts-count.ts` → rewrite to use Contact
- `app/api/crm/contacts/[contactId]/linked/route.ts` → add ContactProperty section
- `app/api/mls/properties/[propertyId]/linked/route.ts` → fix 500 (remove client_Properties)
- `hooks/swr/index.ts` → remove client hook exports

---

## Task 1: Schema — Add `watchers` to Contact, Add `ContactProperty` M2M, Remove Clients

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `watchers String[]` to the Contact model**

Find the Contact model (line ~3711). Add `watchers` after `tags`:

```prisma
  // In the Contact model, after:
  tags               String[]
  // Add:
  watchers           String[]
```

- [ ] **Step 2: Add `ContactProperty` M2M join table to schema**

After the `Contact` model closing brace, add:

```prisma
/// M2M join table linking contacts to properties they are interested in (not ownership).
/// Replaces the legacy Client_Properties table.
model ContactProperty {
  id         String     @id @default(uuid())
  createdAt  DateTime   @default(now())
  contactId  String
  propertyId String
  contact    Contact    @relation("ContactLinkedProperties", fields: [contactId], references: [id], onDelete: Cascade)
  property   Properties @relation("PropertyLinkedContacts", fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([contactId, propertyId])
  @@index([contactId])
  @@index([propertyId])
  @@map("contact_properties")
}
```

- [ ] **Step 3: Add back-references for ContactProperty on Contact and Properties models**

In the `Contact` model relations section, add:
```prisma
  linkedProperties         ContactProperty[]  @relation("ContactLinkedProperties")
```

In the `Properties` model relations section (search for `Client_Properties` there), add:
```prisma
  linkedContacts           ContactProperty[]  @relation("PropertyLinkedContacts")
```

- [ ] **Step 4: Remove all Clients-dependent models**

Remove the following model blocks entirely from `prisma/schema.prisma`:
- `model ClientComment { ... }` (lines ~148–163)
- `model Client_Contacts { ... }` (lines ~166–207)
- `model Client_Properties { ... }` (lines ~209–220)
- `model Mandate_Clients { ... }` (lines ~235–246)
- `model Clients { ... }` (lines ~249–319)

- [ ] **Step 5: Remove FK fields on other models that reference Clients**

In `model Deal`:
- Remove the line: `clientId String? // Nullable for SetNull cascade safety`
- Remove the line: `Clients       Clients?   @relation(fields: [clientId], references: [id], onDelete: SetNull)`
- Remove: `@@index([clientId])` (in Deal's index list)

In `model PropertyShowing`:
- Remove: `clientId String? // Client who was shown the property`
- Remove: `Clients        Clients?       @relation(fields: [clientId], references: [id], onDelete: SetNull)`
- Remove: `@@index([clientId])` (in PropertyShowing's index list)

In `model CalendarEvent`:
- Remove: `CalendarEvent Clients[] @relation("EventToClients")` (the old client relation)
- Keep: all Contact relations

In `model Documents`:
- Remove: `Clients Documents[] @relation("DocumentsToClients")` (the old client relation on Documents)
- Keep: all Contact relations

In `model Properties`:
- Remove: `Client_Properties Client_Properties[]`
- Keep: `linkedContacts ContactProperty[] @relation("PropertyLinkedContacts")` (just added above)

In `model Users`:
- Remove: `Clients_Clients_assigned_toToUsers Clients[] @relation("Clients_assigned_toToUsers")`
- Remove: `Clients_watching_accounts Users[] @relation("watching_accounts")` — actually this is on Clients side. Remove in the Users model: any `watching_accounts` or `Clients` relation arrays that reference the deleted model.

In `model crm_Accounts_Tasks` (if it references Clients):
- Remove the `Clients` relation field

- [ ] **Step 6: Verify schema compiles**

Run:
```bash
pnpm prisma validate
```
Expected: no errors. Fix any "Unknown field" or "Relation X not found" errors before proceeding.

- [ ] **Step 7: Commit schema changes**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add ContactProperty M2M, add watchers to Contact, remove Clients model"
```

---

## Task 2: Generate and Review Migration SQL

**Files:**
- Generate: `prisma/migrations/[timestamp]_remove_clients_add_contact_property/migration.sql`

- [ ] **Step 1: Generate the migration**

```bash
pnpm db:migrate
```
When prompted for a name, enter: `remove_clients_add_contact_property`

Expected output: Migration file created at `prisma/migrations/[timestamp]_remove_clients_add_contact_property/migration.sql`

- [ ] **Step 2: Review the generated SQL**

Open the migration file. Confirm it contains:
- `CREATE TABLE "contact_properties"` with `contact_id`, `property_id` columns
- `ALTER TABLE "contacts" ADD COLUMN "watchers" TEXT[]`
- `DROP TABLE "clients"` (or `"Clients"` depending on the existing @@map)
- `DROP TABLE "client_comments"` (or similar)
- `DROP TABLE "client_contacts"` (or `"Client_Contacts"`)
- `DROP TABLE "client_properties"` (or `"Client_Properties"`)
- `DROP TABLE "mandate_clients"` (or `"Mandate_Clients"`)
- `ALTER TABLE "deals" DROP COLUMN "clientId"`
- `ALTER TABLE "property_showings" DROP COLUMN "clientId"` (check actual table name)

If the migration looks correct, proceed. If Prisma missed something, add it manually.

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm prisma generate
```
Expected: client regenerated with no errors. If TypeScript errors mention `prismadb.clients`, that is expected — we fix them in subsequent tasks.

- [ ] **Step 4: Commit migration**

```bash
git add prisma/migrations/
git commit -m "chore(migration): remove_clients_add_contact_property"
```

---

## Task 3: Update `lib/model-encryption.ts` — Remove Client encryption helpers

**Files:**
- Modify: `lib/model-encryption.ts`

- [ ] **Step 1: Remove the Client encryption block**

In `lib/model-encryption.ts`, find and delete:
1. The comment block `// ─── Clients ───`
2. The `CLIENT_ENCRYPTED_STRING_FIELDS` array constant
3. The `type ClientStringField` type alias
4. The `type ClientWithEncryptedFields` type alias
5. The `export async function encryptClientForOrg<T extends ClientWithEncryptedFields>(...)` function (and its implementation)
6. The `export async function decryptClientForOrg<T extends ClientWithEncryptedFields>(...)` function (and its implementation)

Keep: all Contact, Calendar, Documents, Property, Message, Activity encryption functions.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "model-encryption" | head -20
```
Expected: no errors from model-encryption.ts

- [ ] **Step 3: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "chore(encryption): remove CLIENT_ENCRYPTED_STRING_FIELDS and encryptClientForOrg helpers"
```

---

## Task 4: Update `lib/notifications/helpers.ts` — Replace client notifications with contact

**Files:**
- Modify: `lib/notifications/helpers.ts`

- [ ] **Step 1: Add `notifyContactCreated` function**

In `lib/notifications/helpers.ts`, add this function directly after `notifyClientCreated`:

```typescript
/**
 * Notify organization when a new contact is created
 */
export async function notifyContactCreated(payload: EntityCreationPayload): Promise<void> {
  // Notify all org members except the creator
  await notifyOrganization(
    payload.organizationId,
    payload.creatorId,
    "CONTACT_CREATED",
    "New contact added",
    `${payload.creatorName} added a new contact: "${payload.entityName}"`,
    {
      entityType: "CONTACT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        contactName: payload.entityName,
      },
    }
  );

  // If assigned to someone else, send additional assignment notification
  if (payload.assignedToId && payload.assignedToId !== payload.creatorId) {
    await createNotification({
      userId: payload.assignedToId,
      organizationId: payload.organizationId,
      type: "CONTACT_ASSIGNED",
      title: "Contact assigned to you",
      message: `${payload.creatorName} assigned the contact "${payload.entityName}" to you`,
      entityType: "CONTACT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        contactName: payload.entityName,
      },
    });
  }
}
```

- [ ] **Step 2: Rewrite `notifyAccountWatchers` to use Contact**

Replace the existing `notifyAccountWatchers` function body with:

```typescript
export async function notifyAccountWatchers(
  accountId: string,
  organizationId: string,
  type: "ACCOUNT_UPDATED" | "ACCOUNT_DELETED" | "ACCOUNT_TASK_CREATED" | "ACCOUNT_TASK_UPDATED",
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Get the contact with watchers
    const contact = await prismadb.contact.findFirst({
      where: { id: accountId, organizationId },
      select: {
        id: true,
        displayName: true,
        watchers: true,
      },
    });

    if (!contact || !contact.watchers || contact.watchers.length === 0) {
      return;
    }

    const watcherIds = contact.watchers;
    const actorId = metadata?.updatedBy as string | undefined;
    const filteredIds = actorId
      ? watcherIds.filter((id) => id !== actorId)
      : watcherIds;

    if (filteredIds.length === 0) {
      return;
    }

    await createBulkNotifications({
      userIds: filteredIds,
      organizationId,
      type,
      title,
      message,
      entityType: "CONTACT",
      entityId: accountId,
      actorId: metadata?.updatedBy as string | undefined,
      actorName: metadata?.updatedByName as string | undefined,
      metadata: {
        accountName: contact.displayName,
        ...metadata,
      },
    });

    await sendNotificationEmailToUsers(filteredIds, type, {
      actorName: metadata?.updatedByName as string | undefined,
      actorId: metadata?.updatedBy as string | undefined,
      entityId: accountId,
      entityName: contact.displayName,
      metadata,
    });
  } catch (error) {
    console.error("[NOTIFY_ACCOUNT_WATCHERS]", error);
  }
}
```

- [ ] **Step 3: Update `notifyEntityShared` to handle CONTACT entity type**

Find the line in `notifyEntityShared`:
```typescript
entityType: payload.entityType === "PROPERTY" ? "PROPERTY" : 
            payload.entityType === "CLIENT" ? "ACCOUNT" : "DOCUMENT",
```

Replace with:
```typescript
entityType: payload.entityType === "PROPERTY" ? "PROPERTY" :
            payload.entityType === "CLIENT" ? "CONTACT" :
            payload.entityType === "CONTACT" ? "CONTACT" : "DOCUMENT",
```

- [ ] **Step 4: TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep "helpers" | head -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add lib/notifications/helpers.ts
git commit -m "feat(notifications): add notifyContactCreated, migrate notifyAccountWatchers to Contact"
```

---

## Task 5: Update `lib/webhooks.ts` — Add contact webhook events

**Files:**
- Modify: `lib/webhooks.ts`

- [ ] **Step 1: Add contact events to WEBHOOK_EVENTS**

In `lib/webhooks.ts`, in the `WEBHOOK_EVENTS` object, add after the client events:

```typescript
  // Contact events (v2.0 — replaces client events)
  CONTACT_CREATED: "contact.created",
  CONTACT_UPDATED: "contact.updated",
  CONTACT_DELETED: "contact.deleted",
```

- [ ] **Step 2: Add contact event descriptions**

In `WEBHOOK_EVENT_DESCRIPTIONS`, add:
```typescript
  "contact.created": "Triggered when a new contact is created",
  "contact.updated": "Triggered when a contact is updated",
  "contact.deleted": "Triggered when a contact is deleted",
```

- [ ] **Step 3: Add `dispatchContactWebhook` function**

Add after `dispatchClientWebhook`:

```typescript
/**
 * Dispatch contact webhook (v2.0 — replaces dispatchClientWebhook)
 */
export async function dispatchContactWebhook(
  organizationId: string,
  event: "contact.created" | "contact.updated" | "contact.deleted",
  contact: {
    id: string;
    displayName: string;
    email?: string | null;
    status?: string | null;
    category?: string[] | null;
    assignedAgentId?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    contact: {
      id: contact.id,
      name: contact.displayName,
      email: contact.email,
      status: contact.status,
      category: contact.category,
      assignedTo: contact.assignedAgentId,
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/webhooks.ts
git commit -m "feat(webhooks): add contact.created/updated/deleted events and dispatchContactWebhook"
```

---

## Task 6: Update `lib/search/entity-search.ts` — Remove `searchClients`

**Files:**
- Modify: `lib/search/entity-search.ts`

- [ ] **Step 1: Remove `searchClients` function**

In `lib/search/entity-search.ts`:
1. Delete the entire `export async function searchClients(...)` function body
2. Remove `"client"` from the `EntityType` union type
3. In `searchEntities()`, remove the `case "client":` branch that calls `searchClients()`
4. In the results aggregation object returned by `searchEntities()`, remove the `clients:` key
5. Remove any `import` of `Prisma.ClientsWhereInput` if present
6. Remove `decryptClientForOrg` import from this file (it's being removed from model-encryption anyway)

The `searchContacts()` function already exists and is correct — leave it untouched.

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "entity-search" | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/search/entity-search.ts
git commit -m "chore(search): remove searchClients, keep searchContacts"
```

---

## Task 7: Rewrite Dashboard Actions

### 7a: `actions/dashboard/get-recent-clients.ts`

**Files:**
- Modify: `actions/dashboard/get-recent-clients.ts`

- [ ] **Step 1: Rewrite `getRecentClients` to use Contact**

Replace the entire file contents with:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export async function getRecentClients(limit = 5): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const contacts = await prismadb.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        email: true,
        status: true,
        createdAt: true,
        assignedAgentId: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    const decrypted = await Promise.all(
      contacts.map((c) => decryptContactForOrg(c, organizationId))
    );

    const result = decrypted.map((c) => ({
      id: c.id,
      friendlyId: c.friendlyId,
      name: c.displayName,
      email: c.email,
      status: c.status,
      createdAt: c.createdAt,
      assigned_to: c.assignedAgentId,
      assigned_to_user: c.assignedAgent,
    }));

    return actionSuccess(serializePrisma(result));
  } catch (error) {
    console.error("[GET_RECENT_CONTACTS]", error);
    return actionError("Failed to fetch recent contacts", error as Error);
  }
}
```

### 7b: `actions/dashboard/get-accounts-count.ts`

**Files:**
- Modify: `actions/dashboard/get-accounts-count.ts`

- [ ] **Step 2: Rewrite `getAccountsCount` to use Contact**

Replace entire file contents with:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export async function getAccountsCount(): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const count = await prismadb.contact.count({ where: { organizationId } });
    return actionSuccess({ count });
  } catch (error) {
    console.error("[GET_CONTACTS_COUNT]", error);
    return actionError("Failed to count contacts", error as Error);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add actions/dashboard/get-recent-clients.ts actions/dashboard/get-accounts-count.ts
git commit -m "feat(dashboard): migrate getRecentClients and getAccountsCount to Contact"
```

---

## Task 8: Rewrite Shared Entity CRM Actions

### 8a: Delete legacy get-client(s) and update-client actions

- [ ] **Step 1: Delete legacy CRM actions**

```bash
rm actions/crm/get-clients.ts
rm actions/crm/get-client.ts
rm actions/crm/update-client.ts
rm actions/crm/update-client-visibility.ts
```

Check if any file still imports these:
```bash
grep -r "get-clients\|get-client\|update-client" actions/ app/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "get-contact\|update-contact\|Contact"
```
If there are callers, update them to use the Contact equivalents before deleting.

### 8b: Rewrite `actions/crm/get-shared-clients.ts`

**Files:**
- Modify: `actions/crm/get-shared-clients.ts`

- [ ] **Step 2: Rewrite `getSharedClients` to use Contact**

Replace entire file contents with:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";

export async function getSharedContacts(): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const sharedEntities = await prismadb.sharedEntity.findMany({
      where: {
        organizationId,
        entityType: "CONTACT",
      },
      include: {
        contact: {
          select: {
            id: true,
            friendlyId: true,
            displayName: true,
            email: true,
            primaryPhone: true,
            status: true,
            visibility: true,
            category: true,
          },
        },
      },
    });

    const results = await Promise.all(
      sharedEntities
        .filter((se) => se.contact)
        .map(async (se) => {
          const decrypted = await decryptContactForOrg(se.contact!, organizationId);
          return { ...se, contact: decrypted };
        })
    );

    return actionSuccess(serializePrisma(results));
  } catch (error) {
    console.error("[GET_SHARED_CONTACTS]", error);
    return actionError("Failed to fetch shared contacts", error as Error);
  }
}
```

### 8c: Rewrite `actions/crm/get-shared-client.ts`

**Files:**
- Modify: `actions/crm/get-shared-client.ts`

- [ ] **Step 3: Rewrite `getSharedClient` to use Contact**

Replace entire file contents with:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";

export async function getSharedContact(contactId: string): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        linkedProperties: {
          include: {
            property: {
              select: { id: true, property_name: true, friendlyId: true, property_status: true },
            },
          },
        },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!contact) return actionNotFound("Contact");

    const decrypted = await decryptContactForOrg(contact, organizationId);
    return actionSuccess(serializePrisma(decrypted));
  } catch (error) {
    console.error("[GET_SHARED_CONTACT]", error);
    return actionError("Failed to fetch contact", error as Error);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add actions/crm/
git commit -m "feat(crm): rewrite shared contact actions, delete legacy client actions"
```

---

## Task 9: Delete Legacy Internal API Routes

**Files to delete:**
- `app/api/crm/clients/route.ts`
- `app/api/crm/clients/[clientId]/route.ts`
- `app/api/crm/clients/[clientId]/linked/route.ts`
- `app/api/crm/clients/link-properties/route.ts`

- [ ] **Step 1: Check if any component still calls these endpoints**

```bash
grep -r "api/crm/clients" app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

If any callers remain, update them to use `/api/crm/contacts/...` before deleting.

- [ ] **Step 2: Delete the route files**

```bash
rm app/api/crm/clients/route.ts
rm "app/api/crm/clients/[clientId]/route.ts"
rm "app/api/crm/clients/[clientId]/linked/route.ts"
rm app/api/crm/clients/link-properties/route.ts
rmdir "app/api/crm/clients/[clientId]" 2>/dev/null || true
rmdir app/api/crm/clients 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(api): delete legacy /api/crm/clients routes"
```

---

## Task 10: Fix the 500 Error — Update Property Linked Route

This is the **root cause of the current production 500 error** on PropertyDetailPage.

**Files:**
- Modify: `app/api/mls/properties/[propertyId]/linked/route.ts`

- [ ] **Step 1: Read the current file**

Read `app/api/mls/properties/[propertyId]/linked/route.ts` before editing.

- [ ] **Step 2: Replace `client_Properties` query with `ContactProperty`**

Find the section that queries `prismadb.client_Properties` (which returns linked clients for this property). Replace it with:

```typescript
// Linked contacts (via ContactProperty M2M)
const linkedContacts = await prismadb.contactProperty.findMany({
  where: { propertyId, property: { organizationId } },
  include: {
    contact: {
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
      },
    },
  },
});

const decryptedContacts = await Promise.all(
  linkedContacts.map(async (lc) => {
    const decrypted = await decryptContactForOrg(lc.contact, organizationId);
    return decrypted;
  })
);
```

Also update the import to use `decryptContactForOrg` instead of `decryptClientForOrg`.

Also update the return shape: change `clients:` → `contacts:` in the JSON response (or keep `clients:` temporarily for backward compat with frontend — decide based on whether frontend ContactView already uses `contacts`).

- [ ] **Step 3: TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep "properties.*linked\|linked.*properties" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/mls/properties/[propertyId]/linked/route.ts"
git commit -m "fix(api): replace client_Properties with ContactProperty in property linked route (fixes 500)"
```

---

## Task 11: Create Contact-Property Linking Route

**Files:**
- Create: `app/api/crm/contacts/[contactId]/link-properties/route.ts`

- [ ] **Step 1: Create the new linking route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { z } from "zod";

const linkSchema = z.object({
  propertyIds: z.array(z.string()).min(1),
});

const unlinkSchema = z.object({
  propertyId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const writeCheck = await canPerformAction("contact:update");
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;
    const body = await req.json();
    const validation = linkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.flatten() }, { status: 400 });
    }

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Upsert all property links
    await Promise.all(
      validation.data.propertyIds.map((propertyId) =>
        prismadb.contactProperty.upsert({
          where: { contactId_propertyId: { contactId, propertyId } },
          create: { contactId, propertyId },
          update: {},
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_PROPERTIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const writeCheck = await canPerformAction("contact:update");
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;
    const body = await req.json();
    const validation = unlinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prismadb.contactProperty.deleteMany({
      where: { contactId, propertyId: validation.data.propertyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_PROPERTIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update Contact Linked route to include ContactProperty**

Read `app/api/crm/contacts/[contactId]/linked/route.ts`. Add a `linkedProperties` section using `prismadb.contactProperty`:

```typescript
// Linked properties via ContactProperty M2M
const linkedProperties = await prismadb.contactProperty.findMany({
  where: { contactId, contact: { organizationId } },
  include: {
    property: {
      select: {
        id: true,
        friendlyId: true,
        property_name: true,
        property_status: true,
        property_type: true,
        price: true,
      },
    },
  },
});
```

Include `linkedProperties: linkedProperties.map(lp => lp.property)` in the response JSON.

- [ ] **Step 3: Commit**

```bash
git add app/api/crm/contacts/
git commit -m "feat(api): add ContactProperty link-properties route and update contact linked endpoint"
```

---

## Task 12: Replace External v1 API — Clients → Contacts

**Files:**
- Create: `app/api/v1/crm/contacts/route.ts`
- Create: `app/api/v1/crm/contacts/[contactId]/route.ts`
- Delete: `app/api/v1/crm/clients/route.ts`
- Delete: `app/api/v1/crm/clients/[clientId]/route.ts`

- [ ] **Step 1: Create `app/api/v1/crm/contacts/route.ts`**

```typescript
import { withExternalApi, API_SCOPES } from "@/lib/external-api-middleware";
import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import { z } from "zod";

const createContactV1Schema = z.object({
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  category: z.array(z.enum(["BUYER", "SELLER", "RENTER", "INVESTOR", "LANDLORD", "REFERRAL_PARTNER", "NOTARY", "LAWYER", "OTHER"])).optional(),
  assignedAgentId: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
}).strict();

export const GET = withExternalApi(
  async (req, context) => {
    const { organizationId } = context;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    const contacts = await prismadb.contact.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
        assignedAgentId: true,
        source: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const decrypted = await Promise.all(
      contacts.slice(0, limit).map((c) => decryptContactForOrg(c, organizationId))
    );

    const hasMore = contacts.length > limit;
    const nextCursor = hasMore ? contacts[limit - 1].id : null;

    return NextResponse.json({
      data: decrypted,
      meta: { cursor: nextCursor, hasMore, limit },
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

export const POST = withExternalApi(
  async (req, context) => {
    const { organizationId } = context;
    const body = await req.json();
    const validation = createContactV1Schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const encrypted = await encryptContactForOrg(validation.data, organizationId);
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);

    const contact = await prismadb.contact.create({
      data: {
        ...encrypted,
        organizationId,
        friendlyId,
        displayName: validation.data.displayName,
      },
    });

    const decrypted = await decryptContactForOrg(contact, organizationId);

    return NextResponse.json(
      { data: decrypted, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);
```

- [ ] **Step 2: Create `app/api/v1/crm/contacts/[contactId]/route.ts`**

```typescript
import { withExternalApi, API_SCOPES } from "@/lib/external-api-middleware";
import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";
import { deleteEntitySessionsForEntity } from "@/lib/entity-sessions";
import { dispatchContactWebhook } from "@/lib/webhooks";
import { z } from "zod";

const updateContactV1Schema = z.object({
  displayName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  category: z.array(z.enum(["BUYER", "SELLER", "RENTER", "INVESTOR", "LANDLORD", "REFERRAL_PARTNER", "NOTARY", "LAWYER", "OTHER"])).optional(),
  assignedAgentId: z.string().optional(),
  notes: z.string().optional(),
}).strict();

export const GET = withExternalApi(
  async (req, context, { params }) => {
    const { organizationId } = context;
    const { contactId } = await params;

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const decrypted = await decryptContactForOrg(contact, organizationId);
    return NextResponse.json({ data: decrypted, timestamp: new Date().toISOString() });
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

export const PUT = withExternalApi(
  async (req, context, { params }) => {
    const { organizationId } = context;
    const { contactId } = await params;

    const existing = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const validation = updateContactV1Schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const encrypted = await encryptContactForOrg(validation.data, organizationId);
    const contact = await prismadb.contact.update({
      where: { id: contactId },
      data: encrypted,
    });

    const decrypted = await decryptContactForOrg(contact, organizationId);
    await dispatchContactWebhook(organizationId, "contact.updated", decrypted);

    return NextResponse.json({ data: decrypted, timestamp: new Date().toISOString() });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

export const DELETE = withExternalApi(
  async (req, context, { params }) => {
    const { organizationId } = context;
    const { contactId } = await params;

    const existing = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, displayName: true, email: true, status: true, category: true, assignedAgentId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Soft delete
    await prismadb.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    // Clean up E2EE sessions
    await deleteEntitySessionsForEntity("CONTACT", contactId).catch(() => {});

    await dispatchContactWebhook(organizationId, "contact.deleted", existing);

    return new NextResponse(null, { status: 204 });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);
```

- [ ] **Step 3: Delete old v1 client routes**

First check if there are any users of the old v1 endpoints that need migration notices:
```bash
grep -r "v1/crm/clients" app/ --include="*.ts" --include="*.tsx" | grep -v "v1/crm/clients/route"
```

Then delete:
```bash
rm app/api/v1/crm/clients/route.ts
rm "app/api/v1/crm/clients/[clientId]/route.ts"
rmdir "app/api/v1/crm/clients/[clientId]" 2>/dev/null || true
rmdir app/api/v1/crm/clients 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/crm/
git commit -m "feat(api/v1): replace /crm/clients with /crm/contacts endpoints"
```

---

## Task 13: Update SWR Hooks — Remove Client Hooks, Update Index

**Files:**
- Delete: `hooks/swr/useClients.ts`
- Delete: `hooks/swr/useClientsPaginated.ts`
- Delete: `hooks/swr/useClientLinked.ts`
- Delete: `hooks/swr/useClientComments.ts`
- Modify: `hooks/swr/index.ts`

- [ ] **Step 1: Find all callers of client hooks**

```bash
grep -r "useClients\|useClientsPaginated\|useClientLinked\|useClientComments\|useAddClientComment\|useDeleteClientComment\|ClientData\|ClientComment\|getClientLinkedKey\|getClientCommentsKey\|PaginatedClientData" app/ components/ --include="*.ts" --include="*.tsx"
```

For each file found, update it to use the Contact equivalent:
- `useClients` → `useContacts`
- `useClientsPaginated` → `useContactsPaginated` (create if needed — see Step 3)
- `useClientLinked` / `getClientLinkedKey` → `useContactLinked` / `getContactLinkedKey` (already exists)
- `useClientComments` / `useAddClientComment` / `useDeleteClientComment` / `getClientCommentsKey` → `useContactComments` (already exported)

- [ ] **Step 2: Delete the client hook files**

```bash
rm hooks/swr/useClients.ts
rm hooks/swr/useClientsPaginated.ts
rm hooks/swr/useClientLinked.ts
rm hooks/swr/useClientComments.ts
```

- [ ] **Step 3: Create `useContactsPaginated` if it does not exist**

Check: `ls hooks/swr/useContactsPaginated.ts 2>/dev/null`

If it does not exist, create `hooks/swr/useContactsPaginated.ts`:

```typescript
import useSWRInfinite from "swr/infinite";
import fetcher from "@/lib/fetcher";
import { buildPaginatedUrl, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export interface ContactData {
  id: string;
  friendlyId: string | null;
  displayName: string;
  status: string;
  email: string | null;
  primaryPhone: string | null;
  assignedAgentId: string | null;
  assignedAgent: { id: string; firstName: string | null; lastName: string | null; avatar: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  items: ContactData[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseContactsPaginatedOptions {
  limit?: number;
  status?: string;
  search?: string;
  enabled?: boolean;
}

export function useContactsPaginated(options: UseContactsPaginatedOptions = {}) {
  const { limit = DEFAULT_PAGE_SIZE, status, search, enabled = true } = options;

  const getKey = (pageIndex: number, previousPageData: PaginatedResponse | null) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    if (!enabled) return null;

    if (pageIndex === 0) {
      return buildPaginatedUrl("/api/crm/contacts", { limit }, { status, search });
    }

    const cursor = previousPageData?.nextCursor;
    if (!cursor) return null;
    return buildPaginatedUrl("/api/crm/contacts", { cursor, limit }, { status, search });
  };

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<PaginatedResponse>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const contacts = data ? data.flatMap((page) => page.items) : [];
  const hasMore = data ? (data[data.length - 1]?.hasMore ?? false) : false;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  return {
    contacts,
    isLoading: !data && !error,
    isLoadingMore: !!isLoadingMore,
    hasMore,
    loadMore: () => { if (!isLoadingMore && hasMore) setSize(size + 1); },
    error,
    refresh: () => mutate(),
    size,
  };
}
```

- [ ] **Step 4: Update `hooks/swr/index.ts`**

In `hooks/swr/index.ts`:

1. Remove these exports:
```typescript
// DELETE these lines:
export { useClientLinked, getClientLinkedKey } from "./useClientLinked";
export { useClientComments, useAddClientComment, useDeleteClientComment, getClientCommentsKey } from "./useClientComments";
export type { ClientComment } from "./useClientComments";
export { useClients } from "./useClients";
export type { ClientOption } from "./useClients";
export { useClientsPaginated } from "./useClientsPaginated";
export type { ClientData as PaginatedClientData } from "./useClientsPaginated";
// Also in useLinkMutations section, remove:
//   useLinkClientsToProperty,
//   useUnlinkClientFromProperty,
//   useLinkPropertiesToClient,
//   useUnlinkPropertyFromClient,
//   useLinkClientsToDocument,
//   useUnlinkClientFromDocument,
//   useLinkDocumentsToClient,
//   useUnlinkDocumentFromClient,
//   useLinkMandatesToClient,
//   useUnlinkMandateFromClient,
```

2. Also remove `useClientSearch` from the `useUnifiedEntitySearch` export if `searchClients` no longer exists (check `hooks/swr/useUnifiedEntitySearch.ts` — it may call the search endpoint which still handles contacts).

3. Add if missing:
```typescript
// Paginated Contacts
export { useContactsPaginated } from "./useContactsPaginated";
export type { ContactData as PaginatedContactData } from "./useContactsPaginated";
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep "hooks/swr" | head -30
```
Fix all errors before committing.

- [ ] **Step 6: Commit**

```bash
git add hooks/swr/
git commit -m "chore(hooks): remove client SWR hooks, add useContactsPaginated"
```

---

## Task 14: Update `lib/prisma.ts` — Verify Contact in SOFT_DELETE_MODELS

**Files:**
- Modify (verify only): `lib/prisma.ts`

- [ ] **Step 1: Verify Contact is in SOFT_DELETE_MODELS**

Open `lib/prisma.ts`. The `SOFT_DELETE_MODELS` set should contain `"Contact"` (it already does per research). Confirm `"Clients"` is NOT in the set (it wasn't — Clients never had soft-delete support).

No code change needed unless `"Clients"` is present — in which case remove it.

- [ ] **Step 2: Commit (even if no change, document the verification)**

```bash
git add lib/prisma.ts
git commit -m "chore(prisma): verify Contact in SOFT_DELETE_MODELS, confirm Clients removed"
```

---

## Task 15: Full TypeScript Build Check and Remaining Cleanup

- [ ] **Step 1: Run full type check**

```bash
pnpm tsc --noEmit 2>&1 | head -100
```

- [ ] **Step 2: Systematically fix each error**

Common errors you'll encounter:
- `Property 'clients' does not exist on type 'PrismaClient'` → replace `prismadb.clients` with `prismadb.contact`
- `Property 'client_Properties' does not exist` → replace with `prismadb.contactProperty`
- `'encryptClientForOrg' is not exported` → replace with `encryptContactForOrg`
- `'decryptClientForOrg' is not exported` → replace with `decryptContactForOrg`
- `'useClients' is not exported` → remove import or use `useContacts`
- `'ClientData' is not exported` → use `ContactData` from `useContactsPaginated`
- Any component referencing `client.client_name` → use `contact.displayName`
- Any component referencing `client.primary_email` → use `contact.email`
- Any component referencing `client.client_status` → use `contact.status`
- Any component referencing `client.assigned_to` → use `contact.assignedAgentId`

For each TypeScript error file:
1. Read the file
2. Update all `client_*` field references to Contact camelCase equivalents
3. Update `prismadb.clients` to `prismadb.contact`
4. Update import paths

- [ ] **Step 3: Run type check again until clean**

```bash
pnpm tsc --noEmit 2>&1 | wc -l
```
Target: 0 errors.

- [ ] **Step 4: Check for lingering runtime references**

```bash
grep -r "prismadb\.clients\b" app/ lib/ actions/ hooks/ --include="*.ts" --include="*.tsx"
grep -r "encryptClientForOrg\|decryptClientForOrg" app/ lib/ actions/ hooks/ --include="*.ts" --include="*.tsx"
grep -r "client_Properties\b" app/ lib/ actions/ hooks/ --include="*.ts" --include="*.tsx"
grep -r "ClientComment\b" app/ lib/ actions/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "ContactComment"
```
All should return empty.

- [ ] **Step 5: Commit all fixes**

```bash
git add -A
git commit -m "fix(ts): resolve all TypeScript errors from Clients model removal"
```

---

## Task 16: Update `lib/notifications/email-service.ts` — Add CONTACT_CREATED handling

**Files:**
- Modify: `lib/notifications/email-service.ts`

- [ ] **Step 1: Add CONTACT_CREATED email support**

In `lib/notifications/email-service.ts`:

1. Add `CONTACT_CREATED: "crm"` to the notification category mapping (alongside `CLIENT_CREATED: "crm"`)
2. Add a `CONTACT_CREATED` case in the email template switch (copy structure from `CLIENT_CREATED` case but use "contact" wording)
3. Add a `case "CONTACT_CREATED":` handler (copy from `CLIENT_CREATED` case)

Keep the `CLIENT_CREATED` handling for any existing notifications in the database — do not remove it.

- [ ] **Step 2: Commit**

```bash
git add lib/notifications/email-service.ts
git commit -m "feat(email): add CONTACT_CREATED email notification support"
```

---

## Task 17: Smoke Test and Final Verification

- [ ] **Step 1: Build the application**

```bash
pnpm build 2>&1 | tail -40
```
Expected: build completes with no errors. Fix any module-not-found or type errors.

- [ ] **Step 2: Run unit tests**

```bash
pnpm test 2>&1 | tail -40
```
Fix any test failures. Tests involving `prismadb.clients` should be updated or deleted.

- [ ] **Step 3: Manual verification checklist**

With `pnpm dev` running, verify:
- [ ] `/crm/contacts` list page loads without errors
- [ ] Contact detail page loads without errors
- [ ] PropertyDetailPage loads without 500 error (this was the root cause bug)
- [ ] Dashboard recent contacts widget renders
- [ ] Creating a new contact works
- [ ] Activity log on a contact works
- [ ] Calendar event creation with contact attendee works
- [ ] Property-to-contact linking works via the new `/api/crm/contacts/[contactId]/link-properties` endpoint

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after Clients→Contact migration"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Schema: `ContactProperty` M2M added, `watchers` added to Contact, `Clients` and 4 join tables removed
- [x] Migration SQL generated
- [x] `encryptClientForOrg` / `decryptClientForOrg` removed
- [x] `lib/notifications/helpers.ts`: `notifyContactCreated` added, `notifyAccountWatchers` migrated to Contact
- [x] `lib/webhooks.ts`: `dispatchContactWebhook` added, contact events added
- [x] `lib/search/entity-search.ts`: `searchClients` removed
- [x] Dashboard actions: both rewritten for Contact
- [x] Legacy CRM actions deleted
- [x] All internal `/api/crm/clients/` routes deleted
- [x] Property linked route 500 fix applied
- [x] Contact-property linking route created
- [x] v1 API: `/api/v1/crm/clients` routes replaced with `/api/v1/crm/contacts`
- [x] SWR hooks: all client hooks deleted, `useContactsPaginated` created
- [x] `hooks/swr/index.ts` updated
- [x] `lib/prisma.ts` SOFT_DELETE_MODELS verified
- [x] TypeScript build clean
- [x] Email service updated for CONTACT_CREATED

**Placeholders:** None — all code shown is complete.

**Type consistency:**
- `prismadb.contact` used consistently (singular, lowercase — Prisma 6 convention)
- `prismadb.contactProperty` for the M2M join table (matches `@@map("contact_properties")`)
- All field names use camelCase Contact model conventions throughout
