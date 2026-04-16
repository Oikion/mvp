# Import Engine — Contact/Request Entity Upgrade

**Date:** 2026-04-16
**Status:** Approved — ready for implementation planning
**Scope:** Rename all `client`/`mandate` references in the unified import engine, patch 5 security/data-integrity gaps found during the audit, update UI and i18n, and refresh test fixtures.

---

## 1. Background

The Entity Architecture v2.0 migration renamed `Client → Contact` and `Mandate → Request` across the Prisma schema. The unified import engine (`lib/import/`) was not updated during that migration. As a result, the engine still references old Prisma model accessors (`tx.clients`, `tx.mandate`), old entity enum strings (`"client"`, `"mandate"`), old field name prefixes (`client_*`, `mandate_*`), and old i18n keys. The UI still reads `importFields.client` / `importFields.mandate` from the component prop contract.

Additionally, an audit of adjacent code surfaces revealed five security and data-integrity gaps that are in-scope for this work because they touch the same entity terminology or were discovered through the same review pass.

Deal import is **explicitly out of scope** — deferred to a future spec.

---

## 2. Architecture

The import engine has a layered plugin architecture. Each layer must be updated:

```
CSV rows
   ↓
UnifiedFieldDefinitions    ← entity labels, prefix maps, trigger keys
   ↓
ValidationEngine           ← ValidatedRow, ValidationError, entitySummary
   ↓
UnifiedEngine (two-pass)   ← BatchImportResult, Prisma model accessors, friendly ID types
   ↓
UnifiedImportWizard        ← importFields prop, stats display, result strings
   ↓
Server actions / API       ← share, entity search, update-visibility
```

All layers rename in lockstep. No layer is updated in isolation.

---

## 3. Field Definitions (`lib/import/unified-field-definitions.ts`)

### 3.1 Entity union type

`UnifiedFieldDefinition.entity` union:

```typescript
// Before
entity: "client" | "property" | "mandate"

// After
entity: "contact" | "property" | "request"
```

### 3.2 Exported constant renames

| Before | After |
|---|---|
| `CLIENT_KEY_RENAMES` | `CONTACT_KEY_RENAMES` |
| `MANDATE_KEY_RENAMES` | `REQUEST_KEY_RENAMES` |
| `MANDATE_OMIT_KEYS` | `REQUEST_OMIT_KEYS` |
| `MANDATE_FIELD_KEYS` | `REQUEST_FIELD_KEYS` |
| `MANDATE_EXTRA_ALIASES` | `REQUEST_EXTRA_ALIASES` |

### 3.3 PREFIX_STRIP_MAP keys

```typescript
// Before
"mandate_title": "title",
"client_description": "description",

// After
"request_title": "title",
"contact_description": "description",
```

All `mandate_*` prefix entries → `request_*`. All `client_*` prefix entries → `contact_*`.

### 3.4 CLIENT_TRIGGER_KEYS

```typescript
// Before
const CLIENT_TRIGGER_KEYS = ["client_name", ...]

// After
const CLIENT_TRIGGER_KEYS = ["contact_name", ...]
```

---

## 4. Validation Engine (`lib/import/validation-engine.ts`)

### 4.1 ValidatedRow interface

```typescript
// Before
interface ValidatedRow {
  hasClient: boolean;
  hasMandate: boolean;
  clientRow: Record<string, unknown>;
  mandateRow: Record<string, unknown>;
  clientDedupKey: string;
}

// After
interface ValidatedRow {
  hasContact: boolean;
  hasRequest: boolean;
  contactRow: Record<string, unknown>;
  requestRow: Record<string, unknown>;
  contactDedupKey: string;
}
```

### 4.2 ValidationError entity union

```typescript
// Before
entity: "client" | "property" | "mandate"

// After
entity: "contact" | "property" | "request"
```

### 4.3 ValidationResult.entitySummary keys

```typescript
// Before
entitySummary: { clients: number; properties: number; mandates: number }

// After
entitySummary: { contacts: number; properties: number; requests: number }
```

### 4.4 fieldEntityMap type

```typescript
// Before
Map<string, "client" | "property" | "mandate">

// After
Map<string, "contact" | "property" | "request">
```

### 4.5 Internal renames

- `clientDedupKey()` function → `contactDedupKey()`
- Contact detection: `rawClientRow.client_name` → `rawContactRow.contact_name`
- All internal variables: `clientDedupMap` → `contactDedupMap`, etc.
- Schema/normalizer imports: `contactImportSchema`, `normalizeContactEnums`, `requestImportSchema`, `normalizeRequestEnums`

---

## 5. Unified Engine (`lib/import/unified-engine.ts`)

### 5.1 BatchImportResult keys

```typescript
// Before
interface BatchImportResult {
  contacts: string[];     // already renamed? verify
  clients: string[];
  mandates: string[];
  properties: string[];
  linkCounts: {
    clientProperty: number;
    mandateProperty: number;
    mandateClient: number;
  };
}

// After
interface BatchImportResult {
  contacts: string[];
  requests: string[];
  properties: string[];
  linkCounts: {
    contactProperty: number;
    requestProperty: number;
    requestContact: number;
  };
}
```

Delete `UnifiedImportResult` wrapper if it still exists (deprecated).

### 5.2 Prisma model accessors in the transaction block

| Before | After |
|---|---|
| `tx.clients.createMany(...)` | `tx.contact.createMany(...)` |
| `tx.mandate.createMany(...)` | `tx.request.createMany(...)` |
| `tx.client_Properties.createMany(...)` | `tx.contactProperty.createMany(...)` |
| `tx.mandate_Properties.createMany(...)` | `tx.requestProperty.createMany(...)` |
| `tx.mandate_Clients.createMany(...)` | `tx.requestContact.createMany(...)` |

Verify exact model accessor names against current Prisma schema before writing code.

### 5.3 Friendly ID entity type arguments

```typescript
// Before
generateFriendlyIds("Clients", count)
generateFriendlyIds("Mandates", count)

// After
generateFriendlyIds("Contacts", count)
generateFriendlyIds("Requests", count)
```

### 5.4 Internal variable renames

`rowClientUuid` → `rowContactUuid`, `clientDedupMap` → `contactDedupMap`, `clientsToCreate` → `contactsToCreate`, `rowMandateUuid` → `rowRequestUuid`, `mandatesToCreate` → `requestsToCreate`.

### 5.5 Error entity strings

```typescript
// Before
{ entity: "client", ... }
{ entity: "mandate", ... }

// After
{ entity: "contact", ... }
{ entity: "request", ... }
```

---

## 6. Security and Data-Integrity Patches

Five gaps are fixed in the same PR. Each is surgical — minimum diff to close the hole.

### Gap 1 — Social feed: missing `organizationId` on linked-request lookup

**File:** `actions/social-feed/get-social-posts.ts` line ~173

```typescript
// Before (no tenant isolation)
prismadb.mandate.findMany({ where: { id: { in: linkedRequestIds } } })

// After
prismadb.mandate.findMany({ where: { id: { in: linkedRequestIds }, organizationId } })
```

Model name stays `mandate` (Prisma model, not yet renamed) but `organizationId` is added.

### Gap 2 — Share email route: stale `"client"` enum value

**File:** `app/api/share/email/route.ts` lines 7 and 17

```typescript
// Before
z.enum(["property", "client", "post"])

// After
z.enum(["property", "contact", "post"])
```

Both schema definitions (`shareViaEmailSchema` and `shareMultipleSchema`) are updated.

### Gap 3 — Share route: dead `case "CLIENT":` and stale revalidation path

**File:** `app/api/share/route.ts`

```typescript
// Before
case "CLIENT":    // dead — incoming value is "CONTACT"
  ...
revalidatePath("/crm/clients")

// After
case "CONTACT":
  ...
revalidatePath("/crm/contacts")
```

### Gap 4 — Entity search: stale default type list drops contacts

**File:** `app/api/entities/search/route.ts` line ~129

```typescript
// Before (default silently drops contacts — "client" not in VALID_TYPES)
const defaultTypes = "client,property,document,event,mandate"

// After
const defaultTypes = "contact,property,document,event,request,deal"
```

### Gap 5 — Deals soft-delete leak + ignored `includeDeleted` filter

**File:** `actions/deals/index.ts` — `getDeals()` function

```typescript
// Before (no deletedAt guard; includeDeleted parameter declared but never consumed)
const where: Prisma.DealWhereInput = { organizationId };

// After
const where: Prisma.DealWhereInput = { organizationId, deletedAt: null };

if (filters?.includeDeleted === "true") {
  delete (where as any).deletedAt;
}
```

### Gap 6 — `update-mandate.ts`: missing permission guard

**File:** `actions/mandates/update-mandate.ts`

Replace manual `if (!organizationId || !user) throw new Error("Unauthorized")` with:

```typescript
const guard = await requireAction("request:update");
if (guard) return guard;
```

Return type updated to `ActionResponse<Request>`.

### Gap 7 — `update-mandate-visibility.ts`: any VIEWER can change any mandate's visibility

**File:** `actions/mandates/update-mandate-visibility.ts`

Replace raw `auth()` call with:

```typescript
const guard = await requireAction("request:update_visibility");
if (guard) return guard;
const organizationId = await getCurrentOrgId();
```

---

## 7. UI Component (`components/import/UnifiedImportWizard.tsx`)

### 7.1 `importFields` prop type

```typescript
// Before
importFields?: {
  client?: { fields: UnifiedFieldDefinition[]; enums?: ... };
  mandate?: { fields: UnifiedFieldDefinition[]; enums?: ... };
  property?: { ... };
}

// After
importFields?: {
  contact?: { fields: UnifiedFieldDefinition[]; enums?: ... };
  request?: { fields: UnifiedFieldDefinition[]; enums?: ... };
  property?: { ... };
}
```

### 7.2 Internal enum merging

```typescript
// Before
importFields.client?.enums
importFields.mandate?.enums

// After
importFields.contact?.enums
importFields.request?.enums
```

### 7.3 Result display

```typescript
// Before
result.clients.length + result.mandates.length

// After
result.contacts.length + result.requests.length
```

### 7.4 Stats object

All keys in the stats summary object: `clients` → `contacts`, `mandates` → `requests`, `linkCounts.clientProperty` → `linkCounts.contactProperty`, `linkCounts.mandateProperty` → `linkCounts.requestProperty`, `linkCounts.mandateClient` → `linkCounts.requestContact`.

### 7.5 Prop rename

`mandateFieldKeys` prop → `requestFieldKeys`, sourced from `REQUEST_FIELD_KEYS`.

---

## 8. Internationalization

Both locale files (`locales/en/import.json` and `locales/el/import.json`) are updated in lockstep per the dual-registration requirement.

### 8.1 Key renames (both locales)

| Before | After |
|---|---|
| `titleClients` | `titleContacts` |
| `titleMandates` | `titleRequests` |
| `entities.CLIENTS` | `entities.CONTACTS` |
| `entities.MANDATES` | `entities.REQUESTS` |
| `summary.clients` | `summary.contacts` |
| `summary.mandates` | `summary.requests` |
| `clientPropertyLinks` | `contactPropertyLinks` |
| `mandatePropertyLinks` | `requestPropertyLinks` |
| `mandateClientLinks` | `requestContactLinks` |
| Top-level `"client"` block | Top-level `"contact"` block |
| Top-level `"mandate"` block | Top-level `"request"` block |
| Group label prefix `"Client — "` | `"Contact — "` |
| Group label prefix `"Mandate — "` | `"Request — "` |
| Field key `client_name` | `contact_name` |
| All `mandate_*` field keys | `request_*` field keys |

### 8.2 English translations

```json
{
  "titleContacts": "Import Contacts",
  "titleRequests": "Import Requests",
  "entities": {
    "CONTACTS": "Contacts",
    "REQUESTS": "Requests"
  },
  "summary": {
    "contacts": "contacts",
    "requests": "requests"
  }
}
```

### 8.3 Greek translations

```json
{
  "titleContacts": "Εισαγωγή Επαφών",
  "titleRequests": "Εισαγωγή Αιτημάτων",
  "entities": {
    "CONTACTS": "Επαφές",
    "REQUESTS": "Αιτήματα"
  },
  "summary": {
    "contacts": "Επαφές",
    "requests": "Αιτήματα"
  },
  "contactPropertyLinks": "συνδέσεις επαφής-ακινήτου",
  "requestPropertyLinks": "συνδέσεις αιτήματος-ακινήτου",
  "requestContactLinks": "συνδέσεις αιτήματος-επαφής"
}
```

Field label genitive forms: `"Πελάτη"` → `"Επαφής"`, `"Εντολής"` → `"Αιτήματος"`.

No new namespace is created — `import` namespace already exists and is registered. No `i18n.ts` / `layout.tsx` changes needed.

---

## 9. Testing

### 9.1 Existing test files — mechanical renames

**`tests/import/validation-engine.test.ts`:**
- All `hasClient` / `clientRow` / `clientDedupKey` → `hasContact` / `contactRow` / `contactDedupKey`
- All `hasMandate` / `mandateRow` → `hasRequest` / `requestRow`
- `entitySummary.clients` / `.mandates` → `.contacts` / `.requests`
- Test descriptions updated ("detects contact when contact_name is present")

**`tests/import/batch-engine.test.ts`:**
- Mock `tx` object renames: `clients:` → `contacts:`, `mandate:` → `requests:`, `client_Properties:` → `contactProperty:`, `mandate_Properties:` → `requestProperty:`, `mandate_Clients:` → `requestContact:`
- Assertions on `BatchImportResult.clients` / `.mandates` → `.contacts` / `.requests`

**`tests/permissions/import-permissions.test.ts`:** No changes needed.

### 9.2 New tests

All in `tests/import/` unless noted.

| Test | File | What it verifies |
|---|---|---|
| `contactDedupKey()` — phone wins over email wins over name | `validation-engine.test.ts` | Priority order; uses `contact_name` field |
| `ContactCategory` array parsing | `validation-engine.test.ts` | `"BUYER, INVESTOR"` → `["BUYER", "INVESTOR"]`; case normalization |
| `toDecimal()` helper | `batch-engine.test.ts` | Greek space-formatted `"1 500 000"` → `Decimal("1500000")`; `""` → `null` |
| Social feed org boundary | `tests/social-feed/get-social-posts.test.ts` | `prismadb.mandate.findMany` called with `{ where: { id: { in: [...] }, organizationId } }` |

The social feed test is security coverage for Gap 1. It mocks `prismadb.mandate.findMany` and asserts the exact shape of the `where` argument.

---

## 10. Import Config and Schema File Renames

The import config and schema files are still named after the old entities. They must be renamed as part of this work:

| Before | After |
|---|---|
| `lib/import/client-import-config.ts` | `lib/import/contact-import-config.ts` |
| `lib/import/client-import-schema.ts` | `lib/import/contact-import-schema.ts` |
| `lib/import/mandate-import-config.ts` | `lib/import/request-import-config.ts` |
| `lib/import/mandate-import-schema.ts` | `lib/import/request-import-schema.ts` |

Internal exports in each file are renamed to match (`clientImportSchema` → `contactImportSchema`, `normalizeClientEnums` → `normalizeContactEnums`, `mandateImportSchema` → `requestImportSchema`, `normalizeRequestEnums` stays or replaces `normalizeMandateEnums`).

All callers that import from these paths — including `validation-engine.ts`, `unified-engine.ts`, and any wizard entry points — are updated in the same step.

---

## 11. Out of Scope

- **Deal import** — deferred to a separate spec
- **Prisma schema changes** — none required; this is a rename-only migration at the application layer
- **New namespace registration** — `import` namespace already registered in both `i18n.ts` and `layout.tsx`

---

## 12. Implementation Sequence

The layers must be implemented bottom-up to avoid broken intermediate states:

1. Import config/schema file renames (Section 10) — rename files + update internal exports
2. Field definitions (`unified-field-definitions.ts`) — no external dependencies
3. Validation engine (`validation-engine.ts`) — depends on field definitions + config files
4. Unified engine (`unified-engine.ts`) — depends on validation engine
5. Security patches (Gaps 1–7) — independent of engine layers, can be done in parallel with steps 1–4
6. UI component (`UnifiedImportWizard.tsx`) — depends on engine result types
7. i18n files — can be done any time, no code dependencies
8. Test updates — done after each layer is complete

Each layer should build cleanly (`pnpm build` / `npx tsc --noEmit`) before the next layer begins.
