import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

// ─── Mocks (hoisted before imports) ───────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    signingEnvelope: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    signingEnvelopeSigner: {
      updateMany: vi.fn(),
    },
    documents: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/opensign/webhook-verifier", () => ({
  verifyOpenSignWebhook: vi.fn(),
}));

vi.mock("@/lib/opensign/client", () => ({
  openSignClient: {
    getSignedDocument: vi.fn(),
  },
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptDocumentForOrg: vi.fn(),
  decryptDocumentForOrg: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

vi.mock("@/lib/friendly-id", () => ({
  generateFriendlyId: vi.fn(),
}));

// ─── Imports after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/webhooks/opensign/route";
import { prismadb } from "@/lib/prisma";
import { verifyOpenSignWebhook } from "@/lib/opensign/webhook-verifier";
import { openSignClient } from "@/lib/opensign/client";
import { encryptDocumentForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";
import { put } from "@vercel/blob";
import { generateFriendlyId } from "@/lib/friendly-id";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-webhook-secret-32chars-long!!";
const ORG_ID = "org-test-abc123";

function makeOrgToken(orgId: string = ORG_ID): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(orgId).digest("hex");
}

function makeRequest(body: object, options: { validSig?: boolean; orgToken?: string } = {}) {
  const bodyStr = JSON.stringify(body);
  const orgToken = options.orgToken ?? makeOrgToken();
  const url = `http://localhost/api/webhooks/opensign?org=${orgToken}`;

  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "x-opensign-signature": "deadbeef",
      "x-opensign-timestamp": String(Math.floor(Date.now() / 1000)),
    },
    body: bodyStr,
  });
}

const mockEnvelope = {
  id: "env-cuid-001",
  openSignEnvelopeId: "opensign-env-uuid-001",
  organizationId: ORG_ID,
  status: "IN_PROGRESS",
  signers: [
    {
      id: "signer-cuid-001",
      order: 1,
      openSignSignerId: null,
      status: "SENT",
    },
  ],
  sourceDocument: {
    id: "doc-cuid-001",
    document_name: "encrypted-name",
    linkedPropertiesIds: [],
    contactsIDs: [],
    linkedCalendarEventsIds: [],
    linkedTasksIds: [],
    linkedMandatesIds: [],
    tags: [],
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/opensign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENSIGN_WEBHOOK_SECRET = WEBHOOK_SECRET;
    (verifyOpenSignWebhook as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("returns 400 for invalid HMAC signature", async () => {
    (verifyOpenSignWebhook as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const req = makeRequest({ envelopeId: "any", status: "completed" });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for malformed JSON body with valid HMAC", async () => {
    // verifyOpenSignWebhook returns true (HMAC passes), but body is not valid JSON
    const url = `http://localhost/api/webhooks/opensign?org=${makeOrgToken()}`;
    const req = new NextRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
        "x-opensign-signature": "deadbeef",
        "x-opensign-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: "not-valid-json{{{{",
    });

    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 401 when org token does not match envelope organizationId", async () => {
    (prismadb.signingEnvelope.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope,
    );

    // Use a wrong org ID to generate a mismatched token
    const wrongToken = makeOrgToken("org-wrong-id");
    const req = makeRequest(
      { envelopeId: mockEnvelope.openSignEnvelopeId, status: "in_progress", signers: [] },
      { orgToken: wrongToken },
    );

    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 and creates signed document on COMPLETED status", async () => {
    (prismadb.signingEnvelope.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope,
    );
    (prismadb.signingEnvelopeSigner.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 0,
    });

    const signedPdfBuffer = Buffer.from("fake-pdf-bytes");
    (openSignClient.getSignedDocument as ReturnType<typeof vi.fn>).mockResolvedValue(
      signedPdfBuffer,
    );

    (decryptDocumentForOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      document_name: "Sale Agreement",
    });

    (encryptDocumentForOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      document_name: "encrypted-sale-agreement-signed",
    });

    (put as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "https://blob.vercel-storage.com/signed.pdf",
    });

    (generateFriendlyId as ReturnType<typeof vi.fn>).mockResolvedValue("DOC-0042");

    const createdSignedDoc = { id: "signed-doc-cuid-001" };
    (prismadb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: typeof prismadb) => Promise<unknown>) => {
        const txMock = {
          documents: { create: vi.fn().mockResolvedValue(createdSignedDoc) },
          signingEnvelope: { update: vi.fn().mockResolvedValue({}) },
          signingEnvelopeSigner: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return callback(txMock as any);
      },
    );

    const req = makeRequest({
      envelopeId: mockEnvelope.openSignEnvelopeId,
      status: "completed",
      signers: [{ signerId: "opensign-signer-uuid-001", status: "completed" }],
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // Signed document should be created and blob uploaded
    expect(openSignClient.getSignedDocument).toHaveBeenCalledWith(
      mockEnvelope.openSignEnvelopeId,
    );
    expect(put).toHaveBeenCalledWith(
      `documents/signed-${mockEnvelope.id}.pdf`,
      signedPdfBuffer,
      { access: "private" },
    );
    expect(prismadb.$transaction).toHaveBeenCalled();
  });

  it("returns 200 and marks the declining signer DECLINED on DECLINED status", async () => {
    (prismadb.signingEnvelope.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope,
    );
    (prismadb.signingEnvelope.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismadb.signingEnvelopeSigner.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
    });

    const req = makeRequest({
      envelopeId: mockEnvelope.openSignEnvelopeId,
      status: "declined",
      signers: [{ signerId: "opensign-signer-uuid-001", status: "declined" }],
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);

    expect(prismadb.signingEnvelope.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockEnvelope.id },
        data: expect.objectContaining({ status: "DECLINED" }),
      }),
    );

    expect(prismadb.signingEnvelopeSigner.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          envelopeId: mockEnvelope.id,
          openSignSignerId: "opensign-signer-uuid-001",
        }),
        data: { status: "DECLINED" },
      }),
    );
  });

  it("hydrates openSignSignerId from payload for signers with null ID", async () => {
    const envelopeWithNullSigner = {
      ...mockEnvelope,
      signers: [{ ...mockEnvelope.signers[0], openSignSignerId: null }],
    };

    (prismadb.signingEnvelope.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      envelopeWithNullSigner,
    );
    (prismadb.signingEnvelopeSigner.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
    });
    (prismadb.signingEnvelope.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const req = makeRequest({
      envelopeId: mockEnvelope.openSignEnvelopeId,
      status: "in_progress",
      signers: [{ signerId: "opensign-signer-uuid-001", status: "sent" }],
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);

    // Step 0 hydration: updateMany should be called to set openSignSignerId
    expect(prismadb.signingEnvelopeSigner.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          envelopeId: mockEnvelope.id,
          order: 1,
          openSignSignerId: null,
        }),
        data: { openSignSignerId: "opensign-signer-uuid-001" },
      }),
    );
  });

  it("returns 200 for unknown envelopeId without retrying", async () => {
    (prismadb.signingEnvelope.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = makeRequest({
      envelopeId: "unknown-envelope-id",
      status: "completed",
      signers: [],
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // Should not attempt any DB writes for unknown envelopes
    expect(prismadb.$transaction).not.toHaveBeenCalled();
    expect(prismadb.signingEnvelope.update).not.toHaveBeenCalled();
  });
});
