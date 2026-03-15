import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    piiAccessLog: {
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

const { logPiiAccess, PiiAction } = await import("@/lib/pii-access-log");

describe("logPiiAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates an audit log entry with all required fields", async () => {
    await logPiiAccess({
      userId: "user-1",
      organizationId: "org-1",
      entityType: "CLIENT",
      entityId: "client-1",
      action: PiiAction.DECRYPT,
      fields: ["client_name", "primary_email"],
      source: "GET /api/crm/clients/[id]",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        organizationId: "org-1",
        entityType: "CLIENT",
        entityId: "client-1",
        action: "DECRYPT",
        fields: ["client_name", "primary_email"],
        source: "GET /api/crm/clients/[id]",
        ipAddress: undefined,
      },
    });
  });

  it("includes optional ipAddress when provided", async () => {
    await logPiiAccess({
      userId: "user-1",
      organizationId: "org-1",
      entityType: "PROPERTY",
      entityId: "prop-1",
      action: PiiAction.API_RESPONSE,
      fields: ["primary_email"],
      source: "GET /api/v1/properties/[id]",
      ipAddress: "192.168.1.1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "192.168.1.1",
        action: "API_RESPONSE",
      }),
    });
  });

  it("does not throw on database errors (fire-and-forget logging)", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    // Should not throw — logging failures must not break the main flow
    await expect(
      logPiiAccess({
        userId: "user-1",
        organizationId: "org-1",
        entityType: "CLIENT",
        entityId: "client-1",
        action: PiiAction.DECRYPT,
        fields: ["client_name"],
        source: "test",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts all valid PiiAction values", () => {
    expect(PiiAction.DECRYPT).toBe("DECRYPT");
    expect(PiiAction.EXPORT).toBe("EXPORT");
    expect(PiiAction.WEBHOOK_SEND).toBe("WEBHOOK_SEND");
    expect(PiiAction.API_RESPONSE).toBe("API_RESPONSE");
  });
});
