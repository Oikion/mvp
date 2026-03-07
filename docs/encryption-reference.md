# Encryption Reference

> Single source of truth for Oikion's field-level encryption system.
> Last updated: 2026-03-05

## Quick Reference Table

All functions are in `lib/model-encryption.ts`. Use the **ForOrg** (async) variants — they fetch the per-org DEK automatically.

### Clients — 22 string fields + 1 JSON field

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `client_name` | string | `encryptClientForOrg` | `decryptClientForOrg` |
| `primary_email` | string | " | " |
| `secondary_email` | string | " | " |
| `primary_phone` | string | " | " |
| `secondary_phone` | string | " | " |
| `office_phone` | string | " | " |
| `fax` | string | " | " |
| `afm` | string | " | " |
| `vat` | string | " | " |
| `doy` | string | " | " |
| `id_doc` | string | " | " |
| `company_gemi` | string | " | " |
| `description` | string | " | " |
| `billing_street` | string | " | " |
| `billing_city` | string | " | " |
| `billing_state` | string | " | " |
| `billing_postal_code` | string | " | " |
| `billing_country` | string | " | " |
| `shipping_street` | string | " | " |
| `shipping_city` | string | " | " |
| `shipping_state` | string | " | " |
| `shipping_postal_code` | string | " | " |
| `communication_notes` | JSON | " | " |

### Calendar Events — 6 string fields

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `title` | string | `encryptCalendarEventForOrg` | `decryptCalendarEventForOrg` |
| `description` | string | " | " |
| `location` | string | " | " |
| `attendeeEmail` | string | " | " |
| `attendeeName` | string | " | " |
| `notes` | string | " | " |

### Documents — 2 string fields

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `document_name` | string | `encryptDocumentForOrg` | `decryptDocumentForOrg` |
| `description` | string | " | " |

### Properties — 1 string field + 1 JSON field (intentionally limited)

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `primary_email` | string | `encryptPropertyForOrg` | `decryptPropertyForOrg` |
| `communication_notes` | JSON | " | " |

> **Note:** `property_name`, `address`, `price`, etc. are intentionally NOT encrypted to preserve searchability and MLS portal publishing.

### Mandates — 2 string fields + 1 JSON field

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `title` | string | `encryptMandateForOrg` | `decryptMandateForOrg` |
| `notes` | string | " | " |
| `communication_notes` | JSON | " | " |

### Messages / Comments — 1 string field

| Field | Type | Encrypt | Decrypt |
|-------|------|---------|---------|
| `content` | string | `encryptMessageForOrg` | `decryptMessageForOrg` |

Aliases for specific comment types (all delegate to Message helpers):
- `encryptMandateCommentForOrg` / `decryptMandateCommentForOrg`
- `encryptPropertyCommentForOrg` / `decryptPropertyCommentForOrg`

---

## Read Path Checklist

Every location that reads encrypted data and its decryption status.

### Server Actions (Primary CRUD)

| Location | Model | Status |
|----------|-------|--------|
| `actions/crm/get-clients.ts` | Client | Decrypted |
| `actions/crm/get-client.ts` | Client | Decrypted |
| `actions/mls/get-properties.ts` | Property | Decrypted |
| `actions/mls/get-property.ts` | Property | Decrypted |
| `actions/calendar/get-events.ts` | CalendarEvent | Decrypted |
| `actions/messaging/get-messages.ts` | Message | Decrypted |

### Dashboard Widgets

| Location | Model(s) | Status |
|----------|----------|--------|
| `actions/dashboard/get-recent-clients.ts` | Client | Decrypted |
| `actions/dashboard/get-recent-documents.ts` | Document, Client | Decrypted |
| `actions/dashboard/get-upcoming-events.ts` | CalendarEvent, Client | Decrypted |
| `actions/dashboard/get-recent-properties.ts` | Property | N/A (no encrypted fields in select) |
| `actions/feed/get-recent-activities.ts` | Client, Property, Document, CalendarEvent | Decrypted |
| `actions/messaging/direct-messages.ts` | Message | Decrypted |

### Internal API Routes

| Location | Model | Status |
|----------|-------|--------|
| `app/api/crm/clients/[clientId]/route.ts` GET | Client | Decrypted |
| `app/api/crm/clients/[clientId]/route.ts` PUT | Client | N/A (write path) |
| `app/api/crm/clients/[clientId]/comments/route.ts` GET | Message | Decrypted |

### External API Routes (`/api/v1/*`)

| Location | Model | Status |
|----------|-------|--------|
| `app/api/v1/crm/clients/route.ts` GET | Client | Decrypted |
| `app/api/v1/crm/clients/[clientId]/route.ts` GET | Client | Decrypted |
| `app/api/v1/calendar/events/route.ts` GET | CalendarEvent, Client | Decrypted |
| `app/api/v1/documents/route.ts` GET | Document | Decrypted |
| `app/api/v1/mls/properties/route.ts` GET | Property | N/A (no encrypted fields in select) |
| `app/api/v1/mls/properties/[propertyId]/route.ts` GET | Property | N/A (no encrypted fields in select) |

### Export Routes

| Location | Model | Status |
|----------|-------|--------|
| `app/api/export/crm/route.ts` | Client | Decrypted |
| `app/api/export/calendar/route.ts` | CalendarEvent | Decrypted |
| `app/api/export/mls/route.ts` | Property | N/A (no encrypted fields in select) |
| `lib/data-export/processor.ts` | All models | Decrypted |

### Search

| Location | Model | Status |
|----------|-------|--------|
| `lib/search/entity-search.ts` — `searchClients` | Client | Decrypted (post-query) |
| `lib/search/entity-search.ts` — `searchDocuments` | Document | Decrypted (post-query) |
| `lib/search/entity-search.ts` — `searchEvents` | CalendarEvent | Decrypted (post-query) |
| `lib/search/entity-search.ts` — `searchProperties` | Property | N/A (no encrypted fields in select) |

> **Search caveat:** Prisma `contains`/`startsWith` queries on encrypted columns search the ciphertext, not plaintext. Full-text search on encrypted fields requires a separate indexing strategy (not yet implemented).

---

## Developer Guide

### Adding a new read path

When you write new code that reads from the database and returns data to the UI or an API consumer:

1. **Check this table** — does your `select` clause include any encrypted field?
2. **Import the decrypt function** from `@/lib/model-encryption`
3. **Call it after the query, before returning data:**
   ```typescript
   import { decryptClientForOrg } from "@/lib/model-encryption";

   // Single record
   const client = await prismadb.clients.findFirst({ where: { ... } });
   const decrypted = await decryptClientForOrg(client, organizationId);

   // Array of records
   const clients = await prismadb.clients.findMany({ where: { ... } });
   const decrypted = await Promise.all(
     clients.map(c => decryptClientForOrg(c, organizationId))
   );
   ```
4. **Use the decrypted version** in your response/mapping — not the original query result
5. **Update this checklist** with the new path

### Adding a new write path

1. **Import the encrypt function** from `@/lib/model-encryption`
2. **Call it before the Prisma write:**
   ```typescript
   import { encryptClientForOrg } from "@/lib/model-encryption";

   const encrypted = await encryptClientForOrg(data, organizationId);
   await prismadb.clients.create({ data: encrypted });
   ```
3. Encryption is **idempotent** — calling encrypt on already-encrypted data is safe (the `isEncrypted()` guard prevents double encryption)

### Common pitfalls

| Pitfall | Solution |
|---------|----------|
| Forgetting to decrypt in a new API route | Always check encrypted field lists before shipping a new read path |
| Using `client.field` instead of `decrypted.field` after decryption | Assign to a new variable (`const decrypted = ...`) and use only that |
| Trying to search encrypted columns with `contains` | Prisma search on ciphertext won't match. Decrypt results post-query or build a search index |
| Passing wrong `orgId` | Always use the org from auth context, never from user input |
| Not handling `null` / `undefined` | The decrypt functions handle `null`/`undefined` gracefully — no need to guard |
| Properties: encrypting `property_name` | `property_name` is intentionally NOT encrypted (searchability + MLS portals) |

---

## Architecture

### Envelope Encryption (DEK/KEK)

```
┌─────────────────────────────────────────┐
│  Master Key (KEK)                       │
│  AES-256, stored in env (ENCRYPTION_KEY)│
│  Wraps/unwraps per-org DEKs             │
└──────────────┬──────────────────────────┘
               │ wraps
               ▼
┌─────────────────────────────────────────┐
│  Per-Org DEK (Data Encryption Key)      │
│  AES-256, stored encrypted in DB        │
│  (OrganizationKey table)                │
│  One per organization                   │
└──────────────┬──────────────────────────┘
               │ encrypts
               ▼
┌─────────────────────────────────────────┐
│  Field-Level Ciphertext                 │
│  Format: iv:authTag:ciphertext          │
│  (colon-separated hex strings)          │
│  AES-256-GCM                            │
└─────────────────────────────────────────┘
```

### Key files

| File | Purpose |
|------|---------|
| `lib/encryption.ts` | Low-level AES-256-GCM encrypt/decrypt with master key |
| `lib/key-management.ts` | DEK lifecycle: generate, wrap, unwrap, cache `getOrgDek(orgId)` |
| `lib/model-encryption.ts` | Typed per-model encrypt/decrypt helpers (this doc's source of truth) |
| `lib/crypto/field-handlers.ts` | Separate client-side E2EE system (passphrase-based, `e2ee:v1:` prefix) |

### Encrypted value format

- **Server-side (DEK):** `iv:authTag:ciphertext` — three colon-separated hex strings
- **Client-side E2EE:** `e2ee:v1:<base64>` — distinct prefix, separate system
- Detection: `isEncrypted(value)` checks for `iv:auth:ct` hex format

### Sync vs ForOrg functions

| Variant | Key Source | Use Case |
|---------|-----------|----------|
| `encryptClient(data)` | Master key from env | Legacy / scripts |
| `encryptClientForOrg(data, orgId)` | Per-org DEK via `getOrgDek()` | **All production code** |

Always use the `ForOrg` variants in application code.
