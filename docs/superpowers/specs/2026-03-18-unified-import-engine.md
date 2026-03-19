# Unified Import Engine — Technical Implementation Spec

**Date:** 2026-03-18
**Status:** Draft — pending review
**Source:** Product spec at `docs/plans/Oikion_Unified_Import_Engine_Spec_v1.0.docx.pdf`
**Scope:** Maps the product spec to the Oikion codebase — actual field names, Prisma models, existing code, and phased delivery

---

## Phased Delivery

The product spec describes a ~2-month system. For the showcase (6 hours), we build the **core engine** that demonstrates the value proposition. Everything else is architecturally accommodated but deferred.

| Phase | Scope | Timeline |
|-------|-------|----------|
| **MVP** | Universal engine: partition → detect → create → link. Single-tab XLSX/CSV. Reuse existing wizard UI with multi-entity mapping. Permission gate. | **6 hours** |
| **Phase 2** | Multi-tab XLSX cross-tab analysis. Within-file deduplication. Against-DB duplicate detection. Progressive SSE updates. | 1–2 weeks |
| **Phase 3** | Import history model + rollback. Template system. Conflict resolution UI. Failed-row export. | 2–3 weeks |
| **Phase 4** | Batch image import. Encoding detection (Win-1253, ISO-8859-7). Multi-client column detection. | 2–3 weeks |

This spec covers **MVP** in full detail and **Phase 2–4** as architectural stubs.

---

## 1. Field-to-Entity Ownership Map

The product spec uses simplified field names. Here is the exact mapping to Prisma model fields and existing import schema keys.

### 1.1 Client Fields (entity: `"client"`)

Fields owned by `Clients` model. Prisma accessor: `prismadb.clients`.

| Field key | Prisma column | Type | Triggers creation | Aliases (EN/GR/Greeklish) |
|-----------|--------------|------|-------------------|--------------------------|
| `client_name` | `client_name` | `String` | **YES** (primary trigger) | name, full_name, owner, owner_name, client, contact_name, όνομα, επωνυμία, ιδιοκτήτης, onoma, onomateponimo, idiokitis |
| `primary_email` | `primary_email` | `String?` | YES (secondary trigger — creates client if no `client_name`) | email, main_email, email_address, contact_email |
| `primary_phone` | `primary_phone` | `String?` | YES (secondary trigger) | phone, mobile, cell, tel, τηλέφωνο, κινητό, tilefono, kinito |
| `client_type` | `client_type` | `ClientType?` | no | type, customer_type, contact_type, typos_pelati |
| `client_status` | `client_status` | `ClientStatus?` | no | status, customer_status |
| `person_type` | `person_type` | `PersonType?` | no | entity_type, typos_prosopou |
| `company_name` | `company_name` | `String?` | no | business_name, organization, etaireia |
| `company_id` | `company_id` | `String?` | no | business_id |
| `vat` | `vat` | `String?` | no | vat_number, tax_id, fpa |
| `website` | `website` | `String?` | no | web, url, site, istotopos |
| `fax` | `fax` | `String?` | no | fax_number |
| `afm` | `afm` | `String?` | no | tax_id, tin, arithmos_forologikou_mitroou |
| `doy` | `doy` | `String?` | no | tax_office, eforia |
| `id_doc` | `id_doc` | `String?` | no | id_number, passport, tautotita |
| `company_gemi` | `company_gemi` | `String?` | no | gemi, gemi_number |
| `office_phone` | `office_phone` | `String?` | no | work_phone, business_phone |
| `secondary_phone` | `secondary_phone` | `String?` | no | alt_phone, phone_2 |
| `secondary_email` | `secondary_email` | `String?` | no | alt_email, email_2 |
| `billing_street` | `billing_street` | `String?` | no | street, address, odos, dieuthinsi |
| `billing_city` | `billing_city` | `String?` | no | city, town, poli |
| `billing_state` | `billing_state` | `String?` | no | state, region, nomos |
| `billing_postal_code` | `billing_postal_code` | `String?` | no | postal_code, zip, tk |
| `billing_country` | `billing_country` | `String?` | no | country, chora |
| `shipping_street` | `shipping_street` | `String?` | no | ship_street |
| `shipping_city` | `shipping_city` | `String?` | no | ship_city |
| `shipping_state` | `shipping_state` | `String?` | no | ship_state |
| `shipping_postal_code` | `shipping_postal_code` | `String?` | no | ship_zip |
| `shipping_country` | `shipping_country` | `String?` | no | ship_country |
| `lead_source` | `lead_source` | `LeadSource?` | no | source, how_found, pigi_epafis |
| `gdpr_consent` | `gdpr_consent` | `Boolean` | no | data_consent, privacy_consent |
| `allow_marketing` | `allow_marketing` | `Boolean` | no | marketing_consent, newsletter |
| `client_description` | `description` | `String?` | no | client_notes, client_comments, client_perigrafi, simeioseis |
| `member_of` | `member_of` | `String?` | no | group, segment |

**Encrypted fields** (via org DEK): `client_name`, `company_name`, `company_id`, `primary_email`, `secondary_email`, `primary_phone`, `secondary_phone`, `office_phone`, `fax`, `afm`, `vat`, `doy`, `id_doc`, `company_gemi`, `description`, all `billing_*` and `shipping_*` address fields.

**Defaults on create:** `client_status: "LEAD"`, `visibility: "PRIVATE"`, `draft_status: false`

### 1.2 Property Fields (entity: `"property"`)

Fields owned by `Properties` model. Prisma accessor: `prismadb.properties`.

| Field key | Prisma column | Type | Triggers creation | Notable aliases |
|-----------|--------------|------|-------------------|----------------|
| `property_name` | `property_name` | `String` | **YES** (primary trigger) | name, title, listing_name, headline |
| `property_type` | `property_type` | `PropertyType?` | no | type, category |
| `property_status` | `property_status` | `PropertyStatus?` | no | status, listing_status |
| `transaction_type` | `transaction_type` | `TransactionType?` | no | transaction, deal_type, sale_rent, offer_type |
| `price` | `price` | `Decimal?` | no | asking_price, list_price, τιμή, timi |
| `price_type` | `price_type` | `PriceType?` | no | pricing_type, price_unit |
| `address_street` | `address_street` | `String?` | no | street, address, διεύθυνση, diefthinsi |
| `address_city` | `address_city` | `String?` | no | city, town, πόλη |
| `address_state` | `address_state` | `String?` | no | state, prefecture, νομός |
| `address_zip` | `address_zip` | `String?` | no | zip, postcode |
| `municipality` | `municipality` | `String?` | no | dimos, δήμος |
| `area` | `area` | `String?` | no | neighborhood, district, περιοχή |
| `postal_code` | `postal_code` | `String?` | no | postcode, tk |
| `region` | `region` | `String?` | no | periferia, περιφέρεια |
| `regional_unit` | `regional_unit` | `String?` | no | periferiaki_enotita, county |
| `bedrooms` | `bedrooms` | `Int?` | no | beds, rooms, υπνοδωμάτια, ypnodomatio |
| `bathrooms` | `bathrooms` | `Float?` | no | baths, wc, μπάνια |
| `square_feet` | `square_feet` | `Decimal?` | no | sqft |
| `lot_size` | `lot_size` | `Float?` | no | land_size, plot |
| `year_built` | `year_built` | `Int?` | no | construction_year, etos_kataskevis |
| `floor` | `floor` | `String?` | no | level, storey, orofos |
| `floors_total` | `floors_total` | `Int?` | no | total_floors, num_floors |
| `size_net_sqm` | `size_net_sqm` | `Decimal?` | no | net_sqm, εμβαδόν_καθαρό, emvadon |
| `size_gross_sqm` | `size_gross_sqm` | `Decimal?` | no | gross_sqm, τετραγωνικά, tetragwnika |
| `plot_size_sqm` | `plot_size_sqm` | `Decimal?` | no | plot_sqm, oikopedo |
| `heating_type` | `heating_type` | `HeatingType?` | no | heating, thermansi |
| `energy_cert_class` | `energy_cert_class` | `EnergyCertClass?` | no | energy_class, pea |
| `condition` | `condition` | `PropertyCondition?` | no | property_condition, katastasi |
| `renovated_year` | `renovated_year` | `Int?` | no | renovation_year |
| `elevator` | `elevator` | `Boolean?` | no | lift, asanser |
| `furnished` | `furnished` | `FurnishedStatus?` | no | furnishing, epiplomeno |
| `building_permit_no` | `building_permit_no` | `String?` | no | permit_no, oikodomiki_adeia |
| `building_permit_year` | `building_permit_year` | `Int?` | no | permit_year |
| `land_registry_kaek` | `land_registry_kaek` | `String?` | no | kaek, ktimatologio |
| `land_registry_office` | `land_registry_office` | `String?` | no | ypothikofilakeio |
| `building_block_ot` | `building_block_ot` | `String?` | no | ot, oikodomiko_tetragono |
| `legalization_status` | `legalization_status` | `LegalizationStatus?` | no | legalization, taktopoiisi |
| `inside_city_plan` | `inside_city_plan` | `Boolean?` | no | city_plan, entos_schediou |
| `build_coefficient` | `build_coefficient` | `Decimal?` | no | syntelestis_domisis, sd |
| `coverage_ratio` | `coverage_ratio` | `Decimal?` | no | syntelestis_kalipsis, sk |
| `frontage_m` | `frontage_m` | `Decimal?` | no | frontage, prosopsi |
| `frontage_type` | `frontage_type` | `FrontageType?` | no | road_type |
| `objective_zone` | `objective_zone` | `String?` | no | zoni, antikeimenikh_zoni |
| `etaireia_diaxeirisis` | `etaireia_diaxeirisis` | `String?` | no | management_company |
| `monthly_common_charges` | `monthly_common_charges` | `Decimal?` | no | common_charges, koinoxrista |
| `available_from` | `available_from` | `DateTime?` | no | availability_date |
| `accepts_pets` | `accepts_pets` | `Boolean?` | no | pets_allowed, katikia_zoa |
| `min_lease_months` | `min_lease_months` | `Int?` | no | minimum_lease |
| `is_exclusive` | `is_exclusive` | `Boolean?` | no | exclusive, apokleistiki |
| `visibility` | `visibility` | `ItemVisibility` | no | portal_visibility, oratotita |
| `address_privacy_level` | `address_privacy_level` | `AddressPrivacyLevel?` | no | address_privacy |
| `description` | `description` | `String?` | no | desc, details, perigrafi |
| `primary_email` | `primary_email` | `String?` | no | email, contact_email, agent_email |

**Encrypted fields:** `primary_email` only (limited by design — addresses must remain searchable).

**Defaults on create:** `property_status: "ACTIVE"`, `visibility: "PRIVATE"`, `draft_status: false`

### 1.3 Mandate Fields (entity: `"mandate"`)

Fields owned by `Mandate` model. Prisma accessor: `prismadb.mandate`.

| Field key | Prisma column | Type | Triggers creation | Notable aliases |
|-----------|--------------|------|-------------------|----------------|
| `budget_min` | `budget_min` | `Decimal?` | YES | min_budget, ελάχιστο_budget |
| `budget_max` | `budget_max` | `Decimal?` | YES | max_budget, μέγιστο_budget |
| `mandate_transaction_type` | `transaction_type` | `TransactionType?` | YES | mandate_transaction, buyer_intent, αναζήτηση |
| `mandate_property_type` | `property_type` | `PropertyType?` | no | desired_type, typos_akinitiou |
| `property_purpose` | `property_purpose` | `PropertyPurpose?` | no | purpose, skopos |
| `mandate_status` | `status` | `MandateStatus?` | no | mandate_status |
| `urgency` | `urgency` | `MandateUrgency?` | no | priority, epeigousa |
| `timeline` | `timeline` | `Timeline?` | no | timeframe, chronodiagramma |
| `size_min_sqm` | `size_min_sqm` | `Decimal?` | no | min_size, min_sqm |
| `size_max_sqm` | `size_max_sqm` | `Decimal?` | no | max_size, max_sqm |
| `plot_size_min_sqm` | `plot_size_min_sqm` | `Decimal?` | no | min_plot |
| `plot_size_max_sqm` | `plot_size_max_sqm` | `Decimal?` | no | max_plot |
| `bedrooms_min` | `bedrooms_min` | `Int?` | no | min_bedrooms, min_beds |
| `bedrooms_max` | `bedrooms_max` | `Int?` | no | max_bedrooms, max_beds |
| `bathrooms_min` | `bathrooms_min` | `Int?` | no | min_bathrooms |
| `bathrooms_max` | `bathrooms_max` | `Int?` | no | max_bathrooms |
| `floor_min` | `floor_min` | `Int?` | no | min_floor |
| `floor_max` | `floor_max` | `Int?` | no | max_floor |
| `year_built_min` | `year_built_min` | `Int?` | no | min_year |
| `year_built_max` | `year_built_max` | `Int?` | no | max_year |
| `mandate_condition` | `condition` | `PropertyCondition[]` | no | desired_condition |
| `mandate_heating_type` | `heating_type` | `HeatingType[]` | no | desired_heating |
| `energy_cert_min` | `energy_cert_min` | `EnergyCertClass?` | no | energy_class, pea |
| `mandate_furnished` | `furnished` | `FurnishedStatus?` | no | desired_furnished |
| `ground_floor_only` | `ground_floor_only` | `Boolean` | no | isogeo |
| `mandate_elevator` | `elevator` | `Boolean?` | no | elevator_required |
| `parking` | `parking` | `Boolean?` | no | parking_required |
| `pets_allowed` | `pets_allowed` | `Boolean?` | no | pets, katoikidia |
| `mandate_inside_city_plan` | `inside_city_plan` | `Boolean?` | no | entos_schediou |
| `legalization_ok` | `legalization_ok` | `Boolean` | no | taktopoiisi_ok |
| `mandate_municipality` | `municipality` | `String?` | no | target_municipality, desired_dimos |
| `mandate_region` | `region` | `String?` | no | target_region, desired_perifereia |
| `areas_of_interest` | `areas_of_interest` | `String[]` | no | areas, perioxes, neighborhoods |
| `amenities` | `amenities` | `String[]` | no | paroxes, features, extras |
| `mandate_notes` | `notes` | `String?` | no | mandate_notes, σημειώσεις_εντολής |
| `expires_at` | `expires_at` | `DateTime?` | no | expiry, lixi |

**CRITICAL — Disambiguated field keys:** Fields that exist on both Property and Mandate models (e.g., `transaction_type`, `municipality`, `condition`, `elevator`, `furnished`, `inside_city_plan`, `heating_type`) are NAMESPACED with a `mandate_` prefix in the unified field definitions. Similarly, `description` on Client is namespaced as `client_description`. This prevents mapping collisions. Prefixes are stripped when building the Prisma data object.

### 1.4 Prefix Stripping Map

The unified engine must strip prefixes before passing data to entity-specific normalizers, Zod schemas, and `toPrismaData()` — all of which expect un-prefixed Prisma column names.

```ts
// Complete mapping: unified field key → Prisma column name
const PREFIX_STRIP_MAP: Record<string, string> = {
  // Mandate prefixed keys
  mandate_transaction_type: "transaction_type",
  mandate_property_type: "property_type",
  mandate_status: "status",
  mandate_condition: "condition",
  mandate_heating_type: "heating_type",
  mandate_furnished: "furnished",
  mandate_elevator: "elevator",
  mandate_inside_city_plan: "inside_city_plan",
  mandate_municipality: "municipality",
  mandate_region: "region",
  mandate_notes: "notes",
  // Client prefixed keys
  client_description: "description",
};

function stripEntityPrefix(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[PREFIX_STRIP_MAP[key] ?? key] = value;
  }
  return result;
}
```

This runs once per entity partition BEFORE `normalizeEnums()` and `safeParse()`.

**Encrypted fields:** `title` (auto-generated), `notes`

**Defaults on create:** `status: "DRAFT"`, `urgency: "MEDIUM"`, `visibility: "PRIVATE"`, `draft_status: false`
(Note: auto-generated mandates default to DRAFT — matching `mandateImportConfig.toPrismaData()` which uses `item.status || "DRAFT"`. Agents should review and activate manually.)

**Mandate has NO phone/email fields.** Any phone/email in the import MUST create or link to a Client.

---

## 2. Entity Detection Rules (MVP)

After column mapping is confirmed by the user, the engine examines each row to determine which entities to create. Detection is per-row, based on mapped field values.

### 2.1 Detection Triggers

```
For each row:
  hasClient   = client_name IS non-empty
             OR (primary_phone IS non-empty AND no client_name mapped in entire file)
             OR (primary_email IS non-empty AND no client_name mapped in entire file)

  hasProperty = property_name IS non-empty

  hasMandate  = ANY field with entity:"mandate" IS non-empty
                (uses isMandateFieldNonEmpty: !== null && !== undefined && !== "")
```

### 2.2 Client Auto-Name Generation

When `hasClient` is triggered by phone/email without `client_name`:
- If `primary_phone` present: `client_name = "Contact ({first4}...{last3})"` e.g. `"Contact (6944...456)"`
- If `primary_email` present: `client_name = "Contact ({email})"` e.g. `"Contact (nikos@gmail.com)"`
- If both: phone takes priority for the auto-name

### 2.3 Disambiguation (product spec §3.4.3)

The product spec's disambiguation rules map to our namespaced keys:
- `property_type`, `transaction_type`, `municipality`, `region` → **Property** (physical attributes)
- `mandate_property_type`, `mandate_transaction_type`, `mandate_municipality`, `mandate_region` → **Mandate** (search preferences)
- This is resolved at the field definition level, not at runtime. The user sees both options in the mapping dropdown, grouped by entity.

### 2.4 Mandate Budget Auto-Copy

When a mandate is created from a row that also has a property with `price`, AND the mandate has no explicit `budget_min`/`budget_max`:

```
if (hasProperty && hasMandate && property.price != null) {
  if (mandate.budget_min == null) mandate.budget_min = property.price;
  if (mandate.budget_max == null) mandate.budget_max = property.price;
}
```

---

## 3. Processing Order & Linking (MVP)

Per row, entities are created in this order: **Client → Property → Mandate → Links**

```
For each valid row:
  1. CLIENT (if hasClient)
     → Normalize enums via normalizeClientEnums()
     → Validate via clientImportSchema.safeParse()
     → Encrypt via clientImportConfig.encryptWithDek()
     → Generate friendlyId (prefix: clt-)
     → prismadb.clients.create()
     → Capture { clientUuid, clientFriendlyId }

  2. PROPERTY (if hasProperty)
     → Normalize enums via normalizePropertyEnums()
     → Validate via propertyImportSchema.safeParse()
     → Encrypt via propertyImportConfig.encryptWithDek()
     → Generate friendlyId (prefix: prp-)
     → prismadb.properties.create()
     → Capture { propertyUuid, propertyFriendlyId }

  3. MANDATE (if hasMandate)
     → Strip mandate_ prefix from namespaced keys (see §3.3)
     → Normalize enums via normalizeMandateEnums()
     → Auto-generate title and INJECT into row BEFORE validation (see §4)
       CRITICAL: mandateImportSchema requires title: z.string().min(1).
       If title is not injected before safeParse(), every auto-generated
       mandate fails validation. The title must be in the row object.
     → Auto-copy budget from property.price if applicable (see §2.4)
       Copy happens on the raw mandate row object before safeParse().
     → Validate via mandateImportSchema.safeParse()
     → Encrypt title + notes via mandateImportConfig.encryptWithDek()
     → Generate friendlyId (prefix: mnd-)
     → prismadb.mandate.create()
     → Capture { mandateUuid }

  4. LINKS (after all entities for this row exist)
     → If clientUuid AND propertyUuid:
        prismadb.client_Properties.create({ id: crypto.randomUUID(), clientId, propertyId })
        // CRITICAL: Client_Properties has @id with NO @default(uuid()) — must supply id
     → If mandateUuid AND clientUuid:
        prismadb.mandate_Clients.create({ mandateId, clientId })
     → If mandateUuid AND propertyUuid:
        prismadb.mandate_Properties.create({ mandateId, propertyId })

  ERROR HANDLING per row:
     Each step (1–4) is wrapped in try/catch. On failure:
     → The error is recorded with row number and step name
     → Subsequent steps for this row that DEPEND on the failed entity are SKIPPED
       (e.g., if client creation fails, Client_Properties and Mandate_Clients links are skipped)
     → Subsequent INDEPENDENT steps still execute
       (e.g., if client fails but property_name exists, property is still created)
     → The row's results track which entities succeeded/failed

  Dependency graph per row:
     Client ─────────→ Client_Properties ←── Property
                   └→ Mandate_Clients  ←── Mandate ──→ Mandate_Properties ←── Property

  Failure cascades:
     Client fails    → skip Client_Properties, skip Mandate_Clients (but Property + Mandate still created)
     Property fails  → skip Client_Properties, skip Mandate_Properties (but Client + Mandate still created)
     Mandate fails   → skip Mandate_Clients, skip Mandate_Properties (but Client + Property still linked)
     Link fails      → entity records are orphaned but valid; error logged; user can link manually
```

### 3.1 Junction Table Details

| Junction | Prisma accessor | FK columns | Auto-populate `id`? |
|----------|----------------|------------|---------------------|
| `Client_Properties` | `prismadb.client_Properties` | `clientId`, `propertyId` | YES — `@id` field, must supply `id: crypto.randomUUID()` |
| `Mandate_Properties` | `prismadb.mandate_Properties` | `mandateId`, `propertyId` | YES — `@id @default(uuid())`, do NOT supply id |
| `Mandate_Clients` | `prismadb.mandate_Clients` | `mandateId`, `clientId` | YES — `@id @default(uuid())`, do NOT supply id |

**IMPORTANT:** `Client_Properties.id` has `@id` but NO `@default(uuid())` — the engine MUST supply `id: crypto.randomUUID()`. The mandate junctions DO have `@default(uuid())`.

### 3.2 Within-File Client Deduplication (MVP)

For MVP, same-name clients within a file create ONE client record. The dedup key also considers phone and email to avoid colliding auto-generated names.

```ts
// Before processing rows, build a client dedup map
// Key: normalized composite key (name + phone + email) for precision
const clientMap = new Map<string, { uuid: string; friendlyId: string }>()

function clientDedupKey(row: Record<string, unknown>): string {
  // Use ALL available identifiers — not just name — to avoid false dedup.
  // Two rows with same auto-name "Contact (6944...456)" but different emails
  // are likely the same person (same phone). Two rows with same name but
  // different phones may be different people.
  const name = String(row.client_name ?? "").trim().toLowerCase();
  const phone = String(row.primary_phone ?? "").trim().replace(/\D/g, ""); // digits only
  const email = String(row.primary_email ?? "").trim().toLowerCase();

  // Priority: phone > email > name (phone is the strongest identifier)
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}

// For each row with hasClient:
const key = clientDedupKey(clientRow);
if (clientMap.has(key)) {
  // Reuse existing client UUID for linking
  clientUuid = clientMap.get(key)!.uuid;
} else {
  try {
    const record = await prismadb.clients.create(...);
    clientMap.set(key, { uuid: record.id, friendlyId });
    clientUuid = record.id;
  } catch (err) {
    // Client creation failed — record error, do NOT add to dedup map.
    // Later rows with the same key will retry creation (not reuse a
    // non-existent UUID). This prevents dedup map poisoning from failures.
    errors.push({ row: rowIndex + 2, field: "client", error: ... });
    clientUuid = null; // downstream links that depend on clientUuid are skipped
  }
}
```

This handles:
- **Common case:** An owner with 15 properties appears once in the client table, linked to all 15 properties
- **Auto-name case:** Two rows with `primary_phone: "6944123456"` but no `client_name` → same dedup key `phone:6944123456` → one client record
- **Different-phone same-name:** Two people both named "Γιώργος" with different phones → different dedup keys → two separate clients
- **Creation failure:** If client creation fails on row 3, the dedup map has no entry. Row 7 with the same phone retries creation rather than reusing a ghost UUID

---

## 4. Auto-Generated Mandate Titles

Priority order (per product spec §4):

```ts
// NOTE: mandateRow has ALREADY been prefix-stripped at this point (§1.4).
// So keys are un-prefixed: transaction_type, municipality, property_type, etc.
function generateMandateTitle(
  mandateRow: Record<string, unknown>,
  clientName: string | null,
  propertyName: string | null,
): string {
  // 1. If mandate has transaction_type, build from that
  const txType = mandateRow.transaction_type as string | null;
  const area = (mandateRow.municipality || mandateRow.region) as string | null;
  const propType = mandateRow.property_type as string | null;

  // Pattern: "[Transaction] [Type] [Area]" e.g. "Buy Apartment Glyfada"
  const txLabel = TX_LABELS[txType?.toUpperCase() ?? ""] ?? null;
  if (txLabel && propType) {
    return area ? `${txLabel} ${propType} ${area}` : `${txLabel} ${propType}`;
  }

  // 2. Derive from client name
  if (clientName) return `Mandate for ${clientName}`;

  // 3. Derive from property name
  if (propertyName) return `Mandate for ${propertyName}`;

  // 4. Fallback
  return "Mandate";
}

const TX_LABELS: Record<string, string> = {
  SALE: "Buy",          // mandate perspective: the client wants to BUY
  RENTAL: "Rent",       // the client wants to RENT
  SHORT_TERM: "Short-term",
  EXCHANGE: "Exchange",
  AUCTION: "Auction",
};
```

---

## 5. Existing Code Reuse Map

| Product spec concept | Existing code | Reuse strategy |
|---------------------|--------------|----------------|
| File parsing (CSV/XLSX/XML) | `components/import/UploadStep.tsx` | Reuse as-is |
| Column fuzzy matching | `lib/import/fuzzy-matcher.ts` | Reuse — feed it the unified field defs |
| Enum normalization | `lib/import/enum-normalizer.ts` | Reuse all 3 normalizers per entity |
| Confidence scoring | `fuzzy-matcher.ts:112` (`high ≥ 95`, `medium ≥ 75`, `low ≥ 50`) | Matches spec's 90/60/0 bands closely enough |
| Field encryption | `{client,property,mandate}ImportConfig.encryptWithDek()` | Reuse per-entity |
| FriendlyID generation | `lib/friendly-id.ts:generateFriendlyIds()` | Reuse — 3 calls per batch (one per entity type) |
| Zod validation schemas | `{client,property,mandate}ImportSchema` | Reuse — validate per-entity partition after row splitting |
| toPrismaData | `{client,property,mandate}ImportConfig.toPrismaData()` | Reuse — each config builds its entity's insert payload |
| Column mapping UI | `components/import/TableMappingStep.tsx` | Modify — add entity grouping to the dropdown |
| Validation UI | `components/import/ValidationStep.tsx` | Modify — show per-entity validation counts |
| Review UI | `components/import/ReviewStep.tsx` | Modify — show multi-entity preview |
| Complete UI | `components/import/CompleteStep.tsx` | Modify — show multi-entity results |

### 5.1 What's NEW (MVP)

| New file | Responsibility |
|----------|---------------|
| `lib/import/unified-engine.ts` | `executeUnifiedImport()` — partition, detect, create in order, link |
| `lib/import/unified-field-definitions.ts` | Merged field defs with `entity` tag from all 3 schemas |
| `lib/import/name-generator.ts` | `generateMandateTitle()`, `generateClientName()`, `generatePropertyName()` |
| `app/api/import/unified/route.ts` | Single API route replacing 3 entity-specific routes |
| `components/import/UnifiedImportWizard.tsx` | Wrapper component used by all 3 import pages |

### 5.2 What's MODIFIED (MVP)

| File | Change |
|------|--------|
| `components/import/ImportWizardSteps.tsx` | Passthrough schema, multi-entity `ImportResult`, relaxed `canProceed()` |
| `components/import/ReviewStep.tsx` | Show per-entity counts (clients, properties, mandates, links) |
| `components/import/CompleteStep.tsx` | Show per-entity results + link counts |
| `components/import/TableMappingStep.tsx` | Group fields by entity in dropdown (Client / Property / Mandate) |
| `app/[locale]/app/(routes)/mls/properties/import/components/PropertyImportWizard.tsx` | Replace with UnifiedImportWizard |
| `app/[locale]/app/(routes)/crm/clients/import/components/ClientImportWizard.tsx` | Replace with UnifiedImportWizard |
| `app/[locale]/app/(routes)/mandates/import/components/MandateImportWizard.tsx` | Replace with UnifiedImportWizard |
| `lib/import/index.ts` | Export new modules |

### 5.3 CRITICAL: Client-Side Validation Must NOT Strip Cross-Entity Fields

The current wizard runs `schema.safeParse(row)` client-side, which strips unknown fields. In the unified engine, each row has fields from 3 entities — any single-entity Zod schema strips 2/3 of the data.

**Solution: Use a passthrough schema for client-side validation.** Real per-entity Zod validation happens server-side after partitioning.

```ts
// Client-side schema for UnifiedImportWizard — validates row is usable, does NOT strip fields
const unifiedPassthroughSchema = z.record(z.unknown()).refine(
  (row) => {
    // At least one entity trigger must be satisfiable
    const hasClient = !!(row.client_name || row.primary_phone || row.primary_email);
    const hasProperty = !!row.property_name;
    const hasMandate = Object.entries(row).some(
      ([key, val]) => mandateFieldKeys.has(key) && val !== null && val !== undefined && val !== ""
    );
    return hasClient || hasProperty || hasMandate;
  },
  { message: "Row must contain data for at least one entity (client, property, or mandate)" }
);
```

This schema:
- Does NOT strip any fields — all cross-entity data survives to the API
- Validates that at least one entity can be created from the row
- Gives a meaningful error for completely empty rows

The `ImportWizardSteps` `schema` prop receives this passthrough schema. The `validateData()` function at line 256 uses it — `result.data` is the full row (no fields stripped). The `validData` array sent to the API contains all fields.

### 5.4 CRITICAL: canProceed() Must Not Require All Entity Triggers

The current `canProceed()` at the mapping step (line 352) requires ALL `required: true` fields to be mapped:

```ts
const requiredFields = fieldDefinitions.filter((f) => f.required);
return requiredFields.every((rf) => mappedFields.includes(rf.key));
```

In the unified context, the required fields are `client_name` (client), `property_name` (property). Mandate `title` is auto-generated and MUST NOT appear in the unified field definitions (see §5.5).

A valid unified import may have only `property_name` mapped (property-only CSV) or only `primary_phone` mapped (client-from-phone-only). The gate must check that at least one entity trigger is satisfiable:

```ts
// Replace the existing requiredFields check for the unified wizard:
const hasMappedClientTrigger = mappedFields.includes("client_name")
  || mappedFields.includes("primary_phone")
  || mappedFields.includes("primary_email");
const hasMappedPropertyTrigger = mappedFields.includes("property_name");
const hasMappedMandateTrigger = mappedFields.some((f) => mandateFieldKeys.has(f));
return hasMappedClientTrigger || hasMappedPropertyTrigger || hasMappedMandateTrigger;
```

### 5.5 Mandate `title` Field: Omit from Unified Field Definitions

The `mandateImportFieldDefinitions` has `{ key: "title", required: true }`. In the unified context, title is always auto-generated (§4). Including it in the unified field definitions would:
1. Show it in the mapping dropdown (confusing — user can't map to it)
2. `canProceed()` would require it to be mapped (blocking)

**Solution:** When building `unified-field-definitions.ts`, do NOT include the mandate `title` field definition. The title is injected by the engine before validation.

---

## 6. UnifiedImportResult Type

```ts
export interface UnifiedImportResult {
  clients: { created: number; reused: number; failed: number };
  properties: { created: number; failed: number };
  mandates: { created: number; failed: number };
  links: {
    clientProperty: number;
    mandateClient: number;
    mandateProperty: number;
  };
  skipped: number;
  errors: ImportError[];
}
```

### 6.1 Result Adapter for ImportWizardSteps

`ImportWizardSteps` and `CompleteStep` currently expect `ImportResult` (`{ imported, skipped, failed, errors }`). The `UnifiedImportWizard` must adapt the unified result:

```ts
function adaptResult(unified: UnifiedImportResult): ImportResult & UnifiedImportResult {
  return {
    // ImportResult compatibility (aggregate totals)
    imported: unified.clients.created + unified.clients.reused
      + unified.properties.created + unified.mandates.created,
    skipped: unified.skipped,
    failed: unified.clients.failed + unified.properties.failed + unified.mandates.failed,
    errors: unified.errors,
    // Pass through full unified result for per-entity display
    ...unified,
  };
}
```

The `CompleteStep` is modified to check for the presence of `clients`/`properties`/`mandates` keys and render per-entity stats when available, falling back to aggregate `imported/failed` for backward compatibility with standalone mandate imports.

---

## 7. Permission Gate

Both the API route and import pages must enforce `canCreate` permission:

```ts
// In app/api/import/unified/route.ts
const perms = await getUserPermissions(user.id, organizationId);
if (!perms.canCreate) {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
```

The permission system already defines `property:import` and `client:import` as distinct actions in `lib/permissions/action-permissions.ts`. VIEWER role has `canCreate: false`.

---

## 8. Product Spec Corrections

Issues found when mapping the product spec to the actual codebase:

| Spec reference | Issue | Correct value |
|---------------|-------|---------------|
| §3.4.1 `property.address` | No single `address` field | Split: `address_street`, `address_city`, `address_state`, `address_zip` |
| §3.4.1 `property.area_sqm` | Field doesn't exist | Use `size_net_sqm` (καθαρό) or `size_gross_sqm` (μικτό) |
| §3.4.1 `client.name` | Field is `client_name` | `client_name` (matches Prisma column) |
| §3.4.1 `client.phone` | Field is `primary_phone` | `primary_phone` (also `secondary_phone`, `office_phone`) |
| §3.4.1 `client.email` | Field is `primary_email` | `primary_email` (also `secondary_email`) |
| §3.5 Multi-client types | `Client_Properties` junction has no `relationship_type` column | Need to either: (a) add a `type` column to junction, or (b) use `client_type` field on the Client record. **MVP: use `client_type` on the Client.** Phase 4 can add junction type. |
| §3.8 Step 7 "single transactional batch" | Prisma `$transaction` with interactive queries has 5s default timeout | Use individual creates with per-row error tracking (matches existing engine pattern). Batch `createMany` where possible. |
| §4.1 Client name: "Kolonaki 3BR Apartment Owner" | Requires property to be created first | Processing order (Client → Property) means property doesn't exist yet when client is created. **Fix: create client with placeholder, update name after property is created.** Or: partition all entities first, generate names, then create in order. |
| §7 Import History | No `ImportJob` model in Prisma schema | **Deferred to Phase 3** — needs new Prisma model |
| §5 Template System | No `ImportTemplate` model in Prisma schema | **Deferred to Phase 3** — needs new Prisma model |
| §6 Batch Image Import | No image import infrastructure | **Deferred to Phase 4** |
| §3.3 Multi-tab XLSX | Current parser reads first worksheet only | **Deferred to Phase 2** — `UploadStep.tsx:67` uses `workbook.worksheets[0]` |

### 8.1 Client Name Generation Order Problem

The product spec says client names should reference the property (e.g., "Kolonaki 3BR Apartment Owner"). But the processing order is Client → Property → Mandate. The client is created BEFORE the property exists.

**MVP solution:** Two-pass approach:
1. First pass: create clients with a temporary name (`client_name` from CSV, or "Contact ({phone})")
2. Create properties
3. If a client was auto-generated from phone/email only (no explicit `client_name` column), UPDATE the client name using the now-known property data

This keeps the common case simple (explicit `client_name` in CSV → no update needed) and only does an extra UPDATE for the edge case.

---

## 9. Deferred Features — Architectural Stubs

These are NOT built in MVP but the architecture accommodates them:

### 9.1 ImportSource Interface (product spec §9.2)

```ts
interface ImportSource {
  type: "file" | "api" | "clipboard" | "ocr";
  parse(): Promise<{ headers: string[]; rows: Record<string, unknown>[]; tabs?: TabInfo[] }>;
}
```

MVP implements only `FileImportSource`. The unified engine accepts `{ headers, rows }` — it doesn't care where they came from.

### 9.2 ImportJob Model (Phase 3)

```prisma
model ImportJob {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  userId          String
  organizationId  String
  fileName        String
  templateId      String?
  status          ImportJobStatus @default(ACTIVE)
  clientsCreated  Int      @default(0)
  propertiesCreated Int    @default(0)
  mandatesCreated Int      @default(0)
  linksCreated    Int      @default(0)
  rowsFailed      Int      @default(0)
  metadata        Json?    // column mappings, entity counts, etc.

  @@index([organizationId])
  @@index([userId])
}

// Each created record tracks which import job created it
// Add to Properties, Clients, Mandate models:
// importJobId String?
```

### 9.3 ImportTemplate Model (Phase 3)

```prisma
model ImportTemplate {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  userId          String
  organizationId  String
  name            String
  description     String?
  isShared        Boolean  @default(false)
  mappings        Json     // { columnName → { entity, field } }
  metadata        Json?    // multi-client types, skipped columns, etc.

  @@index([organizationId])
  @@index([userId])
}
```

---

## 10. MVP Scope Summary

**What the showcase demonstrates:**
1. Agent uploads a single XLSX/CSV with mixed property + client + mandate data
2. System auto-classifies columns into entity groups (fuzzy matching with Greek support)
3. User confirms/adjusts mappings in a single UI grouped by entity
4. System shows "Will create: 47 Properties, 23 Clients, 12 Mandates, 47 Client↔Property links"
5. System creates all entities in correct order with encryption, friendlyIDs, and auto-generated mandate titles
6. Results show per-entity success/failure counts

**What is NOT in the showcase:**
- Multi-tab XLSX cross-tab analysis
- Against-database duplicate detection
- Within-file deduplication (except client name matching)
- Conflict resolution UI
- Import history / rollback
- Template system
- Batch image import
- SSE/WebSocket progress (uses existing batch progress bar)
- Encoding detection beyond UTF-8
- Multi-client column detection (owner + renter)
