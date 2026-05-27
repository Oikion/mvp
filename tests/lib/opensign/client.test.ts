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
