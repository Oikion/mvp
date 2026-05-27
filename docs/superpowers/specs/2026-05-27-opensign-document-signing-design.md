# OpenSign Document Signing Integration — Design Spec

**Date:** 2026-05-27
**Status:** Approved (revised after pre-implementation review)
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
│  POST /api/documents/[id]/sign   (strict rate limit) │
│   → lib/opensign/client.ts (typed API wrapper)       │
│        ↓ uploads PDF + creates envelope              │
│                          ↓ webhook                   │
│  POST /api/webhooks/opensign?org=<token>             │
│     (HMAC-verified + timestamp replay protection)    │
│   → fetch signed PDF from OpenSign                   │
│   → store pathname in Vercel Blob (private-ready)    │
│   → create new Documents record (linked to original) │
│   → update SigningEnvelope → COMPLETED               │
└──────────────────┬──────────────────────────────────┘
                   │  REST API v1.2
                   ▼
        ┌──────────────────────┐
        │  OpenSign (self-hosted│
        │  Docker container)   │
        │  sign.oikion.gr      │
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
- OpenSign runs as a separate Docker service on its own subdomain (`sign.oikion.gr`)
- Oikion is the source of truth for all document and envelope state
- OpenSign is a signing execution engine only — no documents are permanently stored there
- The webhook is the only inbound channel from OpenSign
- Signed documents: Vercel Blob pathname stored in DB; access via authenticated download route.
  When Vercel Blob ships private mode it becomes a one-line change in `lib/vercel-blob.ts`.
  Mirrors the GDPR export download pattern at `app/api/gdpr/export/[id]/download/route.ts`.
- The `/api/webhooks(.*)` matcher in `proxy.ts` already excludes Clerk auth for this route —
  no `proxy.ts` modification needed.

---

## Data Model

### New models

```prisma
model SigningEnvelope {
  id                  String                @id @default(uuid())
  organizationId      String

  sourceDocumentId    String
  sourceDocument      Documents             @relation("EnvelopeSource", fields: [sourceDocumentId], references: [id])
  signedDocumentId    String?
  signedDocument      Documents?            @relation("EnvelopeSigned", fields: [signedDocumentId], references: [id])

  openSignEnvelopeId  String                @unique
  openSignFileId      String

  status              SigningEnvelopeStatus  @default(DRAFT)
  subject             String
  message             String?
  expiresAt           DateTime?
  completedAt         DateTime?
  cancelledAt         DateTime?

  createdBy           String?               // nullable: onDelete: SetNull
  createdByUser       Users?                @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt

  signers             SigningEnvelopeSigner[]

  @@index([organizationId])
  @@index([sourceDocumentId])
  @@index([openSignEnvelopeId])
  @@index([openSignFileId])
  @@index([status])
  @@index([organizationId, status])
}

model SigningEnvelopeSigner {
  id                  String          @id @default(uuid())
  envelopeId          String
  envelope            SigningEnvelope  @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  signerType          SignerType
  userId              String?
  user                Users?          @relation(fields: [userId], references: [id], onDelete: SetNull)

  name                String          // encrypted with org DEK
  email               String          // encrypted with org DEK
  order               Int             // 1-based signing sequence
  status              SignerStatus    @default(PENDING)
  signedAt            DateTime?
  openSignSignerId    String?

  @@unique([envelopeId, order])       // no two signers may share an order value
  @@index([envelopeId])
  @@index([envelopeId, status])
  @@index([signedAt])
}

enum SigningEnvelopeStatus {
  DRAFT
  SENT
  IN_PROGRESS
  COMPLETED
  DECLINED
  EXPIRED
  CANCELLED
  FAILED                              // OpenSign call succeeded but DB write failed
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

### Note on `organizationId`

`SigningEnvelope.organizationId` is a plain `String` — no Prisma-level relation to `Organization`.
This is consistent with how `Documents` and other tenant models handle org isolation in this codebase
(the DB enforces nothing; the application layer always filters by `organizationId`).

### Constraint: one active envelope per document

A document may not have more than one active envelope at a time. "Active" means
`status NOT IN (COMPLETED, DECLINED, EXPIRED, CANCELLED, FAILED)`. Enforced in
`create-envelope.ts` before creating the `SigningEnvelope` record.

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
   b. Permission check: signing:create_envelope
   c. Fetch PDF buffer from Vercel Blob via download route
   d. Upload PDF to OpenSign → openSignFileId
   e. Create envelope on OpenSign with ordered signer list + callback URL
      → openSignEnvelopeId
   f. Create SigningEnvelope (SENT) + SigningEnvelopeSigner rows
      (name/email encrypted with encryptSigningEnvelopeSignerForOrg())
      If DB write fails after OpenSign succeeds: status set to FAILED, log
      [SIGNING] db write failed after opensign envelope creation; envelopeId logged only
4. OpenSign emails signer #1 (OTP link)
5. Signer verifies OTP, draws/types signature on OpenSign page
6. Process repeats for each signer in order
7. All signed → OpenSign fires webhook
```

**Note on ordering (steps d → e → f):** External service calls happen before DB writes.
If OpenSign fails (steps d or e), no DB record is created — no rollback needed.
If OpenSign succeeds but the DB write fails (step f), the envelope is created on OpenSign
but cannot be tracked; status is set to FAILED and the error is logged server-side.
There is no database transaction wrapping the OpenSign API calls.

### Webhook handling

```
POST /api/webhooks/opensign?org=<per-org-token>
  1. Guard: OPENSIGN_WEBHOOK_SECRET env var must be set (fail fast if absent)
  2. Verify HMAC-SHA256 signature — length check first, then timingSafeEqual
  3. Replay protection: reject if |now - x-opensign-timestamp| > 5 minutes
  4. DB lookup: find SigningEnvelope by openSignEnvelopeId from payload
  5. Cross-check: envelope.organizationId must match the org token in query param
  6. On status = "completed":
     a. Fetch signed PDF buffer from OpenSign API
     b. Upload to Vercel Blob (pathname-based; access via download route)
     c. Create new Documents record:
        - document_name: "[original] — Signed" (encrypted)
        - document_system_type: CONTRACT
        - Inherits all linked entity IDs from source document
        - Inherits tags from source document
     d. Update SigningEnvelope: COMPLETED, signedDocumentId, completedAt
     e. Update all SigningEnvelopeSigner rows: SIGNED, signedAt
     f. Emit in-app notification to envelope creator
     NEVER log signer.name or signer.email — log only envelopeId / signerId
  7. On status = "declined" | "expired":
     - Update envelope status accordingly
     - Update relevant signer → DECLINED
  8. If signed PDF fetch or Blob upload fails:
     - Envelope stays IN_PROGRESS; log [SIGNING] webhook completion failed; envelopeId
     - Return 200 to OpenSign (prevent retry storm); manual remediation required
```

### Declined / expired / failed paths

- `DECLINED` / `EXPIRED`: OpenSign webhook fires; Oikion updates status; no new Document created
- `FAILED`: DB write failed post-OpenSign-success; envelope is non-functional; a new one may be created
- Creator receives in-app notification on all terminal states
- A new envelope may be created once the current one is in a terminal state
  (`COMPLETED | DECLINED | EXPIRED | CANCELLED | FAILED`)

---

## Permissions

New permission codes — must be added to `lib/permissions/action-permissions.ts`
and role defaults in `lib/permissions/action-defaults.ts`:

| Code | Default roles |
|---|---|
| `signing:create_envelope` | ORG_OWNER, ADMIN, AGENT |
| `signing:read_envelope` | ORG_OWNER, ADMIN, AGENT, VIEWER |
| `signing:cancel_envelope` | ORG_OWNER, ADMIN, AGENT (own envelopes) |

---

## API Routes

| Route | Method | Auth | Rate limit tier | Purpose |
|---|---|---|---|---|
| `/api/documents/[documentId]/sign` | `POST` | Clerk session | **strict** | Initiate signing envelope |
| `/api/documents/[documentId]/sign` | `GET` | Clerk session | standard | Get envelope + signer statuses |
| `/api/documents/[documentId]/sign/cancel` | `POST` | Clerk session | standard | Cancel active envelope |
| `/api/documents/[documentId]/download` | `GET` | Clerk session | standard | Serve signed file via pathname → redirect |
| `/api/webhooks/opensign` | `POST` | HMAC + timestamp | IP rate limit (inside handler) | Receive OpenSign callbacks |

`proxy.ts`: **no changes needed** — the existing `/api/webhooks(.*)` matcher already bypasses Clerk auth.

The sign `POST` endpoint must be added to the strict tier in `lib/rate-limit.ts`.
The webhook handler must apply its own IP-based rate limiting inside the route (not via middleware),
since webhook traffic originates from a known IP range, not user sessions.

---

## Server Actions

```
actions/signing/
  create-envelope.ts   # validate, encrypt signers, call OpenSign, persist
  get-envelope.ts      # decrypt signer details + return status
  cancel-envelope.ts   # call OpenSign cancel, update local status
```

Each follows the existing action pattern:
```typescript
const { organizationId } = await getCurrentOrgId();
await requireAction("signing:create_envelope");
// ... logic ...
return actionSuccess(data) | actionError(message);
```

---

## Library Layer

```
lib/opensign/
  client.ts            # typed wrapper around OpenSign REST API v1.2
  webhook-verifier.ts  # HMAC-SHA256 + replay protection
  types.ts             # OpenSign API request/response types
```

### `types.ts` (key shapes)

```typescript
export interface CreateEnvelopeOpts {
  documentFileId: string;
  signers: { name: string; email: string; order: number }[];
  subject: string;
  message?: string;
  expiryDays?: number;
  callbackUrl: string;              // /api/webhooks/opensign?org=<token>
}

export interface EnvelopeStatus {
  envelopeId: string;
  status: "draft" | "sent" | "in_progress" | "completed" | "declined" | "expired";
  signers: {
    signerId: string;
    status: "pending" | "sent" | "viewed" | "signed" | "declined";
    signedAt?: string;
  }[];
}

export type OpenSignError =
  | { retryable: true; status: 429 | 503 }
  | { retryable: false; status: 400 | 401 | 404 | 422 };
```

### `client.ts` interface

Singleton with lazy initialization — same pattern as `lib/stripe.ts` and `lib/ably.ts`:

```typescript
export const openSignClient = {
  uploadDocument(buffer: Buffer, fileName: string): Promise<{ fileId: string }>
  createEnvelope(opts: CreateEnvelopeOpts): Promise<{ envelopeId: string }>
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus>
  getSignedDocument(envelopeId: string): Promise<Buffer>
  cancelEnvelope(envelopeId: string): Promise<void>
}
```

Client distinguishes retryable (429, 503) from non-retryable (4xx) OpenSign errors
using `OpenSignError`. Non-retryable errors propagate to the caller immediately.
Retryable errors are logged; no automatic retry at this layer (caller decides).

### `webhook-verifier.ts`

```typescript
import { createHmac, timingSafeEqual } from "crypto"; // not "node:crypto" — matches existing uses

export function verifyOpenSignWebhook(
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  // Fail fast if secret is not configured
  if (!process.env.OPENSIGN_WEBHOOK_SECRET) {
    throw new Error("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not set");
  }

  // Replay protection: ±5 minute window
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  // Length check required before timingSafeEqual (matches 3 existing codebase usages)
  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}
```

---

## Encryption

### New typed wrappers (add to `lib/model-encryption.ts`)

```typescript
// Mirrors the encryptClientForOrg / decryptClientForOrg pattern

export async function encryptSigningEnvelopeSignerForOrg(
  data: { name: string; email: string },
  organizationId: string,
): Promise<{ name: string; email: string }>

export async function decryptSigningEnvelopeSignerForOrg(
  signer: SigningEnvelopeSigner,
  organizationId: string,
): Promise<SigningEnvelopeSigner & { name: string; email: string }>
```

`subject` on `SigningEnvelope` is not encrypted (no PII — typically a document reference).

---

## UI

### `SendForSigningModal` (shared across all entry points)

Three-step modal. All patterns are available in the existing codebase:
- Multi-step shell: `components/import/ImportWizardModal.tsx`
- Drag-to-reorder: `@dnd-kit/sortable` (used in `components/property-images/PropertyImageUploader.tsx`)
- Status badges: `components/ui/status-badge.tsx`

**Step 1 — Signers**
- Internal signers: multi-select from org member list, drag-to-reorder
  - Loading state: skeleton rows while org members are fetched
  - Empty state: "No org members found" with a prompt to invite team members
- External signers: name + email input rows, drag-to-reorder
- Internal signers always precede external in the signing order
- Minimum 1 signer total before proceeding

**Step 2 — Message**
- Subject (pre-filled: "[document name] — Signature Required")
- Optional message body
- Optional expiry date picker

**Step 3 — Review & Send**
- Final numbered signer list with emails (decrypted display only)
- Confirm button triggers `POST /api/documents/[documentId]/sign`
- Error state: inline error banner if API call fails (generic message)
- Unsaved-changes guard: confirm dialog if user closes modal mid-flow

### Entry points

| Location | Trigger | Condition |
|---|---|---|
| Document detail page | "Send for Signing" button in header | Document is PDF; no active envelope |
| Deal pipeline | "Sign" button on document row in stage panel | Stage is `PRELIMINARY_AGREEMENT`, `DUE_DILIGENCE`, or `SIGNING` |
| Contact detail page | "Sign" icon on document row in Documents tab | Document is PDF; no active envelope |
| Property detail page | "Sign" icon on document row in Documents tab | Document is PDF; no active envelope |

**Note:** Deal stage panels do not currently display linked documents — this is a new UI surface
(not an extension of an existing one) that must be designed alongside the signing trigger.

When an active envelope exists, the trigger button is replaced by a status badge
(`SENT` / `IN_PROGRESS`).

### Signing tab on Document detail

A new `Signing` tab appears in the document detail view (alongside Details / Views / Sharing)
whenever any envelope has ever been created for the document.

Contents:
- Envelope status chip
- Ordered signer list with per-signer status badge (`PENDING` / `SENT` / `VIEWED` / `SIGNED` / `DECLINED`) and timestamps
- Link to signed document (when `COMPLETED`)
- "Cancel" button (when `SENT` or `IN_PROGRESS`, requires `signing:cancel_envelope`)

### Download route for private-ready blobs

```
GET /api/documents/[documentId]/download
→ Auth + org check
→ Validate document.organizationId matches session org
→ head(document.document_file_url) to confirm blob exists  ← pathname, not URL
→ Generate short-lived access URL (15-min TTL)
→ redirect(accessUrl)
```

Mirrors `app/api/gdpr/export/[id]/download/route.ts`.

### i18n

New namespace: `signing`

Must register in both:
- `locales/en/signing.json`
- `locales/el/signing.json`
- `i18n.ts` namespace list
- `app/[locale]/layout.tsx` messages import

(Per dual-registration rule — all new namespaces require both entries.)

---

## Security Summary

| Concern | Mitigation |
|---|---|
| Webhook spoofing | HMAC-SHA256 verification |
| Webhook replay | x-opensign-timestamp within ±5 min |
| Tenant confusion | Per-org token in callback URL + DB cross-check |
| PII in logs | Only log envelopeId / signerId — never name or email |
| Rate abuse on sign endpoint | Strict rate-limit tier in `lib/rate-limit.ts` |
| Rate abuse on webhook | IP-based rate limit inside route handler |
| Unconfigured secret | Fast-fail guard at top of webhook handler |
| File access bypass | Signed documents served via auth-gated download route only |

---

## Environment Variables

```bash
OPENSIGN_API_URL=https://sign.oikion.gr/api   # self-hosted OpenSign base URL
OPENSIGN_API_KEY=...                           # service-level API key
OPENSIGN_WEBHOOK_SECRET=...                    # HMAC shared secret
```

Add all three to `.env.example` with descriptive comments.

---

## Pre-Implementation Checklist

### Schema (before running migration)
- [ ] `@@unique([openSignEnvelopeId])` on `SigningEnvelope` ✓ (already in model above)
- [ ] Indexes: `openSignFileId`, `status`, `[organizationId, status]` on `SigningEnvelope` ✓
- [ ] Indexes: `[envelopeId, status]`, `signedAt` on `SigningEnvelopeSigner` ✓
- [ ] `@@unique([envelopeId, order])` on `SigningEnvelopeSigner` ✓
- [ ] `FAILED` added to `SigningEnvelopeStatus` enum ✓
- [ ] No Prisma `@relation` to `Organization` on `SigningEnvelope` ✓

### Library / Permissions
- [ ] `encryptSigningEnvelopeSignerForOrg()` + decrypt variant in `lib/model-encryption.ts`
- [ ] `signing:create_envelope`, `signing:read_envelope`, `signing:cancel_envelope` in `lib/permissions/action-permissions.ts` + role defaults
- [ ] Length check before `timingSafeEqual` in `webhook-verifier.ts` ✓
- [ ] `CreateEnvelopeOpts` and `EnvelopeStatus` types in `lib/opensign/types.ts` ✓
- [ ] `OPENSIGN_*` vars in `.env.example`

### Security
- [ ] `OPENSIGN_WEBHOOK_SECRET` fast-fail guard in webhook handler ✓
- [ ] IP rate limiting inside `/api/webhooks/opensign`
- [ ] Timestamp replay protection in `webhook-verifier.ts` ✓
- [ ] Per-org token in callback URL + DB cross-check in webhook handler

### API / Actions
- [ ] Sign `POST` added to strict rate-limit tier in `lib/rate-limit.ts`
- [ ] Download route uses pathname, not direct Blob URL
- [ ] Rollback language removed — failure path uses `FAILED` status

### UI
- [ ] `components/signing/` directory created
- [ ] `locales/en/signing.json` + `locales/el/signing.json` created
- [ ] Both namespace registrations: `i18n.ts` + `app/[locale]/layout.tsx`
- [ ] Empty / loading / error states in `SendForSigningModal`
- [ ] Deal stage document display designed (new surface)

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
- `locales/en/signing.json`
- `locales/el/signing.json`

### Modified files
- `prisma/schema.prisma` — new models + back-relations on Documents
- `lib/model-encryption.ts` — add `SigningEnvelopeSigner` encrypt/decrypt wrappers
- `lib/permissions/action-permissions.ts` — add `signing:*` codes
- `lib/permissions/action-defaults.ts` — add role defaults for signing permissions
- `lib/rate-limit.ts` — add sign POST to strict tier
- `app/[locale]/app/(routes)/documents/[slug]/components/DocumentDetail.tsx` — add Signing tab + Send button
- `app/[locale]/app/(routes)/deals/[dealId]/components/EditDealForm.tsx` — add document display + Sign button to relevant stage panels
- `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx` — add Sign button to documents tab
- `app/[locale]/app/(routes)/mls/properties/[propertyId]/components/PropertyView.tsx` — add Sign button to documents tab (verify exact path before implementation)
- `i18n.ts` — register `signing` namespace
- `app/[locale]/layout.tsx` — import `signing` messages
- `.env.example` — add three new OpenSign variables
