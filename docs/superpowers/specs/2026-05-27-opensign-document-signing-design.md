# OpenSign Document Signing Integration — Design Spec

**Date:** 2026-05-27
**Status:** Approved
**Author:** Σταύρος Αποστόλου

---

## Overview

Integrate a self-hosted [OpenSign](https://opensignlabs.com) instance into the Oikion Documents feature to support legally-binding electronic signature workflows. The integration handles both internal org-member signing and external client/counterparty signing in a configurable ordered sequence.

---

## Goals

- Enable agents to send any PDF document for electronic signature directly from Oikion
- Support ordered signing sequences: internal org members sign first, external parties second
- Store the final signed document back in Oikion as a new versioned `Documents` record
- Keep all signing orchestration in a self-hosted OpenSign instance (data sovereignty)
- Encrypt all signer PII at rest using the existing per-org DEK system
- Fix the existing public Vercel Blob URL gap for signed documents

## Non-Goals

- Migration of existing documents from public to private Blob storage (separate initiative)
- Qualified/advanced electronic signatures requiring eIDAS identity verification
- PDF form-field pre-filling or template variable substitution
- Bulk/mass signing workflows

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Oikion (Next.js)                  │
│                                                      │
│  Document Detail / Deal Stage / Contact / Property   │
│           ↓  "Send for Signing"                      │
│  POST /api/documents/[id]/sign                       │
│   → lib/opensign/client.ts (typed API wrapper)       │
│        ↓ uploads PDF + creates envelope              │
│                          ↓ webhook                   │
│  POST /api/webhooks/opensign (HMAC-verified)         │
│   → fetch signed PDF from OpenSign                   │
│   → encrypt + store in Vercel Blob (private)         │
│   → create new Documents record (linked to original) │
│   → update SigningEnvelope → COMPLETED               │
└──────────────────┬──────────────────────────────────┘
                   │  REST API v1.2
                   ▼
        ┌──────────────────────┐
        │  OpenSign (self-hosted│
        │  Docker container)   │
        │                      │
        │  - Signing ceremony  │
        │  - Email / OTP       │
        │  - Signature capture │
        │  - Audit certificate │
        └──────────────────────┘
              ↑↓ email
         Internal signers (org members)
         External signers (clients / counterparties)
```

**Key principles:**
- OpenSign runs as a separate Docker service on its own subdomain (e.g. `sign.oikion.gr`)
- Oikion is the source of truth for all document and envelope state
- OpenSign is a signing execution engine only — no documents are permanently stored there
- The webhook is the only inbound channel from OpenSign
- Signed documents are stored as Vercel Blob **private** objects; access is via short-lived signed URLs

---

## Data Model

### New models

```prisma
model SigningEnvelope {
  id                  String                @id @default(uuid())
  organizationId      String
  organization        Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  sourceDocumentId    String
  sourceDocument      Documents             @relation("EnvelopeSource", fields: [sourceDocumentId], references: [id])
  signedDocumentId    String?
  signedDocument      Documents?            @relation("EnvelopeSigned", fields: [signedDocumentId], references: [id])

  openSignEnvelopeId  String
  openSignFileId      String

  status              SigningEnvelopeStatus  @default(DRAFT)
  subject             String
  message             String?
  expiresAt           DateTime?
  completedAt         DateTime?
  cancelledAt         DateTime?

  createdBy           String?               // nullable for onDelete: SetNull
  createdByUser       Users?                @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt

  signers             SigningEnvelopeSigner[]

  @@index([organizationId])
  @@index([sourceDocumentId])
  @@index([openSignEnvelopeId])
}

model SigningEnvelopeSigner {
  id                  String        @id @default(uuid())
  envelopeId          String
  envelope            SigningEnvelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  signerType          SignerType
  userId              String?
  user                Users?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  name                String        // encrypted with org DEK
  email               String        // encrypted with org DEK
  order               Int           // 1-based signing sequence
  status              SignerStatus  @default(PENDING)
  signedAt            DateTime?
  openSignSignerId    String?

  @@index([envelopeId])
}

enum SigningEnvelopeStatus {
  DRAFT
  SENT
  IN_PROGRESS
  COMPLETED
  DECLINED
  EXPIRED
  CANCELLED
}

enum SignerType {
  INTERNAL
  EXTERNAL
}

enum SignerStatus {
  PENDING
  SENT
  VIEWED
  SIGNED
  DECLINED
}
```

### Additions to existing `Documents` model

```prisma
// Two new back-relations (no new columns required):
envelopeAsSource    SigningEnvelope[] @relation("EnvelopeSource")
envelopeAsSigned    SigningEnvelope[] @relation("EnvelopeSigned")
```

### Constraint: one active envelope per document

A document may not have more than one active envelope at a time. "Active" means `status NOT IN (COMPLETED, DECLINED, EXPIRED, CANCELLED)`. Enforced at the application layer in `create-envelope.ts` before creating the `SigningEnvelope` record.

---

## Signing Workflow

### Happy path

```
1. User opens SendForSigningModal (from any entry point)
2. User configures:
   - Internal signers (org members, drag-ordered)
   - External signers (name + email, ordered after internals)
   - Subject, optional message, optional expiry
3. Submit → POST /api/documents/[documentId]/sign
   a. Validate: document exists, belongs to org, is PDF, no active envelope
   b. Permission check: document:create
   c. Create SigningEnvelope (DRAFT) + SigningEnvelopeSigner rows
      (name/email encrypted with org DEK)
   d. Fetch PDF buffer from Vercel Blob via signed URL
   e. Upload PDF to OpenSign → openSignFileId
   f. Create envelope on OpenSign with ordered signer list → openSignEnvelopeId
   g. Update SigningEnvelope: status=SENT, store both OpenSign IDs
4. OpenSign emails signer #1 (OTP link)
5. Signer verifies OTP, draws/types signature on OpenSign page
6. Process repeats for each signer in order
7. All signed → OpenSign fires webhook to /api/webhooks/opensign
8. Webhook handler:
   a. Verify HMAC-SHA256 signature
   b. Look up SigningEnvelope by openSignEnvelopeId
   c. Confirm envelope.organizationId is valid (tenant guard)
   d. Fetch signed PDF buffer from OpenSign API
   e. Encrypt + upload to Vercel Blob (private mode)
   f. Create new Documents record:
      - document_name: "[original] — Signed" (encrypted)
      - document_system_type: CONTRACT
      - Inherits all linked entity IDs from source document
      - Inherits tags from source document
   g. Update SigningEnvelope: status=COMPLETED, signedDocumentId, completedAt
   h. Update all SigningEnvelopeSigner rows: status=SIGNED
   i. Emit in-app notification to envelope creator
```

### Declined / expired path

- OpenSign fires webhook with `declined` or `expired` status
- Oikion updates `SigningEnvelope.status` accordingly
- Relevant signer updated to `DECLINED` if a specific signer declined
- No new Documents record is created
- Creator receives in-app notification
- A new envelope may be created once the current one is in a terminal state

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/documents/[documentId]/sign` | `POST` | Clerk session | Initiate signing envelope |
| `/api/documents/[documentId]/sign` | `GET` | Clerk session | Get envelope + signer statuses |
| `/api/documents/[documentId]/sign/cancel` | `POST` | Clerk session | Cancel active envelope |
| `/api/documents/[documentId]/download` | `GET` | Clerk session | Generate 15-min signed Blob URL for private docs |
| `/api/webhooks/opensign` | `POST` | HMAC only | Receive OpenSign event callbacks |

The webhook route is excluded from Clerk auth in `proxy.ts` — same pattern as the existing Clerk webhook exclusion.

---

## Server Actions

```
actions/signing/
  create-envelope.ts   # validates, builds signer list, calls OpenSign client, persists
  get-envelope.ts      # returns decrypted signer details + status
  cancel-envelope.ts   # calls OpenSign cancel endpoint, updates local status
```

---

## Library Layer

```
lib/opensign/
  client.ts            # typed wrapper around OpenSign REST API v1.2
  webhook-verifier.ts  # HMAC-SHA256 signature verification
  types.ts             # OpenSign API response types
```

### `client.ts` interface

```typescript
export const openSignClient = {
  uploadDocument(buffer: Buffer, fileName: string): Promise<{ fileId: string }>
  createEnvelope(opts: CreateEnvelopeOpts): Promise<{ envelopeId: string }>
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus>
  getSignedDocument(envelopeId: string): Promise<Buffer>
  cancelEnvelope(envelopeId: string): Promise<void>
}
```

### Webhook verifier

```typescript
// lib/opensign/webhook-verifier.ts
export function verifyOpenSignWebhook(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

Uses `timingSafeEqual` to prevent timing side-channel attacks — consistent with how password comparison is handled elsewhere in the codebase.

---

## UI

### `SendForSigningModal` (shared across all entry points)

Three-step modal:

**Step 1 — Signers**
- Internal signers: multi-select from org member list, drag-to-reorder
- External signers: name + email input rows, drag-to-reorder
- Internal signers always precede external in the signing order

**Step 2 — Message**
- Subject (pre-filled: "[document name] — Signature Required")
- Optional message body
- Optional expiry date picker

**Step 3 — Review & Send**
- Final numbered signer list with emails
- Confirm button triggers `POST /api/documents/[documentId]/sign`

### Entry points

| Location | Trigger | Condition |
|---|---|---|
| Document detail page | "Send for Signing" button in header | Document is PDF; no active envelope |
| Deal pipeline | "Sign" button on document row in stage panel | Stage is `PRELIMINARY_AGREEMENT`, `DUE_DILIGENCE`, or `SIGNING` |
| Contact detail page | "Sign" icon on document row in Documents tab | Document is PDF; no active envelope |
| Property detail page | "Sign" icon on document row in Documents tab | Document is PDF; no active envelope |

When an active envelope exists, the trigger button is replaced by a status badge (`SENT`, `IN_PROGRESS`).

### Signing tab on Document detail

A new `Signing` tab appears in the document detail view alongside Details / Views / Sharing when any envelope has ever been created for the document.

Contents:
- Envelope status chip
- Ordered signer list with per-signer status badge (`PENDING` / `SENT` / `VIEWED` / `SIGNED` / `DECLINED`) and timestamp
- Link to signed document (when `COMPLETED`)
- "Cancel" button (when `SENT` or `IN_PROGRESS`, requires `document:update` permission)

### Download route for private blobs

```
GET /api/documents/[documentId]/download
→ Auth + org check
→ head(blob pathname) to verify existence
→ generatePresignedUrl(pathname, { expiresIn: 900 })
→ redirect(signedUrl)
```

All signed documents are served through this route rather than direct Blob URL.

---

## Encryption & Security

### Signer PII

`SigningEnvelopeSigner.name` and `.email` are encrypted with the org DEK using the same `encryptField()` primitive used for `Clients.primary_email`. Decryption happens only in server actions; client components never receive raw values.

`SigningEnvelope.subject` is not encrypted — it contains no direct PII (typically a document reference like "Purchase Offer — DOC-000042").

### Signed document storage

Signed PDFs are uploaded to Vercel Blob in **private** mode. `document_file_url` stores the Blob pathname. Access is via the `/api/documents/[documentId]/download` route which generates a 15-minute presigned URL on authenticated request.

Original (pre-signing) documents continue to use public Blob storage. Migrating existing documents to private storage is a separate, non-trivial initiative and out of scope for this integration.

### Webhook integrity

All inbound webhooks from OpenSign are verified via HMAC-SHA256 before any payload is processed. Invalid signatures return `400` and log `[OPENSIGN_WEBHOOK] invalid signature` server-side.

### `proxy.ts` exclusion

`/api/webhooks/opensign` is added to the public route matcher in `proxy.ts`, bypassing Clerk auth middleware. This mirrors the existing Clerk webhook exclusion pattern.

### Permissions

| Action | Required permission |
|---|---|
| Send for signing | `document:create` |
| View signing status | `document:read` |
| Cancel envelope | `document:update` |

---

## Environment Variables

```bash
OPENSIGN_API_URL=https://sign.oikion.gr/api   # self-hosted OpenSign base URL
OPENSIGN_API_KEY=...                           # service-level API key
OPENSIGN_WEBHOOK_SECRET=...                    # HMAC shared secret for webhook verification
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Document is not a PDF | 400: "Only PDF documents can be sent for signing" |
| Active envelope already exists | 409: "A signing request is already active for this document" |
| OpenSign upload fails | 500: roll back `SigningEnvelope` creation; log `[SIGNING] opensign upload failed` |
| OpenSign envelope creation fails | 500: roll back; log `[SIGNING] opensign envelope creation failed` |
| Webhook HMAC invalid | 400: log and discard |
| Signed PDF fetch fails | Log `[SIGNING] webhook signed PDF fetch failed`; envelope stays `IN_PROGRESS` for manual retry |
| Blob upload of signed PDF fails | Same as above |

All error messages returned to clients are generic. Detailed context is logged server-side only.

---

## Affected Files

### New files
- `prisma/migrations/<timestamp>_add_signing_models/migration.sql`
- `lib/opensign/client.ts`
- `lib/opensign/webhook-verifier.ts`
- `lib/opensign/types.ts`
- `actions/signing/create-envelope.ts`
- `actions/signing/get-envelope.ts`
- `actions/signing/cancel-envelope.ts`
- `app/api/documents/[documentId]/sign/route.ts`
- `app/api/documents/[documentId]/download/route.ts`
- `app/api/webhooks/opensign/route.ts`
- `app/[locale]/app/(routes)/documents/[slug]/components/SigningTab.tsx`
- `components/signing/SendForSigningModal.tsx`

### Modified files
- `prisma/schema.prisma` — new models + back-relations on Documents
- `proxy.ts` — add `/api/webhooks/opensign` to public route matcher
- `app/[locale]/app/(routes)/documents/[slug]/components/DocumentDetail.tsx` — add Signing tab + Send button
- `app/[locale]/app/(routes)/deals/[dealId]/components/EditDealForm.tsx` — add Sign button to relevant stage panels
- `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx` — add Sign button to documents tab
- `app/[locale]/app/(routes)/mls/properties/[propertyId]/components/PropertyView.tsx` — add Sign button to documents tab
- `lib/model-encryption.ts` — add `SigningEnvelopeSigner` encrypted fields
- `.env.example` — add three new OpenSign variables
