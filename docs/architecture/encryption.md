# Encryption

> Source of truth for Oikion's field-level encryption system.
> Key files: `lib/encryption.ts`, `lib/key-management.ts`, `lib/model-encryption.ts`

## Architecture: Envelope Encryption (DEK/KEK)

```
Master Key (KEK)
AES-256, stored in env (ENCRYPTION_KEY)
Wraps/unwraps per-org DEKs
        │ wraps
        ▼
Per-Org DEK (Data Encryption Key)
AES-256, stored encrypted in DB (OrganizationKey table)
One per organization
        │ encrypts
        ▼
Field-Level Ciphertext
Format: iv:authTag:ciphertext (colon-separated hex)
AES-256-GCM
```

### Encrypted value formats

| System | Format | Detection |
|--------|--------|-----------|
| Server-side (DEK) | `iv:authTag:ciphertext` | `isEncrypted()` checks hex format |
| Client-side E2EE | `e2ee:v1:<base64>` | Distinct prefix — separate system |

Always use `ForOrg` variants in application code (never the sync variants which use the master key directly):

```typescript
// Production code — always ForOrg
const encrypted = await encryptClientForOrg(data, organizationId);
const decrypted = await decryptClientForOrg(record, organizationId);
```

Encryption is **idempotent** — `isEncrypted()` guard prevents double-encryption.

## Key files

| File | Purpose |
|------|---------|
| `lib/encryption.ts` | Low-level AES-256-GCM with master key |
| `lib/key-management.ts` | DEK lifecycle: generate, wrap, unwrap, `getOrgDek(orgId)` (cached) |
| `lib/model-encryption.ts` | Typed per-model encrypt/decrypt helpers |
| `lib/crypto/field-handlers.ts` | Separate client-side E2EE (passphrase-based) — to be retired |

## Encrypted fields by model

### Client — 22 string fields + 1 JSON field

`client_name`, `full_name`, `company_name`, `company_id`, `primary_email`, `secondary_email`, `primary_phone`, `secondary_phone`, `office_phone`, `fax`, `afm`, `vat`, `doy`, `id_doc`, `company_gemi`, `description`, `billing_street`, `billing_city`, `billing_state`, `billing_postal_code`, `billing_country`, `shipping_street`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`, `communication_notes` (JSON)

Functions: `encryptClientForOrg` / `decryptClientForOrg`

### Property — 1 string + 1 JSON (intentionally limited)

`primary_email`, `communication_notes`

> `property_name`, `address`, `price` are intentionally NOT encrypted — required for searchability and MLS portal publishing.

Functions: `encryptPropertyForOrg` / `decryptPropertyForOrg`

### Mandate — 2 string + 1 JSON

`title`, `notes`, `communication_notes`

Functions: `encryptMandateForOrg` / `decryptMandateForOrg`

### CalendarEvent — 6 string fields

`title`, `description`, `location`, `attendeeEmail`, `attendeeName`, `notes`

Functions: `encryptCalendarEventForOrg` / `decryptCalendarEventForOrg`

### Documents — 2 string fields

`document_name`, `description`

Functions: `encryptDocumentForOrg` / `decryptDocumentForOrg`

### Messages / Comments — 1 string field

`content`

Functions: `encryptMessageForOrg` / `decryptMessageForOrg`
Aliases: `encryptMandateCommentForOrg`, `encryptPropertyCommentForOrg` (delegate to Message helpers)

## Adding a new read path

1. Check if your `select` clause includes any encrypted field from the lists above
2. Import the decrypt function: `import { decryptClientForOrg } from "@/lib/model-encryption"`
3. Call after query, before returning:

```typescript
// Single record
const client = await prismadb.clients.findFirst({ where: { ... } });
const decrypted = await decryptClientForOrg(client, organizationId);

// Array
const clients = await prismadb.clients.findMany({ where: { ... } });
const decrypted = await Promise.all(
  clients.map(c => decryptClientForOrg(c, organizationId))
);
```

4. Use `decrypted` — not the original query result

## Adding a new write path

```typescript
import { encryptClientForOrg } from "@/lib/model-encryption";

const encrypted = await encryptClientForOrg(data, organizationId);
await prismadb.clients.create({ data: encrypted });
```

## Common pitfalls

| Pitfall | Solution |
|---------|---------|
| Searching encrypted columns with `contains` | Prisma searches ciphertext — no match. Decrypt post-query or build a search index |
| Using original record after calling decrypt | Always use the `decrypted` variable, not the original |
| `orgId` from user input | Always use org from auth context, never from request body |
| Encrypting `property_name` | Intentionally NOT encrypted — do not add it |

## Read path status

Full checklist of all read paths and their decryption status is in `docs/encryption-reference.md` (the original reference file). New read paths must be added to that checklist.
