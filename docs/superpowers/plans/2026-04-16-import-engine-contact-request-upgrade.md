# Import Engine — Contact/Request Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all `client`/`mandate` references in the unified import engine to `contact`/`request`, fix five broken Prisma accessors, rewrite both `toPrismaData()` functions for the new camelCase schema, patch seven security/data-integrity gaps, and update UI, i18n, and tests.

**Architecture:** Bottom-up layered approach — schema/config files first, then field definitions, then validation engine, then unified engine. Security patches are independent and can run in parallel with any engine layer. UI and i18n update last.

**Tech Stack:** TypeScript, Prisma (models: `contact`, `request`, `contactProperty`, `requestContact`), Vitest, next-intl (el/en dual registration)

---

## File Map

**Rename (old → new):**
- `lib/import/client-import-schema.ts` → `lib/import/contact-import-schema.ts`
- `lib/import/client-import-config.ts` → `lib/import/contact-import-config.ts`
- `lib/import/mandate-import-schema.ts` → `lib/import/request-import-schema.ts`
- `lib/import/mandate-import-config.ts` → `lib/import/request-import-config.ts`

**Modify:**
- `lib/import/enum-normalizer.ts` — add `normalizeContactEnums`, `normalizeRequestEnums` exports
- `lib/import/unified-field-definitions.ts` — entity union, PREFIX_STRIP_MAP, constant renames
- `lib/import/validation-engine.ts` — ValidatedRow, ValidationError, entitySummary, partitionRow, contactDedupKey
- `lib/import/unified-engine.ts` — BatchImportResult, transaction block, variable renames
- `components/import/UnifiedImportWizard.tsx` — importFields prop, stats display
- `locales/en/import.json` — key renames
- `locales/el/import.json` — key renames
- `actions/social-feed/get-social-posts.ts` — Gap 1
- `app/api/share/email/route.ts` — Gap 2
- `app/api/share/route.ts` — Gap 3
- `app/api/entities/search/route.ts` — Gap 4
- `actions/deals/index.ts` — Gap 5
- `actions/mandates/update-mandate.ts` — Gap 6
- `actions/mandates/update-mandate-visibility.ts` — Gap 7
- `tests/import/validation-engine.test.ts` — mechanical renames + new tests
- `tests/import/batch-engine.test.ts` — mock tx renames + result assertions

---

## Task 1: Rename contact-import-schema.ts + update exports and enums

**Files:**
- Rename: `lib/import/client-import-schema.ts` → `lib/import/contact-import-schema.ts`

> **Why this step matters:** The old `clientImportSchema` uses `client_name` as the required field and references stale enum values (`BUYER/SELLER/RENTER` for `ClientTypeEnum`, `LEAD/ACTIVE/INACTIVE/CONVERTED/LOST` for `ClientStatusEnum`). The new Contact model uses `ContactCategory[]` (same BUYER/SELLER/RENTER/INVESTOR/REFERRAL_PARTNER values but it's now an array) and `ContactStatus` (LEAD/ACTIVE/INACTIVE/CONVERTED/LOST — same values, keep them). The only CSV key that must change is `client_name` → `contact_name`.

- [ ] **Step 1: Rename the file**

```bash
mv lib/import/client-import-schema.ts lib/import/contact-import-schema.ts
```

- [ ] **Step 2: Update the file contents**

Open `lib/import/contact-import-schema.ts` and make these changes:

1. Rename export `clientImportSchema` → `contactImportSchema`
2. Rename export `ClientImportData` → `ContactImportData`
3. Rename export `clientImportFieldDefinitions` → `contactImportFieldDefinitions`
4. Rename export `ClientImportFieldKey` → `ContactImportFieldKey`
5. Rename the required CSV field key `client_name` → `contact_name` everywhere in the file (the `z.coerce.string().min(1, ...)` field, the field definition entry)
6. Rename `ClientTypeEnum` → `ContactCategoryEnum` (values stay identical: `BUYER/SELLER/RENTER/INVESTOR/REFERRAL_PARTNER`)
7. Rename `ClientStatusEnum` → `ContactStatusEnum` (values stay identical: `LEAD/ACTIVE/INACTIVE/CONVERTED/LOST`)

The group label for client fields (e.g., `"Client — Contact"`, `"Client — Billing"`) → change prefix to `"Contact — Contact"`, `"Contact — Billing"`, etc.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "contact-import-schema\|client-import-schema" | head -20
```

Expected: no errors referencing these files. (Other files importing old paths will fail — that's expected until later tasks fix them.)

- [ ] **Step 4: Commit**

```bash
git add lib/import/contact-import-schema.ts
git commit -m "refactor(import): rename client-import-schema → contact-import-schema"
```

---

## Task 2: Rename request-import-schema.ts + update exports and enums

**Files:**
- Rename: `lib/import/mandate-import-schema.ts` → `lib/import/request-import-schema.ts`

> **Why this step matters:** The old schema has `title` as a required field, but `title String?` is nullable on the new Request model — the engine auto-generates titles. The old `MandateStatusEnum` uses `DRAFT/ACTIVE/PAUSED/FULFILLED/EXPIRED/CANCELLED` but `RequestStatus` uses `ACTIVE/MATCHED/UNDER_OFFER/CLOSED/PAUSED`. These must match what `normalizeMandateEnums` (soon `normalizeRequestEnums`) will accept.

- [ ] **Step 1: Rename the file**

```bash
mv lib/import/mandate-import-schema.ts lib/import/request-import-schema.ts
```

- [ ] **Step 2: Update the file contents**

Open `lib/import/request-import-schema.ts` and make these changes:

1. Rename export `mandateImportSchema` → `requestImportSchema`
2. Rename export `MandateImportData` → `RequestImportData`
3. Rename export `mandateImportFieldDefinitions` → `requestImportFieldDefinitions`
4. Rename export `MandateImportFieldKey` → `RequestImportFieldKey`
5. Rename `MandateStatusEnum` → `RequestStatusEnum`, update values:
   ```typescript
   // Before
   const MandateStatusEnum = z.enum(["DRAFT", "ACTIVE", "PAUSED", "FULFILLED", "EXPIRED", "CANCELLED"]);
   // After
   const RequestStatusEnum = z.enum(["ACTIVE", "MATCHED", "UNDER_OFFER", "CLOSED", "PAUSED"]);
   ```
6. Make `title` optional (it's `String?` on Request):
   ```typescript
   // Before
   title: z.coerce.string().min(1, "Title is required"),
   // After
   title: z.coerce.string().optional(),
   ```
7. Update group label prefixes: `"Mandate — Budget"` → `"Request — Budget"`, `"Mandate — "` → `"Request — "` throughout

- [ ] **Step 3: Verify TypeScript compiles (same expectation as Task 1)**

```bash
npx tsc --noEmit 2>&1 | grep "request-import-schema\|mandate-import-schema" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add lib/import/request-import-schema.ts
git commit -m "refactor(import): rename mandate-import-schema → request-import-schema, relax title, update status enum"
```

---

## Task 3: Rename contact-import-config.ts + full toPrismaData() rewrite

**Files:**
- Rename: `lib/import/client-import-config.ts` → `lib/import/contact-import-config.ts`

> **Why this step matters:** This is the most invasive change. The old `prismaModel: "clients"` is already broken at runtime (the `Clients` Prisma model was deleted). The new Contact model uses camelCase fields (`displayName`, `primaryPhone`, `email`, etc.) while CSV fields stay snake_case. The `toPrismaData()` function is the translation layer and needs a complete rewrite. Three CSV fields (`fax`, `website`, `member_of`) have no equivalent on Contact and must be silently dropped. Billing/shipping address fields must be assembled into an `addresses: Json[]` array.

- [ ] **Step 1: Rename the file**

```bash
mv lib/import/client-import-config.ts lib/import/contact-import-config.ts
```

- [ ] **Step 2: Update import paths inside the file**

```typescript
// Before
import { clientImportSchema, type ClientImportData } from "./client-import-schema";
import { normalizeClientEnums } from "./enum-normalizer";
// After
import { contactImportSchema, type ContactImportData } from "./contact-import-schema";
import { normalizeContactEnums } from "./enum-normalizer";
```

- [ ] **Step 3: Update config metadata**

```typescript
// Before
export const clientImportConfig: ImportEntityConfig<ClientImportData> = {
  prismaModel: "clients",
  entityIdType: "Clients",
  importSchema: clientImportSchema,
  normalizeEnums: normalizeClientEnums,
// After
export const contactImportConfig: ImportEntityConfig<ContactImportData> = {
  prismaModel: "contact",
  entityIdType: "Contacts",
  importSchema: contactImportSchema,
  normalizeEnums: normalizeContactEnums,
```

- [ ] **Step 4: Update ENCRYPTED_STRING_FIELDS**

```typescript
// Before
const ENCRYPTED_STRING_FIELDS = [
  "client_name", "company_name", "company_id", "primary_email", "secondary_email",
  "primary_phone", "secondary_phone", "office_phone", "fax", "afm", "vat", "doy",
  "id_doc", "company_gemi", "description",
  "billing_street", "billing_city", "billing_postal_code", "billing_country",
  "shipping_street", "shipping_city", "shipping_postal_code", "shipping_country",
] as const;

// After
const ENCRYPTED_STRING_FIELDS = [
  "contact_name", "company_name", "company_id", "primary_email", "secondary_email",
  "primary_phone", "secondary_phone", "office_phone", "afm", "vat", "doy",
  "id_doc", "company_gemi", "description",
  "billing_street", "billing_city", "billing_postal_code", "billing_country",
  "shipping_street", "shipping_city", "shipping_postal_code", "shipping_country",
] as const;
// Note: "fax" is removed (no fax field on Contact model)
```

- [ ] **Step 5: Rewrite toPrismaData() completely**

Replace the entire `toPrismaData` function with:

```typescript
toPrismaData(
  item: ContactImportData,
  encrypted: Record<string, string | null>,
  friendlyId: string,
  userId: string,
  orgId: string,
): Record<string, unknown> {
  const e = (key: string) => encrypted[key] ?? null;

  // Build addresses Json array from billing/shipping fields
  const addresses: Array<Record<string, string | null>> = [];
  if (e("billing_street") || item.billing_city) {
    addresses.push({
      type: "billing",
      street: e("billing_street"),
      city: e("billing_city"),
      postalCode: e("billing_postal_code"),
      country: e("billing_country"),
    });
  }
  if (e("shipping_street") || item.shipping_city) {
    addresses.push({
      type: "shipping",
      street: e("shipping_street"),
      city: e("shipping_city"),
      postalCode: e("shipping_postal_code"),
      country: e("shipping_country"),
    });
  }

  return {
    friendlyId,
    organizationId: orgId,
    createdBy: userId,
    updatedBy: userId,

    // Identity
    displayName: e("contact_name") ?? item.contact_name ?? "",
    firstName: item.first_name ?? null,
    lastName: item.last_name ?? null,
    isCompany: item.person_type === "COMPANY",
    companyName: e("company_name"),
    companyId: e("company_id"),

    // Contact info
    email: e("primary_email"),
    secondaryEmail: e("secondary_email"),
    primaryPhone: e("primary_phone"),
    secondaryPhone: e("secondary_phone"),
    officePhone: e("office_phone"),

    // Tax / legal
    taxId: e("afm"),
    vatNumber: e("vat"),
    doy: e("doy"),
    idDocument: e("id_doc"),
    companyGemi: e("company_gemi"),

    // Classification
    // client_type was a single value; ContactCategory is an array
    category: item.client_type ? [item.client_type] : [],
    status: item.client_status ?? "LEAD",
    source: item.lead_source ?? null,

    // Address Json
    addresses: addresses.length > 0 ? addresses : null,

    // Notes / consent
    notes: e("description"),
    gdprConsentGiven: item.gdpr_consent ?? false,
    allowMarketing: item.allow_marketing ?? false,

    // Visibility
    visibility: item.client_visibility ?? "PRIVATE",

    // Dropped fields (no equivalent on Contact model):
    // fax, website, member_of → silently omitted
  };
},
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "contact-import-config\|client-import-config" | head -20
```

- [ ] **Step 7: Commit**

```bash
git add lib/import/contact-import-config.ts
git commit -m "refactor(import): rename client-import-config → contact-import-config, rewrite toPrismaData for Contact model"
```

---

## Task 4: Rename request-import-config.ts + full toPrismaData() rewrite

**Files:**
- Rename: `lib/import/mandate-import-config.ts` → `lib/import/request-import-config.ts`

> **Why this step matters:** The old config uses `prismaModel: "mandate"` (still valid as a Prisma model, but belongs to the old entity name). The new Request model uses camelCase fields and has several renamed fields (`size_min_sqm` → `surfaceMin`, `year_built_min` → `constructionYearMin`, etc.). Crucially, `requestType` is REQUIRED on the Request model with no default — the config must default it to `"BUY"` if the CSV omits it.

- [ ] **Step 1: Rename the file**

```bash
mv lib/import/mandate-import-config.ts lib/import/request-import-config.ts
```

- [ ] **Step 2: Update import paths inside the file**

```typescript
// Before
import { mandateImportSchema, type MandateImportData } from "./mandate-import-schema";
import { normalizeMandateEnums } from "./enum-normalizer";
// After
import { requestImportSchema, type RequestImportData } from "./request-import-schema";
import { normalizeRequestEnums } from "./enum-normalizer";
```

- [ ] **Step 3: Update config metadata**

```typescript
// Before
export const mandateImportConfig: ImportEntityConfig<MandateImportData> = {
  prismaModel: "mandate",
  entityIdType: "Mandates",
  importSchema: mandateImportSchema,
  normalizeEnums: normalizeMandateEnums,
// After
export const requestImportConfig: ImportEntityConfig<RequestImportData> = {
  prismaModel: "request",
  entityIdType: "Requests",
  importSchema: requestImportSchema,
  normalizeEnums: normalizeRequestEnums,
```

- [ ] **Step 4: ENCRYPTED_STRING_FIELDS stays the same**

The fields `["title", "notes"]` exist identically on the Request model. No change needed.

- [ ] **Step 5: Rewrite toPrismaData() completely**

Replace the entire `toPrismaData` function with:

```typescript
toPrismaData(
  item: RequestImportData,
  encrypted: Record<string, string | null>,
  friendlyId: string,
  userId: string,
  orgId: string,
): Record<string, unknown> {
  const e = (key: string) => encrypted[key] ?? null;

  function toDecimal(val: unknown): string | null {
    if (val == null || val === "") return null;
    const s = String(val).replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? null : String(n);
  }

  function toInt(val: unknown): number | null {
    if (val == null || val === "") return null;
    const n = parseInt(String(val), 10);
    return isNaN(n) ? null : n;
  }

  return {
    friendlyId,
    organizationId: orgId,
    createdBy: userId,
    updatedBy: userId,

    // Required field — default "BUY" if CSV omits it
    requestType: item.transaction_type ?? "BUY",

    // Property criteria
    propertyTypes: item.property_type ? [item.property_type] : [],
    propertyCategory: item.property_purpose ?? null,

    // Budget
    budgetMin: toDecimal(item.budget_min),
    budgetMax: toDecimal(item.budget_max),

    // Surface
    surfaceMin: toDecimal(item.size_min_sqm),
    surfaceMax: toDecimal(item.size_max_sqm),
    plotSizeMin: toDecimal(item.plot_size_min_sqm),
    plotSizeMax: toDecimal(item.plot_size_max_sqm),

    // Rooms
    bedroomsMin: toInt(item.bedrooms_min),
    bedroomsMax: toInt(item.bedrooms_max),
    bathroomsMin: toInt(item.bathrooms_min),
    bathroomsMax: toInt(item.bathrooms_max),

    // Floor
    floorMin: toInt(item.floor_min),
    floorMax: toInt(item.floor_max),
    groundFloorOnly: item.ground_floor_only ?? false,

    // Construction
    constructionYearMin: toInt(item.year_built_min),
    constructionYearMax: toInt(item.year_built_max),

    // Condition / features
    conditionPreference: item.condition ? [item.condition] : [],
    heatingTypes: item.heating_type ? [item.heating_type] : [],
    energyClassMin: item.energy_cert_min ?? null,
    furnished: item.mandate_furnished ?? null,

    // Booleans
    requiresElevator: item.elevator ?? null,
    requiresParking: item.parking ?? null,
    petFriendly: item.pets_allowed ?? null,
    insideCityPlan: item.inside_city_plan ?? null,
    legalizationOk: item.legalization_ok ?? null,

    // Location
    areasOfInterest: item.areas_of_interest ?? null,
    municipality: item.mandate_municipality ?? null,
    region: item.mandate_region ?? null,

    // Status / urgency
    // RequestStatus: ACTIVE/MATCHED/UNDER_OFFER/CLOSED/PAUSED
    // Old MandateStatus DRAFT maps to ACTIVE; FULFILLED→CLOSED; EXPIRED→CLOSED; CANCELLED→CLOSED
    status: item.status ?? "ACTIVE",
    urgency: item.urgency ?? "MEDIUM",

    // Notes (encrypted)
    title: e("title"),
    notes: e("mandate_notes"),

    // Visibility / draft
    visibility: item.mandate_visibility ?? "PRIVATE",
    draftStatus: false,

    // Expiry
    expiresAt: item.expires_at ? new Date(item.expires_at) : null,
  };
},
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "request-import-config\|mandate-import-config" | head -20
```

- [ ] **Step 7: Commit**

```bash
git add lib/import/request-import-config.ts
git commit -m "refactor(import): rename mandate-import-config → request-import-config, rewrite toPrismaData for Request model"
```

---

## Task 5: Update enum-normalizer.ts — add contact/request exports

**Files:**
- Modify: `lib/import/enum-normalizer.ts`

> **Why this step matters:** Both `validation-engine.ts` and `unified-engine.ts` import `normalizeClientEnums`/`normalizeMandateEnums` by name. Adding aliased exports with the new names lets the engine layers update their imports cleanly without touching enum logic. The status map in `normalizeMandateEnums` also needs entries for the new `RequestStatus` values.

- [ ] **Step 1: Update the mandate status map**

Find `const mandateStatusMap` in `lib/import/enum-normalizer.ts` and add the new RequestStatus canonical values:

```typescript
const mandateStatusMap: EnumMapping = {
  // Old mandate statuses → new RequestStatus canonical values
  draft: "ACTIVE",    // DRAFT becomes ACTIVE on import
  active: "ACTIVE",
  paused: "PAUSED",
  fulfilled: "CLOSED",
  expired: "CLOSED",
  cancelled: "CLOSED",
  // New RequestStatus values (pass-through)
  matched: "MATCHED",
  under_offer: "UNDER_OFFER",
  closed: "CLOSED",
  ACTIVE: "ACTIVE",
  MATCHED: "MATCHED",
  UNDER_OFFER: "UNDER_OFFER",
  CLOSED: "CLOSED",
  PAUSED: "PAUSED",
};
```

- [ ] **Step 2: Add normalizeContactEnums export at the bottom of the file**

```typescript
/**
 * Alias for normalizeClientEnums — use this name in all new code.
 * The underlying logic is identical; contact CSV fields use the same
 * snake_case keys as the old client fields.
 */
export const normalizeContactEnums = normalizeClientEnums;
```

- [ ] **Step 3: Add normalizeRequestEnums export at the bottom of the file**

```typescript
/**
 * Alias for normalizeMandateEnums — use this name in all new code.
 */
export const normalizeRequestEnums = normalizeMandateEnums;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "enum-normalizer" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add lib/import/enum-normalizer.ts
git commit -m "refactor(import): add normalizeContactEnums + normalizeRequestEnums aliases, update mandate status map for RequestStatus"
```

---

## Task 6: Update unified-field-definitions.ts

**Files:**
- Modify: `lib/import/unified-field-definitions.ts`

> **Why this step matters:** This file defines the `entity` union type and the `PREFIX_STRIP_MAP` that all engine layers depend on. All `mandate_*` prefix keys become `request_*`, all `client_*` keys become `contact_*`, and the `entity` union changes from `"client"|"property"|"mandate"` to `"contact"|"property"|"request"`. The constant names also change so callers can import them by their new names.

- [ ] **Step 1: Update imports**

```typescript
// Before
import { clientImportFieldDefinitions } from "./client-import-schema";
import { mandateImportFieldDefinitions } from "./mandate-import-schema";
// After
import { contactImportFieldDefinitions } from "./contact-import-schema";
import { requestImportFieldDefinitions } from "./request-import-schema";
```

- [ ] **Step 2: Update UnifiedFieldDefinition.entity union**

```typescript
// Before
entity: "client" | "property" | "mandate";
// After
entity: "contact" | "property" | "request";
```

- [ ] **Step 3: Update PREFIX_STRIP_MAP keys**

```typescript
export const PREFIX_STRIP_MAP: Record<string, string> = {
  request_transaction_type: "transaction_type",
  request_property_type: "property_type",
  request_status: "status",
  request_condition: "condition",
  request_heating_type: "heating_type",
  request_furnished: "furnished",
  request_elevator: "elevator",
  request_inside_city_plan: "inside_city_plan",
  request_municipality: "municipality",
  request_region: "region",
  request_notes: "notes",
  contact_description: "description",
  contact_visibility: "visibility",
  request_visibility: "visibility",
};
```

- [ ] **Step 4: Rename MANDATE_KEY_RENAMES → REQUEST_KEY_RENAMES**

```typescript
const REQUEST_KEY_RENAMES: Record<string, string> = {
  transaction_type: "request_transaction_type",
  property_type: "request_property_type",
  status: "request_status",
  condition: "request_condition",
  heating_type: "request_heating_type",
  furnished: "request_furnished",
  elevator: "request_elevator",
  inside_city_plan: "request_inside_city_plan",
  municipality: "request_municipality",
  region: "request_region",
  notes: "request_notes",
  visibility: "request_visibility",
};
```

- [ ] **Step 5: Rename MANDATE_OMIT_KEYS → REQUEST_OMIT_KEYS**

```typescript
const REQUEST_OMIT_KEYS = new Set<string>(["id", "title"]);
```

- [ ] **Step 6: Rename MANDATE_EXTRA_ALIASES → REQUEST_EXTRA_ALIASES**

```typescript
const REQUEST_EXTRA_ALIASES: Record<string, string[]> = {
  request_transaction_type: ["mandate_transaction", "buyer_intent"],
};
```

- [ ] **Step 7: Rename CLIENT_KEY_RENAMES (update values)**

```typescript
const CLIENT_KEY_RENAMES: Record<string, string> = {
  description: "contact_description",
  visibility: "contact_visibility",
};
```

- [ ] **Step 8: Update CLIENT_TRIGGER_KEYS**

```typescript
export const CLIENT_TRIGGER_KEYS = new Set([
  "contact_name",
  "primary_phone",
  "primary_email",
]);
```

- [ ] **Step 9: Update buildUnifiedDefinitions() — use new names and entity tags**

```typescript
function buildUnifiedDefinitions(): UnifiedFieldDefinition[] {
  const result: UnifiedFieldDefinition[] = [];

  // --- Property fields ---
  for (const def of propertyImportFieldDefinitions) {
    if (PROPERTY_OMIT_KEYS.has(def.key)) continue;
    result.push({ key: def.key, entity: "property", required: def.required,
      group: def.group, aliases: [...def.aliases], description: def.description });
  }

  // --- Contact fields (was: client) ---
  for (const def of contactImportFieldDefinitions) {
    if (CLIENT_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = CLIENT_KEY_RENAMES[def.key] ?? def.key;
    result.push({ key: renamedKey, entity: "contact", required: def.required,
      group: def.group, aliases: [...def.aliases], description: def.description });
  }

  // --- Request fields (was: mandate) ---
  for (const def of requestImportFieldDefinitions) {
    if (REQUEST_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = REQUEST_KEY_RENAMES[def.key] ?? def.key;
    const extraAliases = REQUEST_EXTRA_ALIASES[renamedKey] ?? [];
    result.push({ key: renamedKey, entity: "request", required: def.required,
      group: def.group, aliases: [...def.aliases, ...extraAliases], description: def.description });
  }

  return result;
}
```

- [ ] **Step 10: Rename MANDATE_FIELD_KEYS → REQUEST_FIELD_KEYS**

```typescript
export const REQUEST_FIELD_KEYS = new Set(
  UNIFIED_FIELD_DEFINITIONS.filter((f) => f.entity === "request").map((f) => f.key)
);
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "unified-field-definitions" | head -10
```

- [ ] **Step 12: Commit**

```bash
git add lib/import/unified-field-definitions.ts
git commit -m "refactor(import): update unified-field-definitions — entity union, PREFIX_STRIP_MAP, REQUEST_ constants"
```

---

## Task 7: Update validation-engine.ts

**Files:**
- Modify: `lib/import/validation-engine.ts`

> **Why this step matters:** `ValidatedRow` and `ValidationResult` are the contract between the validation engine and the batch engine. All callers destructure properties like `hasClient`, `clientRow`, `hasMandate`, `mandateRow` — renaming them here requires updating every consumer, but it ensures the type system enforces the rename everywhere.

- [ ] **Step 1: Update imports**

```typescript
// Before
import { normalizeClientEnums, normalizePropertyEnums, normalizeMandateEnums } from "./enum-normalizer";
import { clientImportSchema } from "./client-import-schema";
import { mandateImportSchema } from "./mandate-import-schema";
// After
import { normalizeContactEnums, normalizePropertyEnums, normalizeRequestEnums } from "./enum-normalizer";
import { contactImportSchema } from "./contact-import-schema";
import { requestImportSchema } from "./request-import-schema";
```

- [ ] **Step 2: Rewrite ValidatedRow interface**

```typescript
export interface ValidatedRow {
  rowIndex: number;
  contactRow: Record<string, unknown> | null;
  propertyRow: Record<string, unknown> | null;
  requestRow: Record<string, unknown> | null;
  hasContact: boolean;
  hasProperty: boolean;
  hasRequest: boolean;
  contactDedupKey?: string;
  propertyDedupKey?: string;
}
```

- [ ] **Step 3: Update ValidationError.entity union**

```typescript
export interface ValidationError {
  rowIndex: number;
  entity: "contact" | "property" | "request";
  field: string;
  error: string;
  rawValue: unknown;
}
```

- [ ] **Step 4: Update ValidationResult.entitySummary**

```typescript
export interface ValidationResult {
  validRows: ValidatedRow[];
  errorRows: ValidationError[];
  entitySummary: {
    contacts: EntitySummary;
    properties: EntitySummary;
    requests: EntitySummary;
  };
}
```

- [ ] **Step 5: Update fieldEntityMap type**

```typescript
const fieldEntityMap = new Map<string, "contact" | "property" | "request">();
```

- [ ] **Step 6: Update partitionRow function**

```typescript
function partitionRow(
  row: Record<string, unknown>,
): {
  contactRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  requestRow: Record<string, unknown>;
} {
  const contactRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const requestRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue;
    if (entity === "contact") contactRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else requestRow[key] = value;
  }

  return { contactRow, propertyRow, requestRow };
}
```

- [ ] **Step 7: Rename clientDedupKey() → contactDedupKey()**

```typescript
function contactDedupKey(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "").trim().replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.contact_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}
```

- [ ] **Step 8: Update validateImportData() body**

Rename all internal variables and update detection/validation logic:

```typescript
export function validateImportData(
  rows: Record<string, unknown>[],
): ValidationResult {
  const validRows: ValidatedRow[] = [];
  const errorRows: ValidationError[] = [];

  const contactDedupMap = new Map<string, number[]>();
  const propertyDedupMap = new Map<string, number[]>();

  let contactTotal = 0;
  let propertyTotal = 0;
  let requestTotal = 0;

  // Detect whether the file has a contact_name column mapped at all
  const fileHasContactNameColumn = rows.some((r) => r.contact_name !== undefined);

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i;

    const { contactRow: rawContactRow, propertyRow, requestRow: rawRequestRow } =
      partitionRow(rows[i]);

    const hasContact =
      isNonEmpty(rawContactRow.contact_name) ||
      (!fileHasContactNameColumn &&
        (isNonEmpty(rawContactRow.primary_phone) || isNonEmpty(rawContactRow.primary_email)));

    const hasProperty = isNonEmpty(propertyRow.property_name);

    const requestRow = stripEntityPrefix(rawRequestRow);
    const hasRequest = Object.values(rawRequestRow).some(isNonEmpty);

    if (hasContact) contactTotal++;
    if (hasProperty) propertyTotal++;
    if (hasRequest) requestTotal++;

    const validated: ValidatedRow = {
      rowIndex,
      contactRow: null,
      propertyRow: null,
      requestRow: null,
      hasContact,
      hasProperty,
      hasRequest,
    };

    // ... (rest of validation logic — update schema calls and error entity strings)
    // normalizeContactEnums, contactImportSchema.safeParse, entity: "contact"
    // normalizeRequestEnums, requestImportSchema.safeParse, entity: "request"

    if (hasContact) {
      const contactKey = contactDedupKey(rawContactRow);
      validated.contactDedupKey = contactKey;
    }
    // ... assign validated.contactRow, validated.requestRow from parse results
  }

  return {
    validRows,
    errorRows,
    entitySummary: {
      contacts: { detected: contactTotal > 0, total: contactTotal, unique: contactDedupMap.size, deduplicated: contactTotal - contactDedupMap.size },
      properties: { detected: propertyTotal > 0, total: propertyTotal, unique: propertyDedupMap.size, deduplicated: propertyTotal - propertyDedupMap.size },
      requests: { detected: requestTotal > 0, total: requestTotal, unique: requestTotal, deduplicated: 0 },
    },
  };
}
```

> **Note:** Follow the same validation flow structure as the existing code but with `contact`/`request` everywhere. The `normalizeContactEnums` and `normalizeRequestEnums` calls replace the old `normalizeClientEnums`/`normalizeMandateEnums` calls.

- [ ] **Step 9: Verify TypeScript compiles with no errors in this file**

```bash
npx tsc --noEmit 2>&1 | grep "validation-engine" | head -10
```

- [ ] **Step 10: Commit**

```bash
git add lib/import/validation-engine.ts
git commit -m "refactor(import): update validation-engine — ValidatedRow, ValidationError, ValidationResult, contactDedupKey"
```

---

## Task 8: Update unified-engine.ts

**Files:**
- Modify: `lib/import/unified-engine.ts`

> **Why this step matters:** This file has five broken Prisma accessors. Additionally, `tx.mandate_Properties` references a junction table that was never created in the new schema — instead of renaming it, the mandate-property link creation must be dropped entirely (`linkCounts.requestProperty` always returns 0). The `UnifiedImportResult` deprecated wrapper is also removed.

- [ ] **Step 1: Update imports**

```typescript
// Before
import { clientImportConfig } from "./client-import-config";
import { mandateImportConfig } from "./mandate-import-config";
import { normalizeClientEnums, normalizePropertyEnums, normalizeMandateEnums } from "./enum-normalizer";
import { clientImportSchema } from "./client-import-schema";
import { mandateImportSchema } from "./mandate-import-schema";
// After
import { contactImportConfig } from "./contact-import-config";
import { requestImportConfig } from "./request-import-config";
import { normalizeContactEnums, normalizePropertyEnums, normalizeRequestEnums } from "./enum-normalizer";
import { contactImportSchema } from "./contact-import-schema";
import { requestImportSchema } from "./request-import-schema";
```

- [ ] **Step 2: Rewrite BatchImportResult**

```typescript
export interface BatchImportResult {
  contacts: Array<{ uuid: string; friendlyId: string }>;
  properties: Array<{ uuid: string; friendlyId: string }>;
  requests: Array<{ uuid: string; friendlyId: string }>;
  linkCounts: {
    contactProperty: number;
    requestProperty: number;   // always 0 — no RequestProperty junction table
    requestContact: number;
  };
  errors: Array<{ rowIndex: number; entity: string; error: string }>;
  skippedCount: number;
}
```

- [ ] **Step 3: Remove UnifiedImportResult and executeUnifiedImport**

Delete both the `UnifiedImportResult` interface and the deprecated `executeUnifiedImport()` function at the bottom of the file.

- [ ] **Step 4: Update fieldEntityMap**

```typescript
const fieldEntityMap = new Map<string, "contact" | "property" | "request">();
for (const def of UNIFIED_FIELD_DEFINITIONS) {
  fieldEntityMap.set(def.key, def.entity);
}
```

- [ ] **Step 5: Update partitionRow**

```typescript
function partitionRow(row: Record<string, unknown>): {
  contactRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  requestRow: Record<string, unknown>;
} {
  const contactRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const requestRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue;
    if (entity === "contact") contactRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else requestRow[key] = value;
  }

  return { contactRow, propertyRow, requestRow };
}
```

- [ ] **Step 6: Update clientDedupKeyFromRow**

```typescript
function contactDedupKeyFromRow(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "").trim().replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.contact_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}
```

- [ ] **Step 7: Update early-return empty result**

```typescript
return {
  contacts: [],
  properties: [],
  requests: [],
  linkCounts: { contactProperty: 0, requestProperty: 0, requestContact: 0 },
  errors: [],
  skippedCount: 0,
};
```

- [ ] **Step 8: Rename all internal variables**

In `executeBatchImport()`, rename:
- `clientDedupMap` → `contactDedupMap`
- `rowClientUuid` → `rowContactUuid`
- `rowClientName` → `rowContactName`
- `uniqueClientCount` → `uniqueContactCount`
- `clientsToCreate` → `contactsToCreate`
- `clientFriendlyIds` → `contactFriendlyIds`
- `clientFidCursor` → `contactFidCursor`
- `rowMandateUuid` → `rowRequestUuid`
- `mandateCount` → `requestCount`
- `mandatesToCreate` → `requestsToCreate`
- `mandateFriendlyIds` → `requestFriendlyIds`
- `mandateFidCursor` → `requestFidCursor`

- [ ] **Step 9: Update generateFriendlyIds calls**

```typescript
// Before
await generateFriendlyIds(prismadb, "Clients", uniqueClientCount, orgId)
await generateFriendlyIds(prismadb, "Mandates", mandateCount, orgId)
// After
await generateFriendlyIds(prismadb, "Contacts", uniqueContactCount, orgId)
await generateFriendlyIds(prismadb, "Requests", requestCount, orgId)
```

- [ ] **Step 10: Update error entity strings**

```typescript
// In client error push:
errors.push({ rowIndex: row.rowIndex, entity: "contact", error: msg });
// In mandate error push:
errors.push({ rowIndex: row.rowIndex, entity: "request", error: msg });
```

- [ ] **Step 11: Update importConfig references in second pass**

```typescript
// Contact block (was: client)
const contactRowData = { ...row.contactRow };
const encrypted = contactImportConfig.encryptWithDek(contactRowData, dek);
const prismaData = contactImportConfig.toPrismaData(contactRowData as any, encrypted, friendlyId, userId, orgId);
if (assignedTo) prismaData.assignedTo = assignedTo;
contactsToCreate.push({ uuid: contactUuid, prismaData });

// Request block (was: mandate)
const requestRowData = { ...row.requestRow };
const encrypted = requestImportConfig.encryptWithDek(requestRowData, dek);
const prismaData = requestImportConfig.toPrismaData(requestRowData as any, encrypted, friendlyId, userId, orgId);
if (assignedTo) prismaData.assignedTo = assignedTo;
requestsToCreate.push({ uuid: requestUuid, prismaData });
```

- [ ] **Step 12: Update junction link arrays — drop mandate_Properties entirely**

```typescript
// Keep contact-property links
interface ContactPropertyLink {
  id: string;
  contactId: string;
  propertyId: string;
}
// Keep request-contact links
interface RequestContactLink {
  requestId: string;
  contactId: string;
}
// REMOVE: MandatePropertyLink — no RequestProperty junction table in schema

const contactPropertyLinks: ContactPropertyLink[] = [];
const requestContactLinks: RequestContactLink[] = [];

// Dedup sets
const cpLinkSet = new Set<string>();
const rcLinkSet = new Set<string>();

for (const row of validatedRows) {
  const contactUuid = rowContactUuid.get(row.rowIndex);
  const propertyUuid = rowPropertyUuid.get(row.rowIndex);
  const requestUuid = rowRequestUuid.get(row.rowIndex);

  if (contactUuid && propertyUuid) {
    const key = `${contactUuid}:${propertyUuid}`;
    if (!cpLinkSet.has(key)) {
      cpLinkSet.add(key);
      contactPropertyLinks.push({ id: crypto.randomUUID(), contactId: contactUuid, propertyId: propertyUuid });
    }
  }

  if (requestUuid && contactUuid) {
    const key = `${requestUuid}:${contactUuid}`;
    if (!rcLinkSet.has(key)) {
      rcLinkSet.add(key);
      requestContactLinks.push({ requestId: requestUuid, contactId: contactUuid });
    }
  }
  // mandate-property link intentionally dropped (no RequestProperty model)
}
```

- [ ] **Step 13: Update the transaction block**

```typescript
await prismadb.$transaction(
  async (tx: any) => {
    // Phase 1 — Contacts
    if (contactsToCreate.length > 0) {
      await tx.contact.createMany({
        data: contactsToCreate.map((c) => c.prismaData),
        skipDuplicates: true,
      });
    }

    // Phase 2 — Properties
    if (propertiesToCreate.length > 0) {
      await tx.properties.createMany({
        data: propertiesToCreate.map((p) => p.prismaData),
        skipDuplicates: true,
      });
    }

    // Phase 3 — Requests
    if (requestsToCreate.length > 0) {
      await tx.request.createMany({
        data: requestsToCreate.map((r) => r.prismaData),
        skipDuplicates: true,
      });
    }

    // Phase 4 — Junction Links
    if (contactPropertyLinks.length > 0) {
      await tx.contactProperty.createMany({
        data: contactPropertyLinks,
        skipDuplicates: true,
      });
    }

    // NOTE: No tx.requestProperty — that junction table does not exist.
    // requestProperty link count is always 0.

    if (requestContactLinks.length > 0) {
      await tx.requestContact.createMany({
        data: requestContactLinks,
        skipDuplicates: true,
      });
    }
  },
  { timeout: 15000 },
);
```

- [ ] **Step 14: Update result assembly**

```typescript
const result: BatchImportResult = {
  contacts: contactsToCreate.map((c) => ({
    uuid: c.uuid,
    friendlyId: contactFriendlyIds.get(c.uuid) ?? "",
  })),
  properties: propertiesToCreate.map((p) => ({
    uuid: p.uuid,
    friendlyId: propertyFriendlyIds.get(p.uuid) ?? "",
  })),
  requests: requestsToCreate.map((r) => ({
    uuid: r.uuid,
    friendlyId: requestFriendlyIds.get(r.uuid) ?? "",
  })),
  linkCounts: {
    contactProperty: contactPropertyLinks.length,
    requestProperty: 0,  // no junction table
    requestContact: requestContactLinks.length,
  },
  errors,
  skippedCount,
};
```

- [ ] **Step 15: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "unified-engine" | head -10
```

- [ ] **Step 16: Run full type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 17: Commit**

```bash
git add lib/import/unified-engine.ts
git commit -m "refactor(import): update unified-engine — BatchImportResult, Prisma accessors, drop mandate_Properties, remove UnifiedImportResult"
```

---

## Task 9: Security patches (Gaps 1–7)

**Files:**
- Modify: `actions/social-feed/get-social-posts.ts`
- Modify: `app/api/share/email/route.ts`
- Modify: `app/api/share/route.ts`
- Modify: `app/api/entities/search/route.ts`
- Modify: `actions/deals/index.ts`
- Modify: `actions/mandates/update-mandate.ts`
- Modify: `actions/mandates/update-mandate-visibility.ts`

> **Why this step matters:** These patches are independent of the engine layers and close real security holes. Gap 1 is a tenant isolation leak (missing `organizationId`). Gaps 2-4 are stale enum strings causing silent routing failures. Gap 5 exposes soft-deleted deals. Gaps 6-7 bypass the permission guard system, allowing any authenticated user to mutate mandates regardless of role.

### Gap 1 — Social feed: add organizationId to linked-request lookup

**File:** `actions/social-feed/get-social-posts.ts` line ~173

```typescript
// Before
? prismadb.mandate.findMany({ where: { id: { in: linkedRequestIds } }, select: { id: true, friendlyId: true } })
// After
? prismadb.mandate.findMany({ where: { id: { in: linkedRequestIds }, organizationId }, select: { id: true, friendlyId: true } })
```

- [ ] **Apply Gap 1 fix**

### Gap 2 — Share email route: update stale "client" enum value

**File:** `app/api/share/email/route.ts` — find both `z.enum(["property", "client", "post"])` occurrences

```typescript
// Before (both schema definitions)
z.enum(["property", "client", "post"])
// After
z.enum(["property", "contact", "post"])
```

- [ ] **Apply Gap 2 fix**

### Gap 3 — Share route: fix dead case "CLIENT" and stale revalidatePath

**File:** `app/api/share/route.ts`

```typescript
// Before
case "CLIENT":
  ...
  revalidatePath("/crm/clients")
// After
case "CONTACT":
  ...
  revalidatePath("/crm/contacts")
```

- [ ] **Apply Gap 3 fix**

### Gap 4 — Entity search: fix stale default type list

**File:** `app/api/entities/search/route.ts` — find the `defaultTypes` string

```typescript
// Before
const defaultTypes = "client,property,document,event,mandate"
// After
const defaultTypes = "contact,property,document,event,request,deal"
```

- [ ] **Apply Gap 4 fix**

### Gap 5 — Deals: add deletedAt filter + respect includeDeleted

**File:** `actions/deals/index.ts` — `getDeals()` function

```typescript
// Before
const where: Prisma.DealWhereInput = { organizationId };

// After
const where: Prisma.DealWhereInput = { organizationId, deletedAt: null };

if (filters?.includeDeleted === "true") {
  delete (where as any).deletedAt;
}
```

- [ ] **Apply Gap 5 fix**

### Gap 6 — update-mandate.ts: add permission guard

**File:** `actions/mandates/update-mandate.ts`

```typescript
// Before (top of function, after "use server")
const { organizationId, userId } = await auth();
if (!organizationId || !userId) throw new Error("Unauthorized");

// After
const guard = await requireAction("request:update");
if (guard) return guard;
const organizationId = await getCurrentOrgId();
```

Also update the return type to `Promise<ActionResponse<Request>>` and import `requireAction`, `getCurrentOrgId`, `actionSuccess`, `actionError` from the standard action helpers.

- [ ] **Apply Gap 6 fix**

### Gap 7 — update-mandate-visibility.ts: add permission guard

**File:** `actions/mandates/update-mandate-visibility.ts`

```typescript
// Before
const { orgId } = await auth();

// After
const guard = await requireAction("request:update_visibility");
if (guard) return guard;
const organizationId = await getCurrentOrgId();
```

- [ ] **Apply Gap 7 fix**

- [ ] **Commit all security patches**

```bash
git add actions/social-feed/get-social-posts.ts \
        app/api/share/email/route.ts \
        app/api/share/route.ts \
        app/api/entities/search/route.ts \
        actions/deals/index.ts \
        actions/mandates/update-mandate.ts \
        actions/mandates/update-mandate-visibility.ts
git commit -m "fix(security): patch 7 import-engine gaps — tenant isolation, stale enums, soft-delete, permission guards"
```

---

## Task 10: Update UnifiedImportWizard.tsx

**Files:**
- Modify: `components/import/UnifiedImportWizard.tsx`

> **Why this step matters:** The wizard reads `importFields.client`, `importFields.mandate`, `result.clients`, and `result.mandates`. These must track the engine's new type names or the wizard will display wrong counts and fail to merge enums for the field picker.

- [ ] **Step 1: Update importFields prop type**

Find the `importFields` prop type definition and update:

```typescript
// Before
importFields?: {
  client?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
  mandate?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
  property?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
}
// After
importFields?: {
  contact?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
  request?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
  property?: { fields: UnifiedFieldDefinition[]; enums?: Record<string, string[]> };
}
```

- [ ] **Step 2: Update enum merging (line ~119)**

```typescript
// Before
...importFields.client?.enums,
...importFields.mandate?.enums,
// After
...importFields.contact?.enums,
...importFields.request?.enums,
```

- [ ] **Step 3: Update result stats display (line ~166)**

```typescript
// Before
result.clients.length + result.properties.length + result.mandates.length
// After
result.contacts.length + result.properties.length + result.requests.length
```

- [ ] **Step 4: Update result description string (line ~170)**

```typescript
// Before
`Created ${result.clients.length} client(s), ${result.properties.length} property(ies), ${result.mandates.length} mandate(s)`
// After
`Created ${result.contacts.length} contact(s), ${result.properties.length} property(ies), ${result.requests.length} request(s)`
```

- [ ] **Step 5: Update stats object keys (line ~186, ~195)**

```typescript
// Before
created: result.clients.length,
// After
created: result.contacts.length,

// Before
created: result.mandates.length,
// After
created: result.requests.length,
```

- [ ] **Step 6: Update mandateFieldKeys prop → requestFieldKeys**

```typescript
// Before (caller site and prop definition)
mandateFieldKeys={MANDATE_FIELD_KEYS}
// After
requestFieldKeys={REQUEST_FIELD_KEYS}
```

Update the import at the top: `import { REQUEST_FIELD_KEYS } from "@/lib/import/unified-field-definitions"`.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "UnifiedImportWizard" | head -10
```

- [ ] **Step 8: Commit**

```bash
git add components/import/UnifiedImportWizard.tsx
git commit -m "refactor(import): update UnifiedImportWizard — importFields prop, stats display, requestFieldKeys"
```

---

## Task 11: Update i18n files (both locales)

**Files:**
- Modify: `locales/en/import.json`
- Modify: `locales/el/import.json`

> **Why this step matters:** The `import` namespace is already registered in both `i18n.ts` and `layout.tsx` — no registration step needed. But stale key names like `ImportWizard.titleClients`, `history.type.CLIENTS`, and `batchDelete.mandatePropertyLinks` will cause runtime lookup failures in the updated engine and wizard code.

- [ ] **Step 1: Update locales/en/import.json**

Apply ALL of the following key renames. Edit the JSON file directly:

**In `ImportWizard`:**
- `titleClients` → `titleContacts` (value: `"Import Contacts"`)
- `titleMandates` → `titleRequests` (value: `"Import Requests"`)

**In `ImportFields.unified.groups`:**
- `"contact": "Client — Contact"` → `"contact": "Contact — Contact"`
- `"billing": "Client — Billing"` → `"billing": "Contact — Billing"`
- `"shipping": "Client — Shipping"` → `"shipping": "Contact — Shipping"`
- All `"Mandate — ..."` group names → `"Request — ..."`

**In `ImportFields.unified.fields`:**
- `client_name` key → `contact_name`
- `client_description` key → `contact_description`
- `client_type` key → `contact_type`
- `client_status` key → `contact_status`
- `client_visibility` key → `contact_visibility`
- All `mandate_*` keys → `request_*` (e.g., `mandate_transaction_type` → `request_transaction_type`)

**In `ImportFields` top-level blocks:**
- Rename `"client"` block → `"contact"`
- Rename `"mandate"` block → `"request"`

**In `entities`:**
- `CLIENTS` → `CONTACTS` (value: `"Contacts"`)
- `MANDATES` → `REQUESTS` (value: `"Requests"`)

**In `summary`:**
- `clients` → `contacts` (value: `"contacts"`)
- `mandates` → `requests` (value: `"requests"`)

**Link count keys:**
- `clientPropertyLinks` → `contactPropertyLinks`
- `mandatePropertyLinks` → `requestPropertyLinks`
- `mandateClientLinks` → `requestContactLinks`

**In `history.type`:**
- `CLIENTS` → `CONTACTS`
- `MANDATES` → `REQUESTS`

**In `history.detail`:**
- `clients` → `contacts`
- `mandates` → `requests`
- `clientPropertyLinks` → `contactPropertyLinks`
- `mandatePropertyLinks` → `requestPropertyLinks`
- `mandateClientLinks` → `requestContactLinks`

**In `batchDelete`:**
- `clientPropertyLinks` → `contactPropertyLinks`
- `mandatePropertyLinks` → `requestPropertyLinks`
- `mandateClientLinks` → `requestContactLinks`

- [ ] **Step 2: Update locales/el/import.json with matching key renames**

Apply the same structural key renames as Step 1 but keep Greek values. Additionally update these Greek translations:

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

Update group label prefixes: `"Πελάτη — "` → `"Επαφής — "`, `"Εντολής — "` → `"Αιτήματος — "`.

- [ ] **Step 3: Verify JSON syntax**

```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en/import.json', 'utf8'))" && echo "en OK"
node -e "JSON.parse(require('fs').readFileSync('locales/el/import.json', 'utf8'))" && echo "el OK"
```

Expected: `en OK` and `el OK`

- [ ] **Step 4: Commit**

```bash
git add locales/en/import.json locales/el/import.json
git commit -m "i18n(import): rename client→contact, mandate→request keys in both locales"
```

---

## Task 12: Update tests

**Files:**
- Modify: `tests/import/validation-engine.test.ts`
- Modify: `tests/import/batch-engine.test.ts`
- Create: `tests/social-feed/get-social-posts.test.ts`

### Sub-task 12a: Mechanical renames in validation-engine.test.ts

- [ ] **Step 1: Update all ValidatedRow property references**

```typescript
// Before → After (all occurrences)
hasClient → hasContact
clientRow → contactRow
hasMandate → hasRequest
mandateRow → requestRow
clientDedupKey → contactDedupKey
```

- [ ] **Step 2: Update entitySummary assertions**

```typescript
// Before
result.entitySummary.clients.total
result.entitySummary.mandates.total
// After
result.entitySummary.contacts.total
result.entitySummary.requests.total
```

- [ ] **Step 3: Update field key references**

```typescript
// Before
client_name: "Γιώργος Παπαδόπουλος"
mandate_transaction_type: "BUY"
// After
contact_name: "Γιώργος Παπαδόπουλος"
request_transaction_type: "BUY"
```

- [ ] **Step 4: Update test description strings**

```typescript
// Before
it("detects client when client_name is present", ...)
// After
it("detects contact when contact_name is present", ...)
```

### Sub-task 12b: Add new validation-engine tests

- [ ] **Step 5: Add contactDedupKey priority test**

```typescript
it("contactDedupKey: phone wins over email wins over name", async () => {
  const rows = [
    { contact_name: "Άννα Παπά", primary_email: "anna@test.com", primary_phone: "6901234567" },
    { contact_name: "Άννα Παπά", primary_email: "anna@test.com" },
    { contact_name: "Άννα Παπά" },
  ];

  const result = validateImportData(rows);

  // Row 0: deduped by phone
  expect(result.validRows[0].contactDedupKey).toBe("phone:6901234567");
  // Row 1: deduped by email
  expect(result.validRows[1].contactDedupKey).toBe("email:anna@test.com");
  // Row 2: deduped by name
  expect(result.validRows[2].contactDedupKey).toBe("name:άννα παπά");
});
```

- [ ] **Step 6: Add ContactCategory array parsing test**

```typescript
it("parses ContactCategory as array from comma-separated string", async () => {
  const rows = [{ contact_name: "Test", contact_type: "BUYER, INVESTOR" }];

  const result = validateImportData(rows);

  expect(result.validRows[0].contactRow?.category).toEqual(["BUYER", "INVESTOR"]);
});
```

### Sub-task 12c: Update batch-engine.test.ts

- [ ] **Step 7: Update mock tx object**

```typescript
const mockTransaction = vi.fn(
  async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) => {
    const tx = {
      contact: {
        createMany: mockCreateMany,
        findMany: mockFindMany,
      },
      properties: {
        createMany: mockCreateMany,
        findMany: mockFindMany,
      },
      request: {
        createMany: mockCreateMany,
        findMany: mockFindMany,
      },
      contactProperty: {
        createMany: mockCreateMany,
      },
      // NOTE: No requestProperty — that junction table does not exist
      requestContact: {
        createMany: mockCreateMany,
      },
      $queryRaw: vi.fn().mockResolvedValue([{ lastValue: 10 }]),
    };
    return fn(tx);
  },
);
```

- [ ] **Step 8: Update BatchImportResult assertions**

```typescript
// Before
expect(result.clients).toHaveLength(1);
expect(result.mandates).toHaveLength(1);
expect(result.linkCounts.clientProperty).toBe(1);
expect(result.linkCounts.mandateClient).toBe(1);
// After
expect(result.contacts).toHaveLength(1);
expect(result.requests).toHaveLength(1);
expect(result.linkCounts.contactProperty).toBe(1);
expect(result.linkCounts.requestContact).toBe(1);
```

Also assert `result.linkCounts.requestProperty === 0` (always zero).

### Sub-task 12d: Add social feed tenant isolation test

- [ ] **Step 9: Create tests/social-feed/get-social-posts.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    agentConnection: { findMany: vi.fn().mockResolvedValue([]) },
    agentProfile: { findMany: vi.fn().mockResolvedValue([]) },
    socialPost: { findMany: vi.fn().mockResolvedValue([]) },
    contact: { findMany: vi.fn().mockResolvedValue([]) },
    properties: { findMany: vi.fn().mockResolvedValue([]) },
    mandate: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUserSafe: vi.fn().mockResolvedValue({ id: "user_1", name: "Test" }),
  getCurrentOrgIdSafe: vi.fn().mockResolvedValue("org_a"),
}));

describe("getSocialPosts — tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches linked requests with organizationId filter", async () => {
    const { prismadb } = await import("@/lib/prisma");

    // Simulate a post linked to a request
    (prismadb.socialPost.findMany as any).mockResolvedValueOnce([
      {
        id: "post_1",
        authorId: "user_1",
        postType: "request",
        linkedEntityId: "req_1",
        linkedEntityType: "request",
        linkedEntityTitle: "Test Request",
        linkedEntitySubtitle: null,
        linkedEntityMetadata: null,
        content: "Test content",
        slug: null,
        createdAt: new Date(),
        organizationId: "org_a",
        Users: { id: "user_1", name: "Test", avatar: null, username: null, AgentProfile: null },
        SocialPostLike: [],
        SocialPostComment: [],
        attachments: [],
      },
    ]);

    const { getSocialPosts } = await import("@/actions/social-feed/get-social-posts");
    await getSocialPosts();

    expect(prismadb.mandate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_a",
        }),
      })
    );
  });
});
```

- [ ] **Step 10: Run all import and social-feed tests**

```bash
pnpm vitest run tests/import/ tests/social-feed/ 2>&1
```

Expected: all tests pass, no failures.

- [ ] **Step 11: Commit**

```bash
git add tests/import/validation-engine.test.ts \
        tests/import/batch-engine.test.ts \
        tests/social-feed/get-social-posts.test.ts
git commit -m "test(import): update and extend tests — contact/request renames, dedup priority, tenant isolation"
```

---

## Task 13: Final build check

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Run the import test suite**

```bash
pnpm vitest run tests/import/ 2>&1
```

Expected: all green.

- [ ] **Step 3: Run pnpm build**

```bash
pnpm build 2>&1 | tail -30
```

Expected: successful build, no errors about missing import keys or Prisma accessors.

- [ ] **Step 4: Commit (if any build-fix changes needed)**

```bash
git add -p
git commit -m "fix(import): build-fix — address any remaining type errors after full build"
```

---

## Self-Review Against Spec

**Section 3 (Field Definitions):** Covered in Task 6. All PREFIX_STRIP_MAP keys renamed; CLIENT_KEY_RENAMES updated; MANDATE→REQUEST constant renames done.

**Section 4 (Validation Engine):** Covered in Task 7. ValidatedRow, ValidationError, ValidationResult, contactDedupKey, partitionRow all updated.

**Section 5 (Unified Engine):** Covered in Task 8. BatchImportResult updated. Prisma accessors: `tx.clients→tx.contact` ✓, `tx.mandate→tx.request` ✓, `tx.client_Properties→tx.contactProperty` ✓, `tx.mandate_Properties` DROPPED (no junction table) ✓, `tx.mandate_Clients→tx.requestContact` ✓. generateFriendlyIds "Clients"→"Contacts", "Mandates"→"Requests" ✓.

**Section 6 (Security Gaps 1–7):** Covered in Task 9. All 7 gaps addressed.

**Section 7 (UI Component):** Covered in Task 10. importFields prop, enum merging, stats display, requestFieldKeys all updated.

**Section 8 (i18n):** Covered in Task 11. Both locales updated in lockstep.

**Section 9 (Tests):** Covered in Task 12. Mechanical renames + 3 new tests + social feed security test.

**Section 10 (File Renames):** Covered in Tasks 1–4. All 4 files renamed with updated internal exports.

**Spec delta — not in spec but required:**
- `toPrismaData()` required full rewrites (not just renames) due to Contact/Request camelCase schema
- `RequestProperty` junction table does not exist — mandate-property link creation dropped (`requestProperty: 0`)
- `requestType` required field defaults to `"BUY"` in `toPrismaData()`
- `title` relaxed to optional in request-import-schema (it's `String?` on Request model)
- Three Contact fields (`fax`, `website`, `member_of`) silently dropped in `toPrismaData()`
- `addresses Json[]` assembled from individual billing/shipping CSV fields
