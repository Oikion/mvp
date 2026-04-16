# Entity Activity & Change Log — Design Spec

**Date:** 2026-04-11  
**Status:** Approved  
**Scope:** Contact, Property, Request (Mandate) — Deal and Showing excluded from this phase

---

## 1. Problem Statement

The Activity tab on entity detail views currently shows only manually logged entries (calls, notes, meetings). There is no automatic recording of system events: when an entity was created, which fields changed, or when entities were linked/unlinked. Users have no audit trail for these events.

---

## 2. Goals

- Automatically record creation, field-level changes, and link/unlink events for Contact, Property, and Request entities
- Surface these events in the existing Activity tab feed, visually distinct from manual activity entries
- Add Activity tabs to Property and Request detail views (Contact already has one)
- Never expose PII or encrypted field content in change log records

---

## 3. Out of Scope

- Deal entity (has its own `DealStageLog` — will be unified separately)
- Showing entity (no dedicated page in current navigation)
- Manual editing/deletion of change log entries (system-generated only)
- Cursor-based pagination (feed uses simple `orderBy: occurredAt desc` for now)

---

## 4. Data Model

### 4.1 New Prisma model: `EntityChangeLog`

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

  Actor          Users? @relation("EntityChangeLogActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([organizationId, entityType, entityId])
  @@index([organizationId, entityType, entityId, occurredAt])
  @@map("entity_change_logs")
}

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

### 4.2 Field semantics

| Field | Type | Notes |
|-------|------|-------|
| `entityType` | enum | Which entity this log belongs to |
| `entityId` | String | The entity's `id` (cuid) |
| `eventType` | enum | `CREATED`, `UPDATED`, `LINKED`, `UNLINKED` |
| `actorUserId` | String? | Null = system/import event. `onDelete: SetNull` — logs survive user departure |
| `changedFields` | Json? | Array of `{ field: string, from: unknown, to: unknown }`. Only populated for `UPDATED` events |
| `linkTarget` | Json? | `{ type: string, id: string, friendlyId?: string, label?: string }`. Only for `LINKED`/`UNLINKED` |

### 4.3 Encrypted field policy

Watched fields that are encrypted server-side (e.g., `primaryEmail`, `primaryPhone` on Contact) are **never diffed for content**. If the field appears in `changedFields`, `from` and `to` are stored as the string `"[encrypted]"`. This indicates the field changed without exposing the value.

Fields in `CLIENT_ENCRYPTED_STRING_FIELDS` and `PROPERTY_ENCRYPTED_STRING_FIELDS` from `lib/model-encryption.ts` serve as the reference list.

---

## 5. Write Path

### 5.1 New file: `lib/entity-change-log.ts`

Exports two functions — both server-side only, never imported by client components.

#### `diffEntity`

```typescript
function diffEntity(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  watchedFields: string[],
  encryptedFields: string[]
): Array<{ field: string; from: unknown; to: unknown }>
```

- Iterates `watchedFields` only — ignores all other keys
- Compares values with strict equality (`===`); treats `null` and `undefined` as equivalent (both map to `null`)
- If field is in `encryptedFields` and value differs, records `{ field, from: "[encrypted]", to: "[encrypted]" }`
- Returns only fields that actually changed (non-empty diff)

#### `createChangeLogEntry`

```typescript
async function createChangeLogEntry(input: {
  organizationId: string;
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL";
  entityId: string;
  eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
  actorUserId?: string;
  changedFields?: Array<{ field: string; from: unknown; to: unknown }>;
  linkTarget?: { type: string; id: string; friendlyId?: string; label?: string };
}): Promise<void>
```

- Non-fatal: errors are caught and logged via `console.error("[ENTITY_CHANGE_LOG]", error)` — never rethrown
- Called after the primary database operation succeeds
- For `UPDATED` events where `changedFields` is empty (no watched fields changed), the entry is still written — it records "something changed" without field detail

### 5.2 Watched fields per entity

Declared as constants in `lib/entity-change-log.ts`:

```typescript
const CONTACT_WATCHED_FIELDS = [
  "status", "assignedToUserId", "visibility", "category",
  "source", "doNotContact", "allowMarketing", "gdprConsentGiven",
];

const PROPERTY_WATCHED_FIELDS = [
  "property_status", "assignedToUserId", "visibility", "price", "property_type",
];

const REQUEST_WATCHED_FIELDS = [
  "status", "urgency", "assignedToUserId", "budgetMin", "budgetMax", "requestType",
];
```

All other field changes (name, phone, address) generate an `UPDATED` entry with `changedFields: []` — "Details updated".

### 5.3 Call sites

**Contact:**
| Route / Action | Event | Notes |
|----------------|-------|-------|
| `app/api/crm/contacts/route.ts` POST | `CREATED` | After successful `prismadb.contact.create` |
| `app/api/crm/contacts/[contactId]/route.ts` PUT | `UPDATED` | Fetch contact before update, diff, write after |
| Contact–Request link/unlink API routes | `LINKED` / `UNLINKED` | `linkTarget.type = "REQUEST"` |
| Contact–Property link/unlink API routes | `LINKED` / `UNLINKED` | `linkTarget.type = "PROPERTY"` |

**Property:**
| Route / Action | Event | Notes |
|----------------|-------|-------|
| `app/api/mls/properties/route.ts` POST | `CREATED` | After successful create |
| `app/api/mls/properties/[slug]/route.ts` PUT | `UPDATED` | Fetch before, diff, write after |
| Property–Contact link/unlink | `LINKED` / `UNLINKED` | `linkTarget.type = "CONTACT"` |

**Request (Mandate):**
| Route / Action | Event | Notes |
|----------------|-------|-------|
| Request creation action | `CREATED` | After successful create |
| `actions/mandates/update-mandate.ts` | `UPDATED` | Fetch before, diff, write after |
| Request–Contact link/unlink | `LINKED` / `UNLINKED` | `linkTarget.type = "CONTACT"` |

---

## 6. Read Path

### 6.1 New server action: `listEntityChangeLogs`

Added to `actions/activities/index.ts`:

```typescript
export async function listEntityChangeLogs(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  entityId: string
): Promise<ActionResponse<unknown>>
```

- Permission guard: `requireAction("activity:read")` — reuses existing permission
- Verifies parent entity belongs to org (IDOR protection, same pattern as `listActivities`)
- Includes `Actor` (firstName, lastName, avatar)
- Returns records ordered by `occurredAt` descending

### 6.2 Updated server action: `listUnifiedFeed`

New export in `actions/activities/index.ts`:

```typescript
export async function listUnifiedFeed(
  parentType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  parentId: string
): Promise<ActionResponse<unknown>>
```

- Calls `listActivities` and `listEntityChangeLogs` in parallel via `Promise.all`
- Tags each activity item with `_source: "activity"` and each changelog item with `_source: "changelog"`
- Merges arrays, sorts by `occurredAt` descending
- Returns unified serialized array

### 6.3 API route

`app/api/activities/route.ts` gains support for a `unified=true` query param. When present, calls `listUnifiedFeed` instead of `listActivities`.

### 6.4 SWR hook: `useActivities`

Updated to accept `unified?: boolean` prop. When `true`, appends `&unified=true` to the fetch URL. Existing callers are unaffected (default `false`).

---

## 7. UI

### 7.1 `ActivityFeed` — two rendering paths

The feed discriminates on `_source`:

**`"activity"` entries** — existing rendering, unchanged.

**`"changelog"` entries** — new lighter treatment:
- No border card — inline row with minimal padding (`py-1.5`)
- Icon (16px, `text-muted-foreground`):
  - `CREATED` → `Plus`
  - `UPDATED` → `GitCommitHorizontal`
  - `LINKED` → `Link`
  - `UNLINKED` → `Unlink`
- Sentence constructed from `eventType` + `changedFields` / `linkTarget` (see i18n keys below)
- Actor name + relative timestamp, same as activity entries
- `LINKED` / `UNLINKED` link target renders as a clickable chip navigating to the target entity

### 7.2 Sentence construction rules

| Event | `changedFields` | Rendered sentence |
|-------|----------------|-------------------|
| `CREATED` | — | "Created by [Actor]" |
| `UPDATED` | non-empty | "[Field] changed [from] → [to] · [Field2] changed …" (each changed field as a separate segment) |
| `UPDATED` | empty | "Details updated by [Actor]" |
| `LINKED` | — | "Linked to [targetType] [label/friendlyId]" |
| `UNLINKED` | — | "Unlinked from [targetType] [label/friendlyId]" |

Field names are translated via `activities.watchedFields.{fieldName}` keys. Enum values (e.g., `LEAD`, `ACTIVE`) are translated via the entity's existing translation namespace (e.g., `crm.contacts.status.LEAD`).

### 7.3 Activity tabs on Property and Request

**`PropertyView.tsx`** — add "Activity" tab alongside existing tabs:
```tsx
<TabsTrigger value="activity">{t("activity")}</TabsTrigger>
// TabsContent:
<QuickLogActivity parentType="PROPERTY" parentId={property.id} onSuccess={() => {}} />
<ActivityFeed parentType="PROPERTY" parentId={property.id} unified />
```

**`MandateView.tsx`** — same pattern with `parentType="REQUEST"`.

Contact already has this tab — update it to pass `unified` prop to `ActivityFeed`.

### 7.4 Contact activity tab update

Pass `unified` to the existing feed:
```tsx
<ActivityFeed parentType="CONTACT" parentId={contact.id} unified />
```

---

## 8. i18n

Keys added to `locales/en/activities.json` and `locales/el/activities.json` under existing structure:

```json
{
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
}
```

No new namespace is needed — keys are added to the existing `activities` namespace registered in both `i18n.ts` and `layout.tsx`.

---

## 9. Migration

A new Prisma migration is required for `EntityChangeLog` and the two new enums. The migration file is created with:

```bash
pnpm db:migrate --name entity_change_log
```

The migration adds:
- `EntityChangeLogType` enum
- `EntityChangeEventType` enum  
- `entity_change_logs` table with all indexes
- Relation back-reference on the `Users` model

No existing tables are modified. The migration is safe to apply with zero downtime.

---

## 10. Implementation Order

1. Prisma schema changes + migration
2. `lib/entity-change-log.ts` (`diffEntity` + `createChangeLogEntry`)
3. `actions/activities/index.ts` — add `listEntityChangeLogs` + `listUnifiedFeed`
4. `app/api/activities/route.ts` — `unified` query param support
5. `hooks/swr/useActivities.ts` — `unified` prop
6. `components/activity/ActivityFeed.tsx` — changelog rendering path
7. Call site wiring — Contact API routes
8. Call site wiring — Property API routes
9. Call site wiring — Request actions
10. Activity tab additions — `PropertyView.tsx` + `MandateView.tsx`
11. i18n key additions — both locales
12. Update Contact activity tab to pass `unified`

---

## 11. Security Checklist

- [ ] `createChangeLogEntry` never called from client code — server-side only
- [ ] Encrypted fields stored as `"[encrypted]"` — no PII in `changedFields`
- [ ] `listEntityChangeLogs` verifies parent entity belongs to org before reading
- [ ] `actorUserId` always sourced from server auth context, never from client input
- [ ] `organizationId` always sourced from `getCurrentOrgId()`, never from client input
- [ ] `onDelete: SetNull` on `actorUserId` — logs survive user departure
