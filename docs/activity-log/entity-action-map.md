# Entity Action Map — Activity Log Implementation
# Generated: 2026-04-25
# Purpose: Comprehensive reference for all mutations across the 4 core entities
#          that must produce Activity log entries.

---

## Schema Changes Required

### New ActivityKind enum values (migration needed):
```
CREATED              # entity was created (manual or import)
UPDATED              # entity fields edited (batch, non-encrypted fields only)
LINKED               # entity linked to another entity
UNLINKED             # entity unlinked from another entity
STAGE_CHANGED        # deal stage changed
CALENDAR_EVENT_ADDED # calendar event linked to entity
CALENDAR_EVENT_REMOVED # calendar event unlinked from entity
```

### New Activity model field (migration needed):
```prisma
metadata  Json?   # structured payload for clickable links + field diffs
```

### Metadata JSON shape per ActivityKind:

**CREATED**
```json
{
  "source": "manual" | "import",
  "importBatchId": "string|null",
  "importFilename": "string|null",
  "targetUrl": "/app/import/{importBatchId}"  // only present for imports
}
```

**UPDATED**
```json
{
  "changedFields": ["status", "price"],
  "changes": [
    { "field": "status", "from": "AVAILABLE", "to": "UNDER_OFFER" },
    { "field": "price", "from": "250000", "to": "240000" }
  ]
}
```

**LINKED / UNLINKED**
```json
{
  "targetType": "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL" | "DOCUMENT" | "CALENDAR_EVENT",
  "targetId": "string",
  "targetLabel": "string",
  "targetUrl": "/app/crm/contacts/{id}" | "/app/mls/properties/{slug}" | ...
}
```

**STAGE_CHANGED**
```json
{
  "fromStage": "INTEREST",
  "toStage": "OFFER",
  "notes": "string|null"
}
```

**CALENDAR_EVENT_ADDED / CALENDAR_EVENT_REMOVED**
```json
{
  "eventId": "string",
  "eventTitle": "string",
  "eventType": "CalendarEventType",
  "startTime": "ISO8601",
  "targetUrl": "/app/calendar/events/{id}"
}
```

---

## URL Patterns per Entity (for targetUrl in metadata)

| Entity         | Detail URL Pattern                        | Note                   |
|----------------|-------------------------------------------|------------------------|
| Contact        | `/app/crm/contacts/{contactId}`           | uses ID                |
| Property       | `/app/mls/properties/{slug}`              | uses SLUG not ID       |
| Request        | `/app/requests/{requestId}`               | uses ID                |
| Deal           | `/app/deals/{dealId}`                     | uses ID                |
| Calendar Event | `/app/calendar/events/{eventId}`          | uses ID                |
| Import Job     | `/app/import/{importBatchId}`             | uses import batch ID   |
| Document       | `/app/documents/{slug}`                   | uses slug              |

---

## Encrypted Fields (EXCLUDE from UPDATED tracking)

### Contact (from lib/model-encryption.ts → CONTACT_ENCRYPTED_STRING_FIELDS)
firstName, lastName, displayName, companyName, email, secondaryEmail, primaryPhone,
secondaryPhone, officePhone, whatsapp, viber, taxId, doy, vatNumber, companyGemi
+ JSON fields: communicationNotes

### Property (from lib/model-encryption.ts → encryptPropertyForOrg)
primary_email, communication_notes (JSON)

### Request (from lib/model-encryption.ts → REQUEST_ENCRYPTED_STRING_FIELDS)
title, notes, locationDisplayName
+ JSON fields: communicationNotes, areasOfInterest

### Deal
No encrypted fields documented.

---

## Entity: CONTACT

### Mutations that must log activities

| Action              | Location                                                          | ActivityKind        | Both sides? |
|---------------------|-------------------------------------------------------------------|---------------------|-------------|
| Create (manual)     | `app/api/crm/contacts/route.ts` POST                             | CREATED             | N/A         |
| Create (import)     | `lib/import/unified-engine.ts` — contact import path             | CREATED             | N/A         |
| Update              | `app/api/crm/contacts/[contactId]/route.ts` PATCH/PUT            | UPDATED             | N/A         |
| Delete (soft)       | `app/api/crm/contacts/[contactId]/route.ts` DELETE               | (no log — deletion) | N/A         |
| Link to Property    | `app/api/crm/contacts/[contactId]/link-properties/route.ts` POST | LINKED              | YES (Contact + Property) |
| Link to Property (legacy) | `app/api/crm/clients/link-properties/route.ts`             | LINKED              | YES |
| Link entities       | `app/api/crm/contacts/[contactId]/link-entities/route.ts` POST   | LINKED              | YES |
| Unlink              | Same routes, DELETE method                                        | UNLINKED            | YES |
| Calendar event added| When CalendarEventContact row created (event creation/update)     | CALENDAR_EVENT_ADDED | N/A |
| Calendar event removed | When CalendarEventContact row deleted                          | CALENDAR_EVENT_REMOVED | N/A |
| Added to Deal       | `actions/deals/index.ts` → addDealParty()                        | LINKED (to deal)    | YES (Contact + Deal) |
| Removed from Deal   | `actions/deals/index.ts` → removeDealParty()                     | UNLINKED (from deal) | YES |
| Added to Request    | `app/api/requests/link-entities/route.ts` or `[requestId]/link-entities` | LINKED     | YES (Contact + Request) |

### Safelist for UPDATED tracking (non-encrypted Contact fields)
status, contactType, clientType, source, leadScore, visibilityState, assignedToUserId, tags

### Primary key type: UUID (not CUID)
### Detail URL: `/app/crm/contacts/{id}`

---

## Entity: PROPERTY

### Mutations that must log activities

| Action              | Location                                                          | ActivityKind        | Both sides? |
|---------------------|-------------------------------------------------------------------|---------------------|-------------|
| Create (manual)     | `app/api/mls/properties/route.ts` POST                           | CREATED             | N/A         |
| Create (draft)      | `app/api/mls/properties/draft/route.ts` POST                     | CREATED             | N/A         |
| Create (import)     | `lib/import/unified-engine.ts` — property import path            | CREATED             | N/A         |
| Update              | `app/api/mls/properties/[propertyId]/route.ts` PATCH/PUT         | UPDATED             | N/A         |
| Delete (soft)       | Same route, DELETE                                                | (no log)            | N/A         |
| Link to Contact     | `app/api/crm/contacts/[contactId]/link-properties/route.ts`      | LINKED              | YES (Property + Contact) |
| Unlink from Contact | Same route, DELETE                                                | UNLINKED            | YES |
| Link entities       | (property-side link endpoint if exists)                          | LINKED              | YES |
| Calendar event added| When EventToProperties M2M row created                           | CALENDAR_EVENT_ADDED | N/A |
| Calendar event removed | When EventToProperties M2M row deleted                        | CALENDAR_EVENT_REMOVED | N/A |
| Showing scheduled   | `(showing creation endpoint)` — PropertyShowing created          | OTHER (body: "Showing scheduled for {date}") | N/A |

### Safelist for UPDATED tracking (non-encrypted Property fields)
status, propertyType, subType, condition, energyClass, bedrooms, bathrooms, floor,
totalFloors, sqmLiving, sqmTotal, price, listPrice, yearBuilt, parking, storageRoom,
visibilityState, assignedToUserId, area, region

### Primary key type: CUID; URL uses SLUG field
### Detail URL: `/app/mls/properties/{slug}`

---

## Entity: REQUEST

### Mutations that must log activities

| Action              | Location                                                          | ActivityKind        | Both sides? |
|---------------------|-------------------------------------------------------------------|---------------------|-------------|
| Create (manual)     | `app/api/requests/route.ts` POST                                 | CREATED             | N/A         |
| Create (draft)      | `app/api/requests/draft/route.ts` POST                           | CREATED             | N/A         |
| Create (import)     | `lib/import/unified-engine.ts` — request import path             | CREATED             | N/A         |
| Update              | `app/api/requests/[requestId]/route.ts` PATCH/PUT                | UPDATED             | N/A         |
| Link Contact        | `app/api/requests/link-entities/route.ts` POST                   | LINKED              | YES (Request + Contact) |
| Link Contact (v2)   | `app/api/requests/[requestId]/link-entities/route.ts` POST       | LINKED              | YES |
| Unlink              | Same routes, DELETE                                               | UNLINKED            | YES |
| Calendar event added| When EventToRequests M2M row created                             | CALENDAR_EVENT_ADDED | N/A |
| Calendar event removed | When EventToRequests M2M row deleted                          | CALENDAR_EVENT_REMOVED | N/A |

### Safelist for UPDATED tracking (non-encrypted Request fields)
status, purpose, propertyTypes, areas, budgetMin, budgetMax, timeline, assignedToUserId, visibilityState

### Primary key type: CUID
### Detail URL: `/app/requests/{requestId}`

---

## Entity: DEAL

### Mutations that must log activities

| Action              | Location                                                          | ActivityKind        | Both sides? |
|---------------------|-------------------------------------------------------------------|---------------------|-------------|
| Create (manual)     | `actions/deals/index.ts` → createDeal()                         | CREATED             | N/A         |
| Update              | `actions/deals/index.ts` → updateDeal()                         | UPDATED             | N/A         |
| Advance stage       | `actions/deals/index.ts` → advanceDealStage()                   | STAGE_CHANGED       | N/A         |
| Set stage           | `actions/deals/index.ts` → setDealStage()                       | STAGE_CHANGED       | N/A         |
| Add party (Contact) | `actions/deals/index.ts` → addDealParty()                       | LINKED              | YES (Deal + Contact) |
| Remove party        | `actions/deals/index.ts` → removeDealParty()                    | UNLINKED            | YES |
| Showing linked      | PropertyShowing.dealId set                                       | OTHER (body: "Showing added to deal") | N/A |
| Delete              | `actions/deals/index.ts` → deleteDeal()                         | (no log)            | N/A         |

### Safelist for UPDATED tracking (non-encrypted Deal fields)
stage, dealValue, expectedCloseDate, assignedToUserId, propertyId, requestId

### Primary key type: CUID
### Detail URL: `/app/deals/{dealId}`

---

## Ably Real-Time Channel

For every system-generated activity, after DB write, push to:
- Channel: `org:{organizationId}`
- Event name: `activity:created`
- Payload: `{ parentType, parentId, activityId, kind }`

The client's EntityActivityPanel subscribes to this channel and
revalidates the SWR cache key when it receives a matching parentType+parentId event.

---

## Central Service: lib/activity-logger.ts (to be created)

```typescript
// Functions to be implemented:
logEntityCreated(params: { organizationId, parentType, parentId, createdByUserId, source, importBatchId?, importFilename? }): Promise<void>
logEntityUpdated(params: { organizationId, parentType, parentId, createdByUserId, changes: FieldChange[] }): Promise<void>
logEntityLinked(params: { organizationId, fromType, fromId, toType, toId, toLabel, toUrl, createdByUserId }): Promise<void>
logEntityUnlinked(params: { organizationId, fromType, fromId, toType, toId, toLabel, toUrl, createdByUserId }): Promise<void>
logStageChanged(params: { organizationId, dealId, fromStage, toStage, notes?, changedByUserId }): Promise<void>
logCalendarEventAdded(params: { organizationId, parentType, parentId, eventId, eventTitle, eventType, startTime, actorUserId }): Promise<void>
logCalendarEventRemoved(params: { organizationId, parentType, parentId, eventId, eventTitle, actorUserId }): Promise<void>

// Internal helper:
_createAndPublish(data: ActivityCreateInput): Promise<void>  // DB write + Ably publish
```

---

## Import System: lib/import/unified-engine.ts

When an entity is created via import:
- Fire ONE logEntityCreated() call per entity
- source: "import"
- importFilename: the original uploaded filename
- importBatchId: the import history record ID
- targetUrl in metadata: `/app/import/{importBatchId}`
- NO other activity events (no UPDATED, no LINKED) from import

---

## Localization Keys Needed (en + el)

```
activity.system.created         = "Created"
activity.system.updated         = "Updated {fields}"
activity.system.linked_to       = "Linked to {targetLabel}"
activity.system.unlinked_from   = "Unlinked from {targetLabel}"
activity.system.stage_changed   = "Stage changed from {from} to {to}"
activity.system.calendar_added  = "Added to event: {eventTitle}"
activity.system.calendar_removed = "Removed from event: {eventTitle}"
activity.system.created_via_import = "Created via import: {filename}"
activity.system.showing_scheduled = "Showing scheduled for {date}"
```

---

## Notes for Analysis Agents

1. There may be ADDITIONAL mutation endpoints not captured here (legacy `/api/crm/clients/` routes, 
   admin endpoints, bulk operations). Agents must grep thoroughly.
2. CalendarEvent creation/update routes may link entities in the same request — 
   must identify the exact handler that persists EventContacts/EventAgents/EventToProperties.
3. The `link-entities` routes may handle multiple entity types — must read the actual route handler.
4. Property has both a main route and a draft route — both create Properties.
5. Request has both a main route and a draft route — verify if draft creates a published record.
6. Deal mutations are entirely in server actions (actions/deals/index.ts), not API routes.
