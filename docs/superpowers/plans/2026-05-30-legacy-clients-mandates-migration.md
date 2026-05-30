# Legacy Clients→Contacts + Mandates→Requests Migration — Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the half-done clients→contacts and mandates→requests migration: eliminate all dead-model references (`prismadb.clients`, `prismadb.client_Contacts`) that crash at runtime, delete the dead legacy UI, drop orphan enums, and align validation/nav/i18n — leaving a single canonical `Contact`/`Request` entity model.

**Architecture:** The Prisma schema already canonicalised on `Contact` (table `contacts`) and `Request` — the `clients`, `mandates`, and `client_Contacts` *models* were deleted, but ~42 code references to them remain and throw `Unknown model` at runtime. A parallel `/app/requests` UI is fully built; `/app/mandates` and `/crm/clients` are dead duplicates. We fix the runtime crashes first (build-green at every stage), repoint the 2 live import edges, delete the dead UI, then do the schema/validation/i18n cleanup (the enum drop requires a user-run Prisma migration).

**Tech Stack:** Next.js 16, Prisma 7 (`prismadb` named export from `@/lib/prisma`), Clerk v6, next-intl. Verification per stage: `npx tsc --noEmit -p tsconfig.json` (must stay at 0 errors) + `npx eslint <changed files>` + a `pnpm build` at the end of Stage 3 and Stage 5.

---

## Field Mapping Reference (legacy `clients` → `Contact`)

| Legacy `clients` field | `Contact` field | Notes |
|---|---|---|
| `client_name` | `displayName` | encrypted, required |
| `primary_email` | `email` | |
| `primary_phone` | `primaryPhone` | |
| `assigned_to` | `assignedAgentId` | FK→Users, `onDelete: SetNull` |
| `client_status` | `status` (`ContactStatus`) | |
| `client_type` (single) | `category` (`ContactCategory[]`, multi) | paradigm change — see Stage 4 |
| `watchers` | `watchers` (`String[]`) | exists on Contact (schema:3622) |
| `organizationId`, `id` | same | |

Relation names (used in `include`/`select`) that no longer exist and must be replaced:
`Users_Clients_assigned_toToUsers` → `assignedAgent`; `Client_Contacts` → (Contact is the contact — remove); `Client_Properties` → `linkedProperties` (`ContactProperty`).

`client_Contacts` model (old "contacts of a client") is fully subsumed by `Contact`.

---

## Pre-flight

- [ ] **Step 1: Confirm clean baseline**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"`
Expected: `0` (baseline is currently green; every stage must keep it 0).

- [ ] **Step 2: Branch check**

Run: `git branch --show-current`
Expected: `stage` (work here; do NOT commit to `main`).

---

## Stage 1 — Fix dead-model runtime crashes (build-preserving, no deletion)

These files reference the deleted `clients`/`client_Contacts` models and crash when hit. Swap to `prismadb.contact` with the field mapping above.

### Task 1.1: GDPR `delete-account` handler (HIGHEST priority — orphans data)

**Files:** Modify `app/api/user/[userId]/delete-account/route.ts` (lines 89, 128, 135)

- [ ] **Step 1:** Replace the org-deletion clients purge (line ~89):

```ts
// BEFORE
await prismadb.clients.deleteMany({ where: { organizationId: orgIdString } });
// AFTER
await prismadb.contact.deleteMany({ where: { organizationId: orgIdString } });
```

- [ ] **Step 2:** Replace the two "personal data" deletes (lines ~128 and ~135) with a single Contact delete. The old code deleted both `clients` and `client_Contacts` assigned to the user; both are now `Contact`:

```ts
// BEFORE (two separate calls)
await prismadb.clients.deleteMany({ where: { assigned_to: currentUser.id } });
// ...
await prismadb.client_Contacts.deleteMany({ where: { assigned_to: currentUser.id } });
// AFTER (one call)
await prismadb.contact.deleteMany({ where: { assignedAgentId: currentUser.id } });
```

> **DECISION POINT (flag to user):** Phase A established "org data stays with the org; `assigned_to` becomes `SetNull` on departure." Deleting contacts merely *assigned* to a departing user destroys org data and contradicts that principle. The faithful migration above preserves the *existing* behaviour. RECOMMENDED follow-up: drop this delete entirely and let `assignedAgent onDelete: SetNull` null the reference (org keeps the contact). Do not change behaviour silently — confirm with the user.

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"` → `0`; `npx eslint "app/api/user/[userId]/delete-account/route.ts"` → no errors.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint GDPR delete-account to Contact model"`

### Task 1.2: Fulltext search

**Files:** Modify `actions/fulltext/get-search-results.ts` (lines 29-41)

- [ ] **Step 1:** Swap model + fields:

```ts
// BEFORE
prismadb.clients.findMany({
  where: { organizationId, OR: [
    { client_name: { contains: query, mode: "insensitive" } },
    { primary_email: { contains: query, mode: "insensitive" } },
  ] },
  select: { id: true, client_name: true, primary_email: true },
})
// AFTER
prismadb.contact.findMany({
  where: { organizationId, OR: [
    { displayName: { contains: query, mode: "insensitive" } },
    { email: { contains: query, mode: "insensitive" } },
  ] },
  select: { id: true, displayName: true, email: true },
})
```

- [ ] **Step 2:** Update the result mapping that reads `.client_name`/`.primary_email` on these rows → `.displayName`/`.email` (grep the function body for both names and fix downstream usage).
- [ ] **Step 3: Verify** — tsc `0` + eslint clean.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint global search to Contact model"`

### Task 1.3: Share-via-email

**Files:** Modify `actions/social/share-via-email.ts` (lines 77-98)

- [ ] **Step 1:** Swap model + fields:

```ts
// BEFORE
const client = await prismadb.clients.findFirst({
  where: { id, organizationId },
  select: { id: true, client_name: true, primary_email: true },
});
// ... title: client.client_name
// AFTER
const client = await prismadb.contact.findFirst({
  where: { id, organizationId },
  select: { id: true, displayName: true, email: true },
});
// ... title: client.displayName
```

- [ ] **Step 2:** Fix the `client.client_name` / `client.primary_email` reads downstream → `displayName`/`email`.
- [ ] **Step 3: Verify** — tsc `0` + eslint clean.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint share-via-email to Contact model"`

### Task 1.4: External API `/api/v1/documents` (ownedClients validation)

**Files:** Modify `app/api/v1/documents/route.ts` (line 152)

- [ ] **Step 1:** Swap model (fields `id`/`organizationId` unchanged):

```ts
// BEFORE
const ownedClients = await prismadb.clients.findMany({
  where: { id: { in: clientIds }, organizationId: context.organizationId },
  select: { id: true },
});
// AFTER
const ownedClients = await prismadb.contact.findMany({
  where: { id: { in: clientIds }, organizationId: context.organizationId },
  select: { id: true },
});
```

- [ ] **Step 2:** Verify the relation connect on line ~194 (`Clients: { connect: ... }`) matches the Documents↔Contacts relation name. The `Documents` model relates to `Contact` via `@relation("DocumentsToContacts")`; confirm the field name on `Documents` (likely `Contacts`) and update if the create uses the old `Clients` relation.
- [ ] **Step 3: Verify** — tsc `0`.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint v1/documents contact validation to Contact model"`

### Task 1.5: Account watch / unwatch / task routes

**Files:** Modify `app/api/crm/account/[accountId]/watch/route.ts`, `.../unwatch/route.ts`, `.../task/create/route.ts`

- [ ] **Step 1:** In each, replace `prismadb.clients` with `prismadb.contact`. `Contact.watchers` (`String[]`) exists, so the watch/unwatch logic is a pure model swap:

```ts
// BEFORE
const client = await prismadb.clients.findFirst({ where: { id: accountId, organizationId }, select: { watchers: true } });
await prismadb.clients.update({ where: { id: accountId }, data: { watchers: [...] } });
// AFTER
const client = await prismadb.contact.findFirst({ where: { id: accountId, organizationId }, select: { watchers: true } });
await prismadb.contact.update({ where: { id: accountId }, data: { watchers: [...] } });
```

- [ ] **Step 2:** In `task/create/route.ts`, `prismadb.clients.findUnique(... name ...)` → `prismadb.contact.findUnique({ where: { id }, select: { displayName: true } })` and use `displayName` where `name` was read.
- [ ] **Step 3: Verify** — tsc `0`.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint account watch/unwatch/task routes to Contact model"`

### Task 1.6: Shared-client actions (dead relation names)

**Files:** Modify `actions/crm/get-shared-client.ts`, `actions/crm/get-shared-clients.ts`

- [ ] **Step 1:** These already call `prismadb.contact` but `include`/`select` legacy relation names. Replace `Users_Clients_assigned_toToUsers` → `assignedAgent`, `Client_Contacts` → (remove), `Client_Properties` → `linkedProperties`; map selected scalar fields (`client_name`→`displayName`, `primary_email`→`email`, `primary_phone`→`primaryPhone`, `client_status`→`status`).
- [ ] **Step 2:** Fix downstream consumers that read the old field/relation names on the returned object.
- [ ] **Step 3: Verify** — tsc `0` + eslint clean.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint shared-client actions to Contact relations"`

---

## Stage 1b — Additional dead-ref files (discovered via grep verification — the mapping workflow undercounted)

A full-codebase grep after Stage 1 found **7 more production files** referencing the deleted `clients`/`client_Contacts` models. Classification + correct handling:

**MIGRATE — live, but each has a non-trivial wrinkle:**
- [ ] `app/api/crm/clients/route.ts` (470 lines, `@ts-nocheck`) — **LIVE** (called by `QuickAddClient.tsx`, `CreateDealButton.tsx` GET, `NewPropertyForm.tsx` GET). Full CRUD on `prismadb.clients` with **encryption** (`encryptClientForOrg`). MUST migrate to `prismadb.contact` with full field mapping + switch to `encryptContactForOrg`. Alternatively repoint the 3 callers to the canonical `/api/crm/contacts` route (shapes differ — verify). Do this as its own carefully-reviewed task; it is the largest single piece.
- [ ] `app/api/crm/contacts/create-from-remote/route.ts` (n8n webhook, LIVE) — `prismadb.client_Contacts.create` with **plaintext** fields. Migrate to `prismadb.contact.create` and **encrypt via `encryptContactForOrg`** (else PII is stored plaintext). Map: `name/surname`→`firstName/lastName`+`displayName` (required), `mobile_phone`→`primaryPhone`, `type:"Prospect"`→`category:["OTHER"]` + `status:"LEAD"`, `notes` array→single string.
- [ ] `actions/crm/contact-notes.ts` (+ its consumer `ContactNotesCard.tsx`) — operates on a `notes: string[]` array; `Contact.notes` is a single encrypted `String?`. **Data-model mismatch** — notes-as-list belongs in `ContactComment`. Requires a small design decision + rewriting BOTH the action and the card. Not a mechanical swap.

**DELETE — confirmed zero importers (fold into Stage 3):**
- [ ] `app/api/crm/client-contacts/route.ts` — no callers.
- [ ] `actions/crm/get-contact.ts` (legacy; canonical is `actions/contacts/get-contact.ts`) — no importers.
- [ ] `actions/dashboard/get-contacts-count.ts`, `actions/dashboard/get-contacts-trend.ts` — no importers.

**Scripts (8, deferred — not in build/runtime path):** `seed-*`, `migrate-to-org-dek`, `encrypt-existing-data`, `verify-demo-data`, `complete-demo-report`, `purge-database`, `enhance-demo-data` reference `prismadb.clients`. Migrate or delete in a cleanup pass; they do not affect the app build.

> **Lesson captured:** always run `grep -rnE "prismadb\.(clients|client_Contacts)\b" actions app lib` as the source of truth — the agent mapping missed `client_Contacts` entirely and mis-classified the live `/api/crm/clients` route as dead.

---

## Stage 1c — `app/api/crm/clients/route.ts` adapter migration (TURNKEY — all decisions locked)

This 470-line `@ts-nocheck` route is the last dead-ref crash. It's LIVE: `QuickAddClient` (5 render sites) POSTs to it; `CreateDealButton` + `NewPropertyForm` GET it. **Strategy: keep its legacy-shaped request/response contract** (so the 7 consumers need no changes) and make it a **compatibility adapter** over the `Contact` model — mirroring the existing `update-client.ts` shim pattern. This fixes the crash with minimal blast radius and defers the `crm.ts`/enum-drop work to Stage 4/5.

⚠️ tsc CANNOT verify this file (`@ts-nocheck`) — verify by reading + a manual QuickAddClient/deal/property smoke test.

**Decided enum maps (from product decisions 2026-05-31):**
```ts
const CLIENT_TYPE_TO_CATEGORY = { BUYER:"BUYER", SELLER:"SELLER", RENTER:"TENANT", INVESTOR:"INVESTOR", REFERRAL_PARTNER:"BROKER" } as const;
const CLIENT_STATUS_TO_CONTACT = { LEAD:"LEAD", ACTIVE:"ACTIVE", INACTIVE:"INACTIVE", CONVERTED:"ACTIVE", LOST:"INACTIVE" } as const;
const LEAD_SOURCE_TO_CONTACT  = { REFERRAL:"REFERRAL", WEB:"WEB", PORTAL:"PORTAL_LEAD", WALK_IN:"WALK_IN", SOCIAL:"SOCIAL_MEDIA" } as const;
```

**Field map (legacy → Contact) for POST/PUT `data`:** `client_name`→`displayName` (required; fall back to `full_name`/`company_name`), `primary_email`→`email`, `secondary_email`→`secondaryEmail`, `primary_phone`→`primaryPhone`, `secondary_phone`→`secondaryPhone`, `office_phone`→`officePhone`, `company_name`→`companyName`, `person_type`→`isCompany` (=== company-type), `language`→`languagePreference` (same `Language` enum), `afm`→`taxId`, `doy`→`doy`, `vat`→`vatNumber`, `company_gemi`→`companyGemi`, `company_id`→`companyId`, `id_doc`→`idDocument`, `gdpr_consent`→`gdprConsentGiven`, `allow_marketing`→`allowMarketing`, `communication_notes`→`communicationNotes`, `description`→`notes`, `assigned_to`→`assignedAgentId`, `client_type`→`category: [CLIENT_TYPE_TO_CATEGORY[client_type] ?? "OTHER"]`, `client_status`→`status: CLIENT_STATUS_TO_CONTACT[client_status] ?? "LEAD"`, `lead_source`→`source: LEAD_SOURCE_TO_CONTACT[lead_source]`.
- **Addresses:** build `addresses: [{type:"billing", street:billing_street, city:billing_city, state:billing_state, postalCode:billing_postal_code, country:billing_country}, {type:"shipping", ...}]` (drop entries where all parts null). `addresses` is freeform `Json?` — key names are flexible.
- **DROP (no Contact equivalent):** `website`, `fax`, `channels`, `draft_status`, `member_of`, `full_name` (after using it as displayName fallback). Note the drop in the commit message.
- Wrap the mapped object in `encryptContactForOrg(mapped, organizationId)` exactly as today, then `prismadb.contact.create`/`update`.
- Fix the 4 `.client_name` reads on `newClient`/`updatedClient` (notify + webhook calls) → `.displayName`.
- `existingClient.assigned_to` → `existingClient.assignedAgentId`.

**GET handler:**
- minimal mode: `select: { id:true, displayName:true }`, `orderBy:{ displayName:"asc" }`, then map → `items: rows.map(r => ({ id:r.id, client_name: r.displayName }))` (preserve legacy field name). **Decrypt** `displayName` first (`decryptContactForOrg` per row, or batch) — today the route does NOT decrypt, which would show ciphertext; add decryption.
- full mode: `where` remap (`client_status`→`status`, search `client_name`/`primary_email`→`displayName`/`email`); **remove dead includes** `Client_Contacts` and `Users_Clients_assigned_toToUsers` (use `assignedAgent: { select: { name:true } }` if a name is needed; drop the sub-contacts include); decrypt each row (`decryptContactForOrg`); map back to legacy keys consumers read (`client_name`, `primary_email`, `client_status`, `assigned_to`). Keep the `{ items, nextCursor, hasMore }` envelope unchanged.

**After:** `grep -rnE "prismadb\.(clients|client_Contacts)\b" actions app lib --include="*.ts"` (excl scripts) → 0. Smoke-test QuickAddClient, deal creation, property owner dropdown.

---

## Stage 2 — Repoint live mandate import edges (BLOCKING before Stage 3 deletion)

Two LIVE components import `QuickAddMandate` (which calls non-existent `/api/mandates` → 404). `QuickAddRequest` exists at `app/[locale]/app/(routes)/requests/components/QuickAddRequest.tsx` with props `{ open, onOpenChange, organizationUsers: any[], onContinueToFull?: () => void }` — **different from QuickAddMandate**, so adapt props, don't just rename.

**Files:** Modify `components/FloatingQuickAddButtons.tsx`, `components/calendar/EventCreateForm.tsx`

- [ ] **Step 1:** In each file, replace the import:

```ts
// BEFORE
import QuickAddMandate from "@/app/[locale]/app/(routes)/mandates/components/QuickAddMandate";
// AFTER
import QuickAddRequest from "@/app/[locale]/app/(routes)/requests/components/QuickAddRequest";
```

- [ ] **Step 2:** Replace the JSX usage `<QuickAddMandate .../>` with `<QuickAddRequest open={...} onOpenChange={...} organizationUsers={...} />`. Read the existing `<QuickAddMandate>` props at each call site and map them; `QuickAddRequest` needs `organizationUsers` (source it the same way the requests page does — check `RequestsPageView.tsx`).
- [ ] **Step 3: Verify** — `npx tsc --noEmit` → `0`; `npx eslint components/FloatingQuickAddButtons.tsx components/calendar/EventCreateForm.tsx` → clean.
- [ ] **Step 4: Commit** — `git commit -m "fix(migration): repoint quick-add mandate edges to QuickAddRequest"`

---

## Stage 3 — Delete dead legacy UI (only after Stage 2 is green)

The live CRM page is `/app/crm` (renders `ClientsPageView` via canonical `getAllCrmData()`); `/crm/clients/**` and `/app/mandates/**` are dead duplicates (mandate pages just redirect to `/requests`).

- [ ] **Step 1: Prove no live imports remain** —

Run: `grep -rn "from \"@/app/\[locale\]/app/(routes)/mandates\|from \"@/app/\[locale\]/app/(routes)/crm/clients" app components --include="*.tsx" --include="*.ts" | grep -vE "/(mandates|crm/clients)/"`
Expected: no output (nothing OUTSIDE those folders imports them). If any line prints, repoint it first.

- [ ] **Step 2: Delete the folders + orphans:**

```bash
git rm -r "app/[locale]/app/(routes)/mandates"
git rm -r "app/[locale]/app/(routes)/crm/clients"
git rm "app/[locale]/app/(routes)/crm/accounts/table-components/ClientFilterDrawer.tsx" \
       "app/[locale]/app/(routes)/crm/accounts/table-components/ClientRowActions.tsx" \
       "app/[locale]/app/(routes)/matchmaking/components/MandateMatchesTab.tsx"
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → `0`; then `pnpm build` (or `next build`) must complete. If tsc reports a missing import, a still-live reference existed — restore that one file and repoint its importer, then retry.
- [ ] **Step 4: Commit** — `git commit -m "chore(migration): delete dead mandate + clients UI folders"`

---

## Stage 4 — Validation schema alignment

**Files:** Modify `lib/validations/crm.ts`, `lib/validations/mandates.ts`, `lib/validations/status-transitions.ts`, `tests/business-rules/crm-validation.test.ts`

- [ ] **Step 1:** `lib/validations/crm.ts` — `import { ClientStatus }` → `import { ContactStatus }`; replace `z.nativeEnum(ClientStatus)` → `z.nativeEnum(ContactStatus)`. For `ClientType` (single) → `ContactCategory` (array): change the field to `z.array(z.nativeEnum(ContactCategory))`. Update any UI/form consuming a single client_type to handle the multi-select array (grep callers).
- [ ] **Step 2:** `lib/validations/status-transitions.ts` — `ClientStatus` → `ContactStatus`; rename `CLIENT_STATUS_TRANSITIONS` → `CONTACT_STATUS_TRANSITIONS` and update callers.
- [ ] **Step 3:** `lib/validations/mandates.ts` — migrate `MandateStatus`/`MandateUrgency` → `RequestStatus`/`RequestUrgency`, OR delete the file if `lib/validations/requests.ts` already covers it (grep importers first; if none, `git rm`).
- [ ] **Step 4:** Update `tests/business-rules/crm-validation.test.ts` imports + fixtures to Contact field names; run `pnpm test -- crm-validation`.
- [ ] **Step 5: Verify** — tsc `0`; targeted test passes.
- [ ] **Step 6: Commit** — `git commit -m "refactor(migration): align validation schemas to Contact/Request enums"`

---

## Stage 5 — Drop orphan enums (REQUIRES a user-run Prisma migration)

`ClientStatus`, `ClientType`, `MandateStatus`, `MandateUrgency` are defined but unused by any model field. **KEEP `MandateType`** — it is used on `Properties.mandateType` (supply-side). Only proceed after Stage 4 (no code imports the dropped enums).

- [ ] **Step 1:** Confirm zero remaining imports — `grep -rnE "ClientStatus|ClientType|MandateStatus|MandateUrgency" lib app actions --include="*.ts" --include="*.tsx"` → no output.
- [ ] **Step 2:** Remove the four enum blocks from `prisma/schema.prisma` (lines ~1299-1313 for ClientStatus/ClientType, ~1632-1645 for MandateStatus/MandateUrgency). Leave `MandateType` (line ~4131) intact.
- [ ] **Step 3: HAND OFF to user (do NOT run migrations yourself — per prisma/CLAUDE.md):**
  Tell the user to run, in order:
  1. `pnpm prisma generate`
  2. `pnpm db:migrate` (dev) — name it `drop_legacy_client_mandate_enums`. Note: dropping a PostgreSQL enum is non-transactional; ensure no active connections.
  3. `pnpm db:deploy` when promoting to production.
- [ ] **Step 4:** After the user confirms generate succeeded, `npx tsc --noEmit` → `0`.
- [ ] **Step 5: Commit** — `git commit -m "chore(schema): drop unused Client/Mandate status enums (keep MandateType)"` (include the generated migration folder).

---

## Stage 6 — Navigation labels + i18n cleanup

**Files:** Modify `config/navigation.tsx`, `i18n.ts`, `app/[locale]/layout.tsx`, `lib/dictionaries.ts` (if present); delete `locales/en/mandates.json`, `locales/el/mandates.json`

- [ ] **Step 1:** In `config/navigation.tsx`, ensure the Requests entry routes to `/app/requests` and is labelled via the requests/contacts namespace (not "Mandates"); remove the dead `/app/mandates` `isRouteActive` branch.
- [ ] **Step 2:** Remove `mandates.json` imports/registrations from `i18n.ts`, `app/[locale]/layout.tsx`, and `lib/dictionaries.ts` (per the dual-registration rule — both files). Then `git rm locales/en/mandates.json locales/el/mandates.json`.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` → `0`; load `/app` in dev to confirm nav renders and no missing-namespace error.
- [ ] **Step 4: Commit** — `git commit -m "chore(migration): clean mandate nav labels + remove dead i18n namespace"`

---

## Stage 7 — Cosmetic renames (OPTIONAL, lowest priority)

Working shims/components retain "Client" naming but operate on Contacts. Rename for clarity only if desired:
`ClientsPageView`→`ContactsPageView`, `PropertyMatchingClients`→`PropertyMatchingRequests`, `UnmatchedClientsList`→`UnmatchedRequestsList`, the `get-client*.ts`/`update-client.ts` shims → `*-contact.ts`. Each rename is its own commit; update all importers; tsc `0` after each.

---

## Risks

- **Build is non-hermetic:** `pnpm build` runs `prisma migrate deploy` against the DB. Use `npx tsc --noEmit` for fast per-task verification; reserve full `pnpm build` for Stage 3 and Stage 5 ends.
- **Data semantics (Task 1.1):** the delete-account "delete assigned contacts" behaviour conflicts with Phase A's data-ownership model — flagged as a decision point.
- **Prop shape mismatch (Stage 2):** `QuickAddRequest` ≠ `QuickAddMandate` props — adapt call sites, don't rename.
- **Enum drop (Stage 5):** non-transactional Postgres `DROP TYPE`; must be a real migration, user-run, no active connections.
- **`ClientType`→`ContactCategory[]` (Stage 4):** single→multi paradigm change; any UI assuming a single value must adapt.
- **Live `/app/crm` uses `ClientsPageView`:** do NOT delete `ClientsPageView` in Stage 3 (it's the live page under a legacy name) — only the `/crm/clients/**` route folder.

## Verification (final)

- [ ] `npx tsc --noEmit -p tsconfig.json` → 0 errors
- [ ] `pnpm lint` → clean
- [ ] `pnpm build` → succeeds (after user runs the Stage 5 migration)
- [ ] `grep -rn "prismadb\.\(clients\|client_Contacts\|mandates\)\b" actions app lib --include="*.ts"` → no output
- [ ] `grep -rln "QuickAddMandate\|/routes)/mandates\|/routes)/crm/clients" app components` → no output
