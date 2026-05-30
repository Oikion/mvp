import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
    createEnvelope: vi.fn().mockResolvedValue({ envelopeId: "env-456", signers: [] }),
    cancelEnvelope: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("@/lib/model-encryption", () => ({
  encryptSigningEnvelopeSignerForOrg: vi.fn().mockImplementation(async (d) => d),
}));

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

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
    vi.stubEnv("OPENSIGN_WEBHOOK_SECRET", "test-webhook-secret-abcdef1234567890");
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

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
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

  it("returns null when OPENSIGN_WEBHOOK_SECRET is not set", async () => {
    vi.unstubAllEnvs();
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

  it("duplicate-envelope check includes organizationId in the where clause", async () => {
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    expect(vi.mocked(prismadb.signingEnvelope.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: orgId }),
      }),
    );
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

  it("calls cancelEnvelope when DB write fails after OpenSign succeeds", async () => {
    vi.mocked(prismadb.signingEnvelope.create).mockRejectedValueOnce(new Error("DB error"));
    const { createEnvelope } = await import("@/actions/signing/create-envelope");
    const result = await createEnvelope({
      documentId: "doc-001",
      subject: "Sign this",
      signers: [{ name: "Alice", email: "alice@test.com", signerType: "EXTERNAL", order: 1 }],
    });
    const { openSignClient } = await import("@/lib/opensign/client");
    expect(openSignClient.cancelEnvelope).toHaveBeenCalledWith("env-456");
    expect(result).toBeNull();
  });
});
