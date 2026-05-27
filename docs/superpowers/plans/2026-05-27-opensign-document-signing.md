# OpenSign Document Signing Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a self-hosted OpenSign instance into the Documents feature, enabling ordered electronic signing workflows for internal org members and external clients, with signed documents versioned back into Oikion as new `Documents` records.

**Architecture:** Oikion orchestrates all signing via the OpenSign REST API v1.2. A self-hosted Docker instance at `sign.oikion.gr` handles email dispatch, OTP verification, and drawn/typed signature capture. Completion is notified via HMAC-SHA256-verified webhooks with replay protection and per-org token validation. All signer PII is encrypted at rest using the existing per-org DEK system.

**Tech Stack:** Prisma 5 (schema), Next.js App Router (API routes), Vitest (unit tests), OpenSign REST API v1.2, `@vercel/blob`, Node.js `crypto` (HMAC-SHA256), `@dnd-kit/sortable` (drag-to-reorder), shadcn/ui Tabs + Badge + Dialog, next-intl.

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `lib/opensign/types.ts` | OpenSign API request/response types |
| `lib/opensign/client.ts` | Typed singleton API wrapper |
| `lib/opensign/webhook-verifier.ts` | HMAC-SHA256 + replay protection |
| `actions/signing/create-envelope.ts` | Initiate signing workflow |
| `actions/signing/get-envelope.ts` | Read envelope + signer status |
| `actions/signing/cancel-envelope.ts` | Cancel active envelope |
| `app/api/documents/[documentId]/sign/route.ts` | POST initiate, GET status |
| `app/api/documents/[documentId]/download/route.ts` | Auth-gated file proxy |
| `app/api/webhooks/opensign/route.ts` | Webhook receiver |
| `components/signing/SendForSigningModal.tsx` | Shared 3-step signing modal |
| `app/[locale]/app/(routes)/documents/[slug]/components/SigningTab.tsx` | Signing status tab |
| `locales/en/signing.json` | English translations |
| `locales/el/signing.json` | Greek translations |
| `tests/lib/opensign/webhook-verifier.test.ts` | Verifier unit tests |
| `tests/lib/opensign/client.test.ts` | Client unit tests |
| `tests/actions/signing/create-envelope.test.ts` | Action unit tests |

### Modified files
| Path | Change |
|---|---|
| `prisma/schema.prisma` | Add `SigningEnvelope`, `SigningEnvelopeSigner`, enums, back-relations on `Documents` |
| `lib/model-encryption.ts` | Add `encryptSigningEnvelopeSignerForOrg` + decrypt variant |
| `lib/permissions/action-permissions.ts` | Add `SigningAction` type + module constant |
| `lib/permissions/action-defaults.ts` | Add signing permission defaults per role |
| `lib/rate-limit.ts` | Add sign POST to strict tier |
| `app/[locale]/app/(routes)/documents/[slug]/components/DocumentDetail.tsx` | Add Signing tab + Send button |
| `app/[locale]/app/(routes)/deals/[dealId]/components/EditDealForm.tsx` | Add document display + Sign trigger to relevant stages |
| `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx` | Add Sign button to documents tab |
| `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx` | Add Sign button to documents tab |
| `i18n.ts` | Register `signing` namespace |
| `app/[locale]/layout.tsx` | Import signing locale files |
| `.env.example` | Add three OpenSign variables |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example`

- [ ] **Step 1: Add enums to `prisma/schema.prisma`**

Find the enum block near the end of the schema and add:

```prisma
enum SigningEnvelopeStatus {
  DRAFT
  SENT
  IN_PROGRESS
  COMPLETED
  DECLINED
  EXPIRED
  CANCELLED
  FAILED
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

- [ ] **Step 2: Add `SigningEnvelope` and `SigningEnvelopeSigner` models**

Append after the last model in `schema.prisma`:

```prisma
model SigningEnvelope {
  id                 String               @id @default(uuid())
  organizationId     String

  sourceDocumentId   String
  sourceDocument     Documents            @relation("EnvelopeSource", fields: [sourceDocumentId], references: [id])
  signedDocumentId   String?
  signedDocument     Documents?           @relation("EnvelopeSigned", fields: [signedDocumentId], references: [id])

  openSignEnvelopeId String               @unique
  openSignFileId     String

  status             SigningEnvelopeStatus @default(DRAFT)
  subject            String
  message            String?
  expiresAt          DateTime?
  completedAt        DateTime?
  cancelledAt        DateTime?

  createdBy          String?
  createdByUser      Users?               @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  signers            SigningEnvelopeSigner[]

  @@index([organizationId])
  @@index([sourceDocumentId])
  @@index([openSignEnvelopeId])
  @@index([openSignFileId])
  @@index([status])
  @@index([organizationId, status])
}

model SigningEnvelopeSigner {
  id               String         @id @default(uuid())
  envelopeId       String
  envelope         SigningEnvelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  signerType       SignerType
  userId           String?
  user             Users?         @relation(fields: [userId], references: [id], onDelete: SetNull)

  name             String
  email            String
  order            Int
  status           SignerStatus   @default(PENDING)
  signedAt         DateTime?
  openSignSignerId String?

  @@unique([envelopeId, order])
  @@index([envelopeId])
  @@index([envelopeId, status])
  @@index([signedAt])
}
```

- [ ] **Step 3: Add back-relations to the `Documents` model**

Find the `Documents` model and add these two lines inside it (near other relation fields):

```prisma
  envelopeAsSource  SigningEnvelope[] @relation("EnvelopeSource")
  envelopeAsSigned  SigningEnvelope[] @relation("EnvelopeSigned")
```

- [ ] **Step 4: Add OpenSign env vars to `.env.example`**

```bash
# OpenSign (self-hosted document signing)
# Deploy OpenSign Docker image at sign.oikion.gr — see docs/superpowers/specs/2026-05-27-opensign-document-signing-design.md
OPENSIGN_API_URL=https://sign.oikion.gr/api
OPENSIGN_API_KEY=                         # service-level API key from OpenSign admin panel
OPENSIGN_WEBHOOK_SECRET=                  # HMAC shared secret — generate with: openssl rand -hex 32
# Required if not already set — used for OpenSign callback URL construction
NEXT_PUBLIC_APP_URL=https://app.oikion.gr
```

- [ ] **Step 5: Run migration**

```bash
pnpm prisma migrate dev --name add_signing_models
```

Expected output (last lines):
```
The following migration(s) have been created and applied from your schema changes:
  migrations/20260527XXXXXX_add_signing_models/migration.sql
Your database is now in sync with your schema.
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.example
git commit -m "feat(schema): add SigningEnvelope and SigningEnvelopeSigner models"
```

---

## Task 2: OpenSign Types

**Files:**
- Create: `lib/opensign/types.ts`

- [ ] **Step 1: Create `lib/opensign/types.ts`**

```typescript
export interface CreateEnvelopeOpts {
  documentFileId: string;
  signers: {
    name: string;
    email: string;
    order: number;
  }[];
  subject: string;
  message?: string;
  expiryDays?: number;
  callbackUrl: string;
}

export interface EnvelopeSignerStatus {
  signerId: string;
  status: "pending" | "sent" | "viewed" | "signed" | "declined";
  signedAt?: string;
}

export interface EnvelopeStatus {
  envelopeId: string;
  status: "draft" | "sent" | "in_progress" | "completed" | "declined" | "expired";
  signers: EnvelopeSignerStatus[];
}

export interface UploadDocumentResult {
  fileId: string;
}

export interface CreateEnvelopeResult {
  envelopeId: string;
}

export type OpenSignError =
  | { retryable: true; status: 429 | 503; message: string }
  | { retryable: false; status: 400 | 401 | 404 | 422; message: string };

export interface OpenSignWebhookPayload {
  envelopeId: string;
  status: "completed" | "declined" | "expired";
  signers?: {
    signerId: string;
    status: string;
    signedAt?: string;
  }[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/opensign/types.ts
git commit -m "feat(signing): add OpenSign API types"
```

---

## Task 3: Webhook Verifier (TDD)

**Files:**
- Create: `lib/opensign/webhook-verifier.ts`
- Create: `tests/lib/opensign/webhook-verifier.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/opensign/webhook-verifier.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";

describe("verifyOpenSignWebhook", () => {
  const SECRET = "test-secret-abcdef1234567890";
  const PAYLOAD = '{"envelopeId":"env-123","status":"completed"}';

  function makeSignature(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  function makeTimestamp(offsetSeconds = 0): string {
    return String(Math.floor(Date.now() / 1000) + offsetSeconds);
  }

  beforeEach(() => {
    vi.stubEnv("OPENSIGN_WEBHOOK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for a valid signature and fresh timestamp", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    const sig = makeSignature(PAYLOAD, "wrong-secret");
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false when signature length does not match expected", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    expect(verifyOpenSignWebhook(PAYLOAD, "tooshort", ts)).toBe(false);
  });

  it("returns false for a timestamp more than 5 minutes in the past", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp(-301);
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false for a timestamp more than 5 minutes in the future", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp(301);
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false for a non-numeric timestamp", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, "not-a-number")).toBe(false);
  });

  it("throws if OPENSIGN_WEBHOOK_SECRET env var is not set", async () => {
    vi.unstubAllEnvs();
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    expect(() =>
      verifyOpenSignWebhook(PAYLOAD, makeSignature(PAYLOAD, SECRET), makeTimestamp())
    ).toThrow("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not set");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run tests/lib/opensign/webhook-verifier.test.ts
```

Expected: all tests fail with `Cannot find module '@/lib/opensign/webhook-verifier'`

- [ ] **Step 3: Implement `lib/opensign/webhook-verifier.ts`**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

export function verifyOpenSignWebhook(
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!process.env.OPENSIGN_WEBHOOK_SECRET) {
    throw new Error("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not set");
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/lib/opensign/webhook-verifier.test.ts
```

Expected: `Tests 7 passed (7)`

- [ ] **Step 5: Commit**

```bash
git add lib/opensign/webhook-verifier.ts tests/lib/opensign/webhook-verifier.test.ts
git commit -m "feat(signing): add webhook HMAC verifier with replay protection"
```

---

## Task 4: OpenSign API Client (TDD)

**Files:**
- Create: `lib/opensign/client.ts`
- Create: `tests/lib/opensign/client.test.ts`

> **Important:** The exact OpenSign REST API v1.2 endpoint paths must be verified against
> https://docs.opensignlabs.com/docs/API-docs/v1.2 before wiring up the real `fetch` calls.
> The method signatures below are the stable interface. Stub the HTTP layer first; implement
> real endpoints after consulting the docs.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/opensign/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_BASE = "https://sign.example.com/api";
const MOCK_KEY = "test-api-key";

describe("openSignClient", () => {
  beforeEach(() => {
    vi.stubEnv("OPENSIGN_API_URL", MOCK_BASE);
    vi.stubEnv("OPENSIGN_API_KEY", MOCK_KEY);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uploadDocument calls the correct endpoint and returns fileId", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fileId: "file-abc" }),
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    const result = await openSignClient.uploadDocument(
      Buffer.from("pdf-content"),
      "test.pdf",
    );
    expect(result.fileId).toBe("file-abc");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(MOCK_BASE),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: `Bearer ${MOCK_KEY}` }),
      }),
    );
  });

  it("createEnvelope calls the correct endpoint and returns envelopeId", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ envelopeId: "env-xyz" }),
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    const result = await openSignClient.createEnvelope({
      documentFileId: "file-abc",
      signers: [{ name: "Alice", email: "alice@example.com", order: 1 }],
      subject: "Please sign",
      callbackUrl: "https://app.oikion.gr/api/webhooks/opensign?org=abc",
    });
    expect(result.envelopeId).toBe("env-xyz");
  });

  it("throws a non-retryable OpenSignError on 4xx response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: "Unprocessable" }),
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    await expect(
      openSignClient.uploadDocument(Buffer.from("x"), "x.pdf"),
    ).rejects.toMatchObject({ retryable: false, status: 422 });
  });

  it("throws a retryable OpenSignError on 429 response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    await expect(
      openSignClient.uploadDocument(Buffer.from("x"), "x.pdf"),
    ).rejects.toMatchObject({ retryable: true, status: 429 });
  });

  it("getSignedDocument returns a Buffer", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    const buf = await openSignClient.getSignedDocument("env-xyz");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBe(16);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run tests/lib/opensign/client.test.ts
```

Expected: all fail with `Cannot find module '@/lib/opensign/client'`

- [ ] **Step 3: Implement `lib/opensign/client.ts`**

> Verify exact endpoint paths against OpenSign v1.2 API docs before shipping.
> The paths below (`/documents/upload`, `/envelopes`, etc.) are placeholders based on
> typical e-signing API conventions. Replace with real paths from the docs.

```typescript
import type {
  CreateEnvelopeOpts,
  CreateEnvelopeResult,
  EnvelopeStatus,
  OpenSignError,
  UploadDocumentResult,
} from "./types";

function getConfig() {
  const apiUrl = process.env.OPENSIGN_API_URL;
  const apiKey = process.env.OPENSIGN_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("[OPENSIGN_CLIENT] OPENSIGN_API_URL or OPENSIGN_API_KEY is not set");
  }
  return { apiUrl, apiKey };
}

async function openSignFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const { apiUrl, apiKey } = getConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    const retryable = res.status === 429 || res.status === 503;
    const err: OpenSignError = {
      retryable: retryable as never,
      status: res.status as never,
      message: body?.error ?? String(res.status),
    };
    throw err;
  }

  return res.json() as Promise<T>;
}

async function openSignFetchBinary(path: string): Promise<Buffer> {
  const { apiUrl, apiKey } = getConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const retryable = res.status === 429 || res.status === 503;
    const err: OpenSignError = {
      retryable: retryable as never,
      status: res.status as never,
      message: String(res.status),
    };
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

export const openSignClient = {
  async uploadDocument(
    buffer: Buffer,
    fileName: string,
  ): Promise<UploadDocumentResult> {
    // TODO: verify exact endpoint + multipart format against OpenSign v1.2 docs
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "application/pdf" }), fileName);
    const { apiUrl, apiKey } = getConfig();
    const res = await fetch(`${apiUrl}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const retryable = res.status === 429 || res.status === 503;
      throw { retryable, status: res.status, message: String(res.status) } as OpenSignError;
    }
    return res.json() as Promise<UploadDocumentResult>;
  },

  async createEnvelope(opts: CreateEnvelopeOpts): Promise<CreateEnvelopeResult> {
    // TODO: verify exact endpoint + payload shape against OpenSign v1.2 docs
    return openSignFetch<CreateEnvelopeResult>("/envelopes", {
      method: "POST",
      body: JSON.stringify(opts),
    });
  },

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    return openSignFetch<EnvelopeStatus>(`/envelopes/${envelopeId}`, {
      method: "GET",
    });
  },

  async getSignedDocument(envelopeId: string): Promise<Buffer> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    return openSignFetchBinary(`/envelopes/${envelopeId}/download`);
  },

  async cancelEnvelope(envelopeId: string): Promise<void> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    await openSignFetch<void>(`/envelopes/${envelopeId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/lib/opensign/client.test.ts
```

Expected: `Tests 5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add lib/opensign/client.ts tests/lib/opensign/client.test.ts
git commit -m "feat(signing): add OpenSign API client with typed error handling"
```

---

## Task 5: Encryption Wrappers

**Files:**
- Modify: `lib/model-encryption.ts`

- [ ] **Step 1: Add the signer field constant and wrappers to `lib/model-encryption.ts`**

Find the section where other model encryption wrappers are defined (near `encryptContactForOrg`).
Add the following — keeping the same pattern as the existing wrappers:

```typescript
// ─── SigningEnvelopeSigner ────────────────────────────────────────────────────

const SIGNING_SIGNER_ENCRYPTED_STRING_FIELDS = ["name", "email"] as const;

export async function encryptSigningEnvelopeSignerForOrg<
  T extends { name: string; email: string },
>(data: T, orgId: string): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T;
  for (const field of SIGNING_SIGNER_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        (result as Record<string, unknown>)[field] as string | null | undefined,
        dek,
      );
    }
  }
  return result;
}

export async function decryptSigningEnvelopeSignerForOrg<
  T extends { name: string; email: string },
>(data: T, orgId: string): Promise<T> {
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...data } as T;
  for (const field of SIGNING_SIGNER_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        (result as Record<string, unknown>)[field] as string | null | undefined,
        deks,
      );
    }
  }
  return result;
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
pnpm build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors in `lib/model-encryption.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "feat(signing): add SigningEnvelopeSigner encrypt/decrypt wrappers"
```

---

## Task 6: Permissions + Rate Limiting

**Files:**
- Modify: `lib/permissions/action-permissions.ts`
- Modify: `lib/permissions/action-defaults.ts`
- Modify: `lib/rate-limit.ts`

- [ ] **Step 1: Add `SigningAction` type to `lib/permissions/action-permissions.ts`**

Find the section where other action types are declared (e.g. near `DocumentAction`). Add:

```typescript
export type SigningAction =
  | "signing:create_envelope"
  | "signing:read_envelope"
  | "signing:cancel_envelope";
```

Then find the `ActionPermission` union type and add `| SigningAction` to it.

Then find `ACTION_MODULES` and add:

```typescript
  signing: [
    "signing:create_envelope",
    "signing:read_envelope",
    "signing:cancel_envelope",
  ] as const,
```

- [ ] **Step 2: Add role defaults in `lib/permissions/action-defaults.ts`**

Find where each role's allowed actions are declared and add the signing actions:

```typescript
// ORG_OWNER and ADMIN — full signing access
"signing:create_envelope",
"signing:read_envelope",
"signing:cancel_envelope",

// AGENT — can create, read, and cancel own envelopes
"signing:create_envelope",
"signing:read_envelope",
"signing:cancel_envelope",

// VIEWER — read only
"signing:read_envelope",
```

> Match the exact format used in the file for other modules. `VIEWER` gets only `signing:read_envelope`.

- [ ] **Step 3: Add sign endpoint to strict rate-limit tier in `lib/rate-limit.ts`**

Find `getRateLimitTier` function. Add a regex check for the signing endpoint **before** the `strictPaths` array check:

```typescript
// Signing endpoint — strict tier (1 envelope per document is expensive)
if (/^\/api\/documents\/[^/]+\/sign$/.test(pathname)) return "strict";
```

- [ ] **Step 4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/permissions/action-permissions.ts lib/permissions/action-defaults.ts lib/rate-limit.ts
git commit -m "feat(signing): add signing permissions and strict rate-limit tier"
```

---

## Task 7: Server Action — `create-envelope` (TDD)

**Files:**
- Create: `actions/signing/create-envelope.ts`
- Create: `tests/actions/signing/create-envelope.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/signing/create-envelope.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    documents: { findFirst: vi.fn() },
    signingEnvelope: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    signingEnvelopeSigner: { createMany: vi.fn() },
  },
}));
vi.mock("@/lib/get-current-user", () => ({
  getCurrentOrgIdSafe: vi.fn(),
}));
vi.mock("@/lib/permissions/action-guards", () => ({
  requireAction: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/opensign/client", () => ({
  openSignClient: {
    uploadDocument: vi.fn().mockResolvedValue({ fileId: "file-123" }),
    createEnvelope: vi.fn().mockResolvedValue({ envelopeId: "env-456" }),
  },
}));
vi.mock("@/lib/model-encryption", () => ({
  encryptSigningEnvelopeSignerForOrg: vi.fn().mockImplementation(async (d) => d),
}));

const { prismadb } = await import("@/lib/prisma");
const { getCurrentOrgIdSafe } = await import("@/lib/get-current-user");

describe("createEnvelope", () => {
  const orgId = "org-test-123";

  const mockDoc = {
    id: "doc-001",
    organizationId: orgId,
    document_file_url: "https://blob.vercel.com/test.pdf",
    document_file_mimeType: "application/pdf",
    document_name: "encrypted-name",
  };

  beforeEach(() => {
    vi.mocked(getCurrentOrgIdSafe).mockResolvedValue(orgId);
    vi.mocked(prismadb.documents.findFirst).mockResolvedValue(mockDoc as never);
    vi.mocked(prismadb.signingEnvelope.findFirst).mockResolvedValue(null);
    vi.mocked(prismadb.signingEnvelope.create).mockResolvedValue({
      id: "envelope-789",
    } as never);
    vi.mocked(prismadb.signingEnvelopeSigner.createMany).mockResolvedValue({
      count: 1,
    } as never);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
  });

  it("returns null when not authenticated", async () => {
    vi.mocked(getCurrentOrgIdSafe).mockResolvedValue(null);
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    const result = await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    expect(result).toBeNull();
  });

  it("returns null when document is not a PDF", async () => {
    vi.mocked(prismadb.documents.findFirst).mockResolvedValue({
      ...mockDoc,
      document_file_mimeType: "image/png",
    } as never);
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    const result = await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    expect(result).toBeNull();
  });

  it("returns null when an active envelope already exists", async () => {
    vi.mocked(prismadb.signingEnvelope.findFirst).mockResolvedValue({
      id: "existing-env",
      status: "SENT",
    } as never);
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    const result = await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    expect(result).toBeNull();
  });

  it("calls OpenSign client and creates envelope record on success", async () => {
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    const result = await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    expect(openSignClient.uploadDocument).toHaveBeenCalled();
    expect(openSignClient.createEnvelope).toHaveBeenCalled();
    expect(prismadb.signingEnvelope.create).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "envelope-789" });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run tests/actions/signing/create-envelope.test.ts
```

Expected: all fail with `Cannot find module '@/actions/signing/create-envelope'`

- [ ] **Step 3: Implement `actions/signing/create-envelope.ts`**

```typescript
"use server";

import { createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { openSignClient } from "@/lib/opensign/client";
import { encryptSigningEnvelopeSignerForOrg } from "@/lib/model-encryption";
import type { SignerType } from "@prisma/client";

export interface CreateEnvelopeInput {
  documentId: string;
  subject: string;
  message?: string;
  expiresAt?: Date;
  signers: {
    name: string;
    email: string;
    signerType: "INTERNAL" | "EXTERNAL";
    userId?: string;
    order: number;
  }[];
}

const ACTIVE_STATUSES = ["DRAFT", "SENT", "IN_PROGRESS"] as const;

export async function createEnvelope(input: CreateEnvelopeInput) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:create_envelope");
  if (guard) return null;

  // Validate document exists, belongs to org, is PDF
  const document = await prismadb.documents.findFirst({
    where: { id: input.documentId, organizationId },
  });
  if (!document) return null;
  if (document.document_file_mimeType !== "application/pdf") return null;

  // Enforce one active envelope per document
  const existing = await prismadb.signingEnvelope.findFirst({
    where: {
      sourceDocumentId: input.documentId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  if (existing) return null;

  // Fetch PDF from Vercel Blob
  const blobRes = await fetch(document.document_file_url);
  if (!blobRes.ok) {
    console.error("[SIGNING] failed to fetch document blob for documentId:", input.documentId);
    return null;
  }
  const buffer = Buffer.from(await blobRes.arrayBuffer());
  const fileName = `${input.documentId}.pdf`;

  // Build per-org callback token (HMAC of orgId with webhook secret)
  const orgToken = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET ?? "")
    .update(organizationId)
    .digest("hex");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/opensign?org=${orgToken}`;

  // Upload to OpenSign
  let openSignFileId: string;
  let openSignEnvelopeId: string;
  try {
    const { fileId } = await openSignClient.uploadDocument(buffer, fileName);
    openSignFileId = fileId;

    const { envelopeId } = await openSignClient.createEnvelope({
      documentFileId: openSignFileId,
      signers: input.signers.map((s) => ({
        name: s.name,
        email: s.email,
        order: s.order,
      })),
      subject: input.subject,
      message: input.message,
      expiryDays: input.expiresAt
        ? Math.ceil((input.expiresAt.getTime() - Date.now()) / 86_400_000)
        : undefined,
      callbackUrl,
    });
    openSignEnvelopeId = envelopeId;
  } catch (err) {
    console.error("[SIGNING] opensign API call failed:", err);
    return null;
  }

  // Encrypt signer PII and persist
  try {
    const encryptedSigners = await Promise.all(
      input.signers.map((s) =>
        encryptSigningEnvelopeSignerForOrg({ name: s.name, email: s.email }, organizationId).then(
          (enc) => ({ ...s, name: enc.name, email: enc.email }),
        ),
      ),
    );

    const envelope = await prismadb.signingEnvelope.create({
      data: {
        organizationId,
        sourceDocumentId: input.documentId,
        openSignEnvelopeId,
        openSignFileId,
        status: "SENT",
        subject: input.subject,
        message: input.message ?? null,
        expiresAt: input.expiresAt ?? null,
        signers: {
          create: encryptedSigners.map((s) => ({
            signerType: s.signerType as SignerType,
            userId: s.userId ?? null,
            name: s.name,
            email: s.email,
            order: s.order,
            status: "PENDING",
            openSignSignerId: null,
          })),
        },
      },
    });
    return envelope;
  } catch (err) {
    // OpenSign succeeded but DB write failed — mark as FAILED so we can track it
    console.error("[SIGNING] DB write failed after opensign envelope creation:", err);
    // Best-effort: we can't update a record that wasn't created, so just log
    return null;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/actions/signing/create-envelope.test.ts
```

Expected: `Tests 4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add actions/signing/create-envelope.ts tests/actions/signing/create-envelope.test.ts
git commit -m "feat(signing): add create-envelope server action"
```

---

## Task 8: Server Actions — `get-envelope` + `cancel-envelope`

**Files:**
- Create: `actions/signing/get-envelope.ts`
- Create: `actions/signing/cancel-envelope.ts`

- [ ] **Step 1: Implement `actions/signing/get-envelope.ts`**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptSigningEnvelopeSignerForOrg } from "@/lib/model-encryption";

export async function getEnvelopeForDocument(documentId: string) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:read_envelope");
  if (guard) return null;

  const envelope = await prismadb.signingEnvelope.findFirst({
    where: { sourceDocumentId: documentId, organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      signers: { orderBy: { order: "asc" } },
      signedDocument: { select: { id: true, friendlyId: true } },
      createdByUser: { select: { id: true, first_name: true, last_name: true } },
    },
  });

  if (!envelope) return null;

  // Decrypt signer PII
  const decryptedSigners = await Promise.all(
    envelope.signers.map((s) =>
      decryptSigningEnvelopeSignerForOrg({ name: s.name, email: s.email }, organizationId).then(
        (dec) => ({ ...s, name: dec.name, email: dec.email }),
      ),
    ),
  );

  return { ...envelope, signers: decryptedSigners };
}
```

- [ ] **Step 2: Implement `actions/signing/cancel-envelope.ts`**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { openSignClient } from "@/lib/opensign/client";

export async function cancelEnvelope(envelopeId: string) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:cancel_envelope");
  if (guard) return null;

  const envelope = await prismadb.signingEnvelope.findFirst({
    where: { id: envelopeId, organizationId },
  });
  if (!envelope) return null;
  if (!["SENT", "IN_PROGRESS"].includes(envelope.status)) return null;

  try {
    await openSignClient.cancelEnvelope(envelope.openSignEnvelopeId);
  } catch (err) {
    console.error("[SIGNING] opensign cancel failed for envelopeId:", envelopeId, err);
    return null;
  }

  return prismadb.signingEnvelope.update({
    where: { id: envelopeId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add actions/signing/get-envelope.ts actions/signing/cancel-envelope.ts
git commit -m "feat(signing): add get-envelope and cancel-envelope server actions"
```

---

## Task 9: API Routes — Sign + Download

**Files:**
- Create: `app/api/documents/[documentId]/sign/route.ts`
- Create: `app/api/documents/[documentId]/download/route.ts`

- [ ] **Step 1: Create `app/api/documents/[documentId]/sign/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createEnvelope } from "@/actions/signing/create-envelope";
import { getEnvelopeForDocument } from "@/actions/signing/get-envelope";
import { z } from "zod";

const CreateEnvelopeSchema = z.object({
  subject: z.string().min(1).max(255),
  message: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  signers: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email(),
        signerType: z.enum(["INTERNAL", "EXTERNAL"]),
        userId: z.string().uuid().optional(),
        order: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(20),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = CreateEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const envelope = await createEnvelope({ documentId, ...parsed.data });
  if (!envelope) {
    return NextResponse.json(
      { error: "Failed to initiate signing. The document may not be a PDF, may already have an active signing request, or a server error occurred." },
      { status: 422 },
    );
  }

  return NextResponse.json({ envelopeId: envelope.id }, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await params;
  const envelope = await getEnvelopeForDocument(documentId);

  if (!envelope) return NextResponse.json({ envelope: null });
  return NextResponse.json({ envelope });
}
```

- [ ] **Step 2: Create `app/api/documents/[documentId]/download/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptDocumentForOrg } from "@/lib/model-encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await params;

  const document = await prismadb.documents.findFirst({
    where: { id: documentId, organizationId },
    select: {
      document_file_url: true,
      document_file_mimeType: true,
      document_name: true,
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { document_name: decryptedName } = await decryptDocumentForOrg(
    { document_name: document.document_name },
    organizationId,
  );

  // Proxy file through this auth-gated route
  // TODO: when Vercel Blob ships private mode, generate a presigned URL and redirect instead
  const blobRes = await fetch(document.document_file_url);
  if (!blobRes.ok) return NextResponse.json({ error: "File unavailable" }, { status: 502 });

  const content = await blobRes.arrayBuffer();
  const safeName = encodeURIComponent(`${decryptedName}.pdf`).replace(/%20/g, "_");

  return new NextResponse(content, {
    headers: {
      "Content-Type": document.document_file_mimeType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/documents/
git commit -m "feat(signing): add sign and download API routes"
```

---

## Task 10: Webhook Route Handler

**Files:**
- Create: `app/api/webhooks/opensign/route.ts`

- [ ] **Step 1: Create `app/api/webhooks/opensign/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { put } from "@vercel/blob";
import { prismadb } from "@/lib/prisma";
import { openSignClient } from "@/lib/opensign/client";
import { verifyOpenSignWebhook } from "@/lib/opensign/webhook-verifier";
import { encryptDocumentForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";
import type { OpenSignWebhookPayload } from "@/lib/opensign/types";

// In-process IP rate limit: 30 webhook calls per minute per IP
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkWebhookRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-opensign-signature") ?? "";
  const timestamp = request.headers.get("x-opensign-timestamp") ?? "";

  let valid: boolean;
  try {
    valid = verifyOpenSignWebhook(body, signature, timestamp);
  } catch {
    console.error("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!valid) {
    console.error("[OPENSIGN_WEBHOOK] invalid signature or expired timestamp from IP:", ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  const payload = JSON.parse(body) as OpenSignWebhookPayload;

  const envelope = await prismadb.signingEnvelope.findUnique({
    where: { openSignEnvelopeId: payload.envelopeId },
    include: { signers: true, sourceDocument: true },
  });

  if (!envelope) {
    // Unknown envelope — return 200 to prevent OpenSign retry storm
    console.error("[OPENSIGN_WEBHOOK] unknown envelopeId:", payload.envelopeId);
    return NextResponse.json({ received: true });
  }

  // Tenant guard: verify the org token in the query param
  const orgToken = request.nextUrl.searchParams.get("org") ?? "";
  const expectedToken = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET!)
    .update(envelope.organizationId)
    .digest("hex");
  const orgBuf = Buffer.from(orgToken);
  const expBuf = Buffer.from(expectedToken);
  if (orgBuf.length !== expBuf.length || !timingSafeEqual(orgBuf, expBuf)) {
    console.error("[OPENSIGN_WEBHOOK] org token mismatch for envelopeId:", envelope.id);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.status === "completed") {
    try {
      const signedPdfBuffer = await openSignClient.getSignedDocument(payload.envelopeId);

      // Decrypt source document name for naming the signed copy
      const { document_name: decryptedName } = await decryptDocumentForOrg(
        { document_name: envelope.sourceDocument.document_name },
        envelope.organizationId,
      );

      // Upload signed PDF to Vercel Blob
      const blob = await put(
        `documents/signed-${envelope.id}.pdf`,
        signedPdfBuffer,
        { access: "public" }, // TODO: switch to private when Vercel Blob supports it
      );

      // Encrypt signed document name
      const { document_name: encryptedName } = await encryptDocumentForOrg(
        { document_name: `${decryptedName} — Signed`, description: null },
        envelope.organizationId,
      );

      // Look up the next friendlyId — use the same helper as create-document.ts
      // (search for getNextDocumentFriendlyId or the counter pattern in that file)
      const src = envelope.sourceDocument;

      await prismadb.$transaction(async (tx) => {
        const signedDocument = await tx.documents.create({
          data: {
            organizationId: envelope.organizationId,
            document_name: encryptedName,
            description: null,
            document_file_url: blob.url,
            document_file_mimeType: "application/pdf",
            document_system_type: "CONTRACT",
            size: signedPdfBuffer.byteLength,
            // Inherit entity links and tags from source
            linkedPropertiesIds: src.linkedPropertiesIds,
            contactsIDs: src.contactsIDs,
            linkedCalendarEventsIds: src.linkedCalendarEventsIds,
            linkedTasksIds: src.linkedTasksIds,
            linkedMandatesIds: src.linkedMandatesIds,
            tags: src.tags,
            // friendlyId: use the same generation pattern as actions/signing/create-document.ts
            // For now generate a timestamped fallback; replace with real counter helper
            friendlyId: `doc-signed-${Date.now()}`,
          },
        });

        await tx.signingEnvelope.update({
          where: { id: envelope.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            signedDocumentId: signedDocument.id,
          },
        });

        await tx.signingEnvelopeSigner.updateMany({
          where: { envelopeId: envelope.id },
          data: { status: "SIGNED", signedAt: new Date() },
        });
      });

      console.log("[OPENSIGN_WEBHOOK] completed envelopeId:", envelope.id);
    } catch (err) {
      console.error(
        "[OPENSIGN_WEBHOOK] completion processing failed for envelopeId:",
        envelope.id,
        // Never log signer name/email — log ID only
        "error type:", (err as Error)?.constructor?.name,
      );
      // Return 200 to prevent retry storm; envelope stays IN_PROGRESS for manual remediation
    }
  } else if (payload.status === "declined" || payload.status === "expired") {
    const newStatus = payload.status === "declined" ? "DECLINED" : "EXPIRED";
    await prismadb.signingEnvelope.update({
      where: { id: envelope.id },
      data: { status: newStatus },
    });

    if (payload.status === "declined" && payload.signers) {
      for (const s of payload.signers) {
        if (s.status === "declined" && s.signerId) {
          await prismadb.signingEnvelopeSigner.updateMany({
            where: { envelopeId: envelope.id, openSignSignerId: s.signerId },
            data: { status: "DECLINED" },
          });
        }
      }
    }
    console.log("[OPENSIGN_WEBHOOK]", newStatus.toLowerCase(), "envelopeId:", envelope.id);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Note about `friendlyId` generation**

Search `actions/documents/create-document.ts` for how `friendlyId` is generated (likely a DB-level counter query). Replace the `doc-signed-${Date.now()}` stub with the same pattern before shipping to production.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/opensign/route.ts
git commit -m "feat(signing): add OpenSign webhook handler with HMAC + tenant guard"
```

---

## Task 11: i18n Namespace

**Files:**
- Create: `locales/en/signing.json`
- Create: `locales/el/signing.json`
- Modify: `i18n.ts`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Create `locales/en/signing.json`**

```json
{
  "modal": {
    "title": "Send for Signing",
    "steps": {
      "signers": "Signers",
      "message": "Message",
      "review": "Review & Send"
    },
    "internalSigners": "Internal signers",
    "externalSigners": "External signers",
    "addOrgMember": "Add org member",
    "addExternalSigner": "Add external signer",
    "nameLabel": "Full name",
    "emailLabel": "Email address",
    "subjectLabel": "Subject",
    "messageLabel": "Message (optional)",
    "expiryLabel": "Expiry date (optional)",
    "sendButton": "Send for Signing",
    "reviewTitle": "Signing order",
    "emptySigners": "Add at least one signer to continue",
    "loadingMembers": "Loading org members…",
    "errorLoadingMembers": "Failed to load org members",
    "unsavedChanges": "You have unsaved changes. Are you sure you want to close?",
    "sendError": "Failed to send for signing. Please try again."
  },
  "status": {
    "DRAFT": "Draft",
    "SENT": "Sent",
    "IN_PROGRESS": "In progress",
    "COMPLETED": "Completed",
    "DECLINED": "Declined",
    "EXPIRED": "Expired",
    "CANCELLED": "Cancelled",
    "FAILED": "Failed"
  },
  "signerStatus": {
    "PENDING": "Pending",
    "SENT": "Sent",
    "VIEWED": "Viewed",
    "SIGNED": "Signed",
    "DECLINED": "Declined"
  },
  "signerType": {
    "INTERNAL": "Team member",
    "EXTERNAL": "External"
  },
  "tab": {
    "title": "Signing",
    "noEnvelope": "No signing requests yet",
    "sendButton": "Send for Signing",
    "cancelButton": "Cancel signing",
    "signedDocument": "View signed document",
    "cancelConfirm": "Are you sure you want to cancel this signing request?"
  },
  "trigger": {
    "send": "Send for Signing",
    "inProgress": "Signing in progress",
    "sign": "Sign"
  },
  "errors": {
    "notPdf": "Only PDF documents can be sent for signing",
    "activeEnvelope": "A signing request is already active for this document",
    "sendFailed": "Failed to initiate signing. Please try again.",
    "cancelFailed": "Failed to cancel signing request."
  }
}
```

- [ ] **Step 2: Create `locales/el/signing.json`**

```json
{
  "modal": {
    "title": "Αποστολή για Υπογραφή",
    "steps": {
      "signers": "Υπογράφοντες",
      "message": "Μήνυμα",
      "review": "Έλεγχος & Αποστολή"
    },
    "internalSigners": "Εσωτερικοί υπογράφοντες",
    "externalSigners": "Εξωτερικοί υπογράφοντες",
    "addOrgMember": "Προσθήκη μέλους",
    "addExternalSigner": "Προσθήκη εξωτερικού υπογράφοντα",
    "nameLabel": "Ονοματεπώνυμο",
    "emailLabel": "Διεύθυνση email",
    "subjectLabel": "Θέμα",
    "messageLabel": "Μήνυμα (προαιρετικό)",
    "expiryLabel": "Ημερομηνία λήξης (προαιρετική)",
    "sendButton": "Αποστολή για Υπογραφή",
    "reviewTitle": "Σειρά υπογραφής",
    "emptySigners": "Προσθέστε τουλάχιστον έναν υπογράφοντα",
    "loadingMembers": "Φόρτωση μελών…",
    "errorLoadingMembers": "Αποτυχία φόρτωσης μελών",
    "unsavedChanges": "Έχετε μη αποθηκευμένες αλλαγές. Θέλετε σίγουρα να κλείσετε;",
    "sendError": "Αποτυχία αποστολής για υπογραφή. Παρακαλώ δοκιμάστε ξανά."
  },
  "status": {
    "DRAFT": "Πρόχειρο",
    "SENT": "Εστάλη",
    "IN_PROGRESS": "Σε εξέλιξη",
    "COMPLETED": "Ολοκληρώθηκε",
    "DECLINED": "Απορρίφθηκε",
    "EXPIRED": "Έληξε",
    "CANCELLED": "Ακυρώθηκε",
    "FAILED": "Απέτυχε"
  },
  "signerStatus": {
    "PENDING": "Εκκρεμεί",
    "SENT": "Εστάλη",
    "VIEWED": "Εμφανίστηκε",
    "SIGNED": "Υπεγράφη",
    "DECLINED": "Απορρίφθηκε"
  },
  "signerType": {
    "INTERNAL": "Μέλος ομάδας",
    "EXTERNAL": "Εξωτερικός"
  },
  "tab": {
    "title": "Υπογραφές",
    "noEnvelope": "Δεν υπάρχουν αιτήματα υπογραφής",
    "sendButton": "Αποστολή για Υπογραφή",
    "cancelButton": "Ακύρωση υπογραφής",
    "signedDocument": "Προβολή υπογεγραμμένου εγγράφου",
    "cancelConfirm": "Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το αίτημα υπογραφής;"
  },
  "trigger": {
    "send": "Αποστολή για Υπογραφή",
    "inProgress": "Υπογραφή σε εξέλιξη",
    "sign": "Υπογραφή"
  },
  "errors": {
    "notPdf": "Μόνο έγγραφα PDF μπορούν να σταλούν για υπογραφή",
    "activeEnvelope": "Υπάρχει ήδη ενεργό αίτημα υπογραφής για αυτό το έγγραφο",
    "sendFailed": "Αποτυχία εκκίνησης υπογραφής. Παρακαλώ δοκιμάστε ξανά.",
    "cancelFailed": "Αποτυχία ακύρωσης αιτήματος υπογραφής."
  }
}
```

- [ ] **Step 3: Register in `i18n.ts`**

At the top of `i18n.ts`, alongside the other static imports, add:

```typescript
import signingEn from "./locales/en/signing.json";
import signingEl from "./locales/el/signing.json";
```

In the `loadMessages` function, add to both locale branches:

```typescript
// in locale === "el" branch:
messages.signing = signingEl;

// in locale === "en" branch (or default):
messages.signing = signingEn;
```

> Match the exact branching pattern already used in the file for other namespaces.

- [ ] **Step 4: Register in `app/[locale]/layout.tsx`**

Alongside the existing static imports, add:

```typescript
import signingEn from "@/locales/en/signing.json";
import signingEl from "@/locales/el/signing.json";
```

Then in the messages object construction (wherever other namespaces are spread), add:

```typescript
signing: locale === "el" ? signingEl : signingEn,
```

> Match the exact pattern already used for other namespaces in this file.

- [ ] **Step 5: Commit**

```bash
git add locales/en/signing.json locales/el/signing.json i18n.ts app/[locale]/layout.tsx
git commit -m "feat(signing): add signing i18n namespace (en + el)"
```

---

## Task 12: `SendForSigningModal` Component

**Files:**
- Create: `components/signing/SendForSigningModal.tsx`

- [ ] **Step 1: Create `components/signing/SendForSigningModal.tsx`**

Reference patterns:
- Multi-step shell: `components/import/ImportWizardModal.tsx`
- Drag-to-reorder: `components/property-images/PropertyImageUploader.tsx` (uses `@dnd-kit/sortable`)
- Step indicator: `components/import/ImportWizardSteps.tsx`

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, Loader2 } from "lucide-react";

interface Signer {
  id: string; // client-side key
  name: string;
  email: string;
  signerType: "INTERNAL" | "EXTERNAL";
  userId?: string;
}

interface OrgMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface SendForSigningModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  onSuccess: () => void;
}

function SortableSigner({
  signer,
  index,
  onRemove,
}: {
  signer: Signer;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: signer.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
    >
      <span className="text-muted-foreground text-sm w-5 shrink-0">{index + 1}</span>
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{signer.name}</p>
        <p className="text-xs text-muted-foreground truncate">{signer.email}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        {signer.signerType === "INTERNAL" ? "Team" : "External"}
      </Badge>
      <button
        onClick={() => onRemove(signer.id)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove signer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SendForSigningModal({
  open,
  onClose,
  documentId,
  documentName,
  onSuccess,
}: SendForSigningModalProps) {
  const t = useTranslations("signing");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [subject, setSubject] = useState(`${documentName} — Signature Required`);
  const [message, setMessage] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSigners((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function addExternalSigner() {
    if (!externalName.trim() || !externalEmail.trim()) return;
    setSigners((prev) => [
      ...prev,
      {
        id: `ext-${Date.now()}`,
        name: externalName.trim(),
        email: externalEmail.trim(),
        signerType: "EXTERNAL",
      },
    ]);
    setExternalName("");
    setExternalEmail("");
  }

  function removeSigner(id: string) {
    setSigners((prev) => prev.filter((s) => s.id !== id));
  }

  function handleClose() {
    const hasContent = signers.length > 0 || message.trim();
    if (hasContent) {
      setConfirmClose(true);
    } else {
      resetAndClose();
    }
  }

  function resetAndClose() {
    setStep(1);
    setSigners([]);
    setSubject(`${documentName} — Signature Required`);
    setMessage("");
    setError(null);
    setConfirmClose(false);
    onClose();
  }

  async function handleSend() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message: message || undefined,
          signers: signers.map((s, i) => ({
            name: s.name,
            email: s.email,
            signerType: s.signerType,
            userId: s.userId,
            order: i + 1,
          })),
        }),
      });
      if (!res.ok) {
        setError(t("modal.sendError"));
        return;
      }
      onSuccess();
      resetAndClose();
    } catch {
      setError(t("modal.sendError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const steps = [t("modal.steps.signers"), t("modal.steps.message"), t("modal.steps.review")];

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("modal.title")}</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-4">
            {steps.map((label, i) => (
              <div
                key={label}
                className={`flex-1 text-center text-xs py-1 rounded ${
                  step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Step 1: Signers */}
          {step === 1 && (
            <div className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={signers.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {signers.map((s, i) => (
                      <SortableSigner
                        key={s.id}
                        signer={s}
                        index={i}
                        onRemove={removeSigner}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {signers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("modal.emptySigners")}
                </p>
              )}

              {/* Add external signer */}
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("modal.addExternalSigner")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("modal.nameLabel")}</Label>
                    <Input
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder="Full name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("modal.emailLabel")}</Label>
                    <Input
                      type="email"
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addExternalSigner}
                  disabled={!externalName.trim() || !externalEmail.trim()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("modal.addExternalSigner")}
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={signers.length === 0}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Message */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>{t("modal.subjectLabel")}</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>{t("modal.messageLabel")}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Optional note to all signers…"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{t("modal.reviewTitle")}</p>
              <ol className="space-y-2">
                {signers.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">({s.email})</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {s.signerType === "INTERNAL" ? t("signerType.INTERNAL") : t("signerType.EXTERNAL")}
                    </Badge>
                  </li>
                ))}
              </ol>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleSend} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("modal.sendButton")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved-changes confirm dialog */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("modal.unsavedChanges")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmClose(false)}>Keep editing</Button>
            <Button variant="destructive" onClick={resetAndClose}>Discard</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/signing/SendForSigningModal.tsx
git commit -m "feat(signing): add SendForSigningModal component"
```

---

## Task 13: `SigningTab` Component

**Files:**
- Create: `app/[locale]/app/(routes)/documents/[slug]/components/SigningTab.tsx`

- [ ] **Step 1: Create `SigningTab.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Clock, Eye, FileSignature, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cancelEnvelope } from "@/actions/signing/cancel-envelope";
import type { SignerStatus, SigningEnvelopeStatus } from "@prisma/client";

interface Signer {
  id: string;
  name: string;
  email: string;
  order: number;
  status: SignerStatus;
  signerType: "INTERNAL" | "EXTERNAL";
  signedAt: Date | null;
}

interface Envelope {
  id: string;
  status: SigningEnvelopeStatus;
  subject: string;
  completedAt: Date | null;
  signedDocument: { id: string; friendlyId: string } | null;
  signers: Signer[];
}

interface SigningTabProps {
  documentId: string;
  initialEnvelope: Envelope | null;
}

const STATUS_ICON: Record<SignerStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
  SENT: <Clock className="h-4 w-4 text-blue-500" />,
  VIEWED: <Eye className="h-4 w-4 text-yellow-500" />,
  SIGNED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  DECLINED: <XCircle className="h-4 w-4 text-destructive" />,
};

const ENVELOPE_BADGE_VARIANT: Record<
  SigningEnvelopeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SENT: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED: "default",
  DECLINED: "destructive",
  EXPIRED: "destructive",
  CANCELLED: "outline",
  FAILED: "destructive",
};

export function SigningTab({ documentId, initialEnvelope }: SigningTabProps) {
  const t = useTranslations("signing");
  const [envelope, setEnvelope] = useState<Envelope | null>(initialEnvelope);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Poll for status updates when envelope is active
  useEffect(() => {
    if (!envelope || ["COMPLETED", "DECLINED", "EXPIRED", "CANCELLED", "FAILED"].includes(envelope.status)) {
      return;
    }
    const interval = setInterval(async () => {
      const res = await fetch(`/api/documents/${documentId}/sign`);
      if (res.ok) {
        const data = await res.json();
        if (data.envelope) setEnvelope(data.envelope);
      }
    }, 15_000); // poll every 15s while active
    return () => clearInterval(interval);
  }, [documentId, envelope?.status]);

  async function handleCancel() {
    if (!envelope) return;
    setIsCancelling(true);
    await cancelEnvelope(envelope.id);
    setEnvelope((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    setIsCancelling(false);
    setConfirmCancel(false);
  }

  if (!envelope) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSignature className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t("tab.noEnvelope")}</p>
      </div>
    );
  }

  const isActive = ["SENT", "IN_PROGRESS"].includes(envelope.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={ENVELOPE_BADGE_VARIANT[envelope.status]}>
            {t(`status.${envelope.status}`)}
          </Badge>
          <span className="text-sm text-muted-foreground">{envelope.subject}</span>
        </div>
        {isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmCancel(true)}
            disabled={isCancelling}
          >
            {isCancelling && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {t("tab.cancelButton")}
          </Button>
        )}
      </div>

      {/* Signer list */}
      <ol className="space-y-3">
        {envelope.signers.map((signer) => (
          <li key={signer.id} className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-5">{signer.order}.</span>
            {STATUS_ICON[signer.status]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{signer.name}</p>
              <p className="text-xs text-muted-foreground">{t(`signerStatus.${signer.status}`)}</p>
            </div>
            {signer.signedAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(signer.signedAt).toLocaleDateString()}
              </span>
            )}
          </li>
        ))}
      </ol>

      {envelope.status === "COMPLETED" && envelope.signedDocument && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/api/documents/${envelope.signedDocument.id}/download`}>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            {t("tab.signedDocument")}
          </Link>
        </Button>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tab.cancelButton")}</AlertDialogTitle>
            <AlertDialogDescription>{t("tab.cancelConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              {t("tab.cancelButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(routes)/documents/[slug]/components/SigningTab.tsx
git commit -m "feat(signing): add SigningTab component"
```

---

## Task 14: DocumentDetail Integration

**Files:**
- Modify: `app/[locale]/app/(routes)/documents/[slug]/components/DocumentDetail.tsx`

- [ ] **Step 1: Fetch envelope in `DocumentDetail` and add Signing tab**

In `DocumentDetail.tsx`, add the following imports at the top:

```typescript
import { SendForSigningModal } from "@/components/signing/SendForSigningModal";
import { SigningTab } from "./SigningTab";
```

Add state for the modal and envelope near other state declarations:

```typescript
const [signingModalOpen, setSigningModalOpen] = useState(false);
const [signingEnvelope, setSigningEnvelope] = useState<Envelope | null>(null);
const [envelopeLoaded, setEnvelopeLoaded] = useState(false);
```

Fetch the envelope on mount (add inside a `useEffect` or use SWR):

```typescript
useEffect(() => {
  fetch(`/api/documents/${document.id}/sign`)
    .then((r) => r.json())
    .then((data) => {
      setSigningEnvelope(data.envelope ?? null);
      setEnvelopeLoaded(true);
    })
    .catch(() => setEnvelopeLoaded(true));
}, [document.id]);
```

In the header action row (alongside Share / Archive buttons), add:

```typescript
{document.document_file_mimeType === "application/pdf" && (
  <>
    {!signingEnvelope || ["COMPLETED","DECLINED","EXPIRED","CANCELLED","FAILED"].includes(signingEnvelope.status) ? (
      <Button size="sm" variant="outline" onClick={() => setSigningModalOpen(true)}>
        <FileSignature className="h-4 w-4 mr-1" />
        {t("signing.trigger.send")}
      </Button>
    ) : (
      <Badge variant="secondary">{t(`signing.status.${signingEnvelope.status}`)}</Badge>
    )}
  </>
)}
```

In the existing `<Tabs>` component, add the Signing tab alongside Details / Views / Sharing:

```typescript
{envelopeLoaded && (
  <TabsTrigger value="signing">
    {t("signing.tab.title")}
  </TabsTrigger>
)}

// And the corresponding panel:
<TabsContent value="signing">
  <SigningTab
    documentId={document.id}
    initialEnvelope={signingEnvelope}
  />
</TabsContent>
```

Add `SendForSigningModal` at the bottom of the component tree:

```typescript
<SendForSigningModal
  open={signingModalOpen}
  onClose={() => setSigningModalOpen(false)}
  documentId={document.id}
  documentName={document.document_name}
  onSuccess={() => {
    setSigningModalOpen(false);
    // Refresh envelope state
    fetch(`/api/documents/${document.id}/sign`)
      .then((r) => r.json())
      .then((data) => setSigningEnvelope(data.envelope ?? null));
  }}
/>
```

- [ ] **Step 2: Add `FileSignature` import**

Add to icon imports: `import { FileSignature } from "lucide-react";`

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(routes)/documents/[slug]/components/DocumentDetail.tsx
git commit -m "feat(signing): integrate signing tab and send button into DocumentDetail"
```

---

## Task 15: Deal Stage Integration

**Files:**
- Modify: `app/[locale]/app/(routes)/deals/[dealId]/components/EditDealForm.tsx`

> Deal stage panels do not currently show linked documents. This task adds a minimal document
> list to the `PRELIMINARY_AGREEMENT`, `DUE_DILIGENCE`, and `SIGNING` stage detail areas,
> with a "Sign" button on each PDF document row. Consult `EditDealForm.tsx` to find where
> stage-specific panel content is rendered before adding the following.

- [ ] **Step 1: Add document display to relevant stage panels in `EditDealForm.tsx`**

Find where the stage detail panel renders content for specific stages. Add a `StagePDFDocuments` sub-component inline:

```typescript
"use client";

import { useEffect, useState } from "react";
import { SendForSigningModal } from "@/components/signing/SendForSigningModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

// Add inside EditDealForm or as a local sub-component:
function StagePDFDocuments({ dealId }: { dealId: string }) {
  const t = useTranslations("signing");
  const [docs, setDocs] = useState<
    { id: string; document_name: string; document_file_mimeType: string; friendlyId: string }[]
  >([]);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [signingDocName, setSigningDocName] = useState("");

  useEffect(() => {
    // Fetch documents linked to this deal via the existing getDocuments action
    // Pass dealId as a filter — check actions/documents/get-documents.ts for the param name
    // This is a placeholder; replace with actual SWR hook or fetch matching codebase patterns
    fetch(`/api/documents?dealId=${dealId}`)
      .then((r) => r.json())
      .then((data) => setDocs(data.documents ?? []));
  }, [dealId]);

  const pdfs = docs.filter((d) => d.document_file_mimeType === "application/pdf");
  if (pdfs.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Documents
      </p>
      {pdfs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{doc.document_name}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => { setSigningDocId(doc.id); setSigningDocName(doc.document_name); }}
          >
            <FileSignature className="h-3 w-3 mr-1" />
            {t("trigger.sign")}
          </Button>
        </div>
      ))}
      {signingDocId && (
        <SendForSigningModal
          open={!!signingDocId}
          onClose={() => setSigningDocId(null)}
          documentId={signingDocId}
          documentName={signingDocName}
          onSuccess={() => setSigningDocId(null)}
        />
      )}
    </div>
  );
}
```

Place `<StagePDFDocuments dealId={deal.id} />` inside the panel content for stages
`PRELIMINARY_AGREEMENT`, `DUE_DILIGENCE`, and `SIGNING`.

- [ ] **Step 2: Note on document fetch**

The `fetch(\`/api/documents?dealId=${dealId}\`)` call above is a placeholder. Inspect
`actions/documents/get-documents.ts` to find the correct parameter name for filtering by deal,
then use the same pattern (SWR hook or direct action call) as the rest of `EditDealForm`.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(routes)/deals/[dealId]/components/EditDealForm.tsx
git commit -m "feat(signing): add document list + sign trigger to deal stage panels"
```

---

## Task 16: Contact + Property Page Integration

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/ContactView.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx`

- [ ] **Step 1: Add Sign button to Contact documents tab in `ContactView.tsx`**

Find where linked documents are rendered in the Documents tab. Add a Sign button to each PDF row, following the same pattern as Task 15's `StagePDFDocuments`:

```typescript
import { SendForSigningModal } from "@/components/signing/SendForSigningModal";
import { FileSignature } from "lucide-react";
import { useTranslations } from "next-intl";

// In the component:
const t = useTranslations("signing");
const [signingDocId, setSigningDocId] = useState<string | null>(null);
const [signingDocName, setSigningDocName] = useState("");

// In each document row, after existing actions:
{doc.document_file_mimeType === "application/pdf" && (
  <Button
    size="sm"
    variant="ghost"
    className="h-7 px-2"
    onClick={() => { setSigningDocId(doc.id); setSigningDocName(doc.document_name); }}
  >
    <FileSignature className="h-3 w-3 mr-1" />
    {t("trigger.sign")}
  </Button>
)}

// At the bottom of the component tree:
{signingDocId && (
  <SendForSigningModal
    open={!!signingDocId}
    onClose={() => setSigningDocId(null)}
    documentId={signingDocId}
    documentName={signingDocName}
    onSuccess={() => setSigningDocId(null)}
  />
)}
```

- [ ] **Step 2: Repeat the same pattern in `PropertyView.tsx`**

Same imports, same state, same button pattern. The exact location of the document row rendering
differs — consult the file to find where document rows are displayed in the property's documents tab.

- [ ] **Step 3: Run TypeScript check**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add \
  app/[locale]/app/\(routes\)/crm/contacts/\[contactId\]/components/ContactView.tsx \
  app/[locale]/app/\(routes\)/mls/properties/\[slug\]/components/PropertyView.tsx
git commit -m "feat(signing): add sign trigger to Contact and Property document tabs"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Schema: `SigningEnvelope`, `SigningEnvelopeSigner`, enums, indexes, unique constraints | Task 1 |
| Schema: back-relations on `Documents` | Task 1 |
| `lib/opensign/types.ts` with all types | Task 2 |
| Webhook verifier with HMAC, length check, replay protection | Task 3 |
| OpenSign API client, singleton, typed errors | Task 4 |
| Encryption wrappers (encrypt + decrypt) | Task 5 |
| Permissions: `SigningAction` type, module constant, role defaults | Task 6 |
| Rate limiting: sign POST → strict tier | Task 6 |
| `create-envelope` action with org-token callback URL | Task 7 |
| `get-envelope` + `cancel-envelope` actions | Task 8 |
| Sign API route (POST + GET) with Zod validation | Task 9 |
| Download route as auth-gated proxy | Task 9 |
| Webhook route: rate limit, HMAC, replay, tenant guard, signed doc creation | Task 10 |
| `friendlyId` generation note for webhook handler | Task 10 (note) |
| i18n: en + el + dual registration | Task 11 |
| `SendForSigningModal`: 3-step, drag-to-reorder, unsaved-changes guard | Task 12 |
| `SigningTab`: status, signer list, cancel, signed doc link, polling | Task 13 |
| Document detail: Send button + Signing tab | Task 14 |
| Deal stage: document list + Sign trigger | Task 15 |
| Contact + Property: Sign trigger | Task 16 |
| `.env.example` with all three OpenSign vars | Task 1 |
| `proxy.ts` — no change needed (confirmed) | Noted in spec, no task |
| OpenSign endpoint paths must be verified against v1.2 docs | Task 4 (note) |

**Type consistency check:** All types defined in Task 2 (`CreateEnvelopeOpts`, `EnvelopeStatus`, `OpenSignWebhookPayload`, etc.) are consumed correctly in Tasks 4, 7, and 10. `SigningEnvelopeStatus`, `SignerStatus`, `SignerType` are Prisma-generated enums used in Tasks 8, 9, 13, and 16.

**No placeholders:** The `friendlyId` generation in Task 10 is explicitly noted as a stub requiring a real helper — not silent.

---
