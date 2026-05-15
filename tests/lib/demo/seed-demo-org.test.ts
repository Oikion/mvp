import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prismadb
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    $transaction: vi.fn(async (fn) => fn(mockTx)),
  },
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptContactForOrg: vi.fn(async (data) => data),
  encryptPropertyForOrg: vi.fn(async (data) => data),
  encryptRequestForOrg: vi.fn(async (data) => data),
}));

const mockTx = {
  channel: { create: vi.fn().mockResolvedValue({ id: "ch_1" }) },
  channelMember: { create: vi.fn() },
  contact: { createMany: vi.fn() },
  properties: { createMany: vi.fn() },
  request: { createMany: vi.fn() },
  message: { createMany: vi.fn() },
  documents: { createMany: vi.fn() },
  propertyComment: { createMany: vi.fn() },
  contactComment: { createMany: vi.fn() },
  organizationSettings: { upsert: vi.fn() },
};

import { seedDemoOrg } from "@/lib/demo/seed-demo-org";
import { prismadb } from "@/lib/prisma";
import { encryptContactForOrg, encryptPropertyForOrg, encryptRequestForOrg } from "@/lib/model-encryption";

describe("seedDemoOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mockTx fns to resolved undefined
    mockTx.channel.create.mockResolvedValue({ id: "ch_1" });
    mockTx.channelMember.create.mockResolvedValue(undefined);
    mockTx.contact.createMany.mockResolvedValue(undefined);
    mockTx.properties.createMany.mockResolvedValue(undefined);
    mockTx.request.createMany.mockResolvedValue(undefined);
    mockTx.message.createMany.mockResolvedValue(undefined);
    mockTx.documents.createMany.mockResolvedValue(undefined);
    mockTx.propertyComment.createMany.mockResolvedValue(undefined);
    mockTx.contactComment.createMany.mockResolvedValue(undefined);
    mockTx.organizationSettings.upsert.mockResolvedValue(undefined);
  });

  it("runs inside a Prisma transaction", async () => {
    await seedDemoOrg("org_test", "user_1", "el");
    expect(prismadb.$transaction).toHaveBeenCalledTimes(1);
  });

  it("creates a General channel for messages", async () => {
    await seedDemoOrg("org_test", "user_1", "el");
    expect(mockTx.channel.create).toHaveBeenCalledTimes(1);
    const call = mockTx.channel.create.mock.calls[0][0];
    expect(call.data).toMatchObject({
      organizationId: "org_test",
      slug: "general",
      isDefault: true,
      isE2ee: false,
    });
  });

  it("seeds contacts with the correct organizationId", async () => {
    await seedDemoOrg("org_test", "user_1", "el");
    expect(mockTx.contact.createMany).toHaveBeenCalledTimes(1);
    const call = mockTx.contact.createMany.mock.calls[0][0];
    expect(call.data).toHaveLength(8);
    for (const contact of call.data) {
      expect(contact.organizationId).toBe("org_test");
    }
  });

  it("seeds properties with the correct organizationId", async () => {
    await seedDemoOrg("org_test", "user_1", "el");
    expect(mockTx.properties.createMany).toHaveBeenCalledTimes(1);
    const call = mockTx.properties.createMany.mock.calls[0][0];
    expect(call.data).toHaveLength(7);
    for (const property of call.data) {
      expect(property.organizationId).toBe("org_test");
    }
  });

  it("marks OrganizationSettings as isDemo: true", async () => {
    await seedDemoOrg("org_test", "user_1", "el");
    expect(mockTx.organizationSettings.upsert).toHaveBeenCalledTimes(1);
    const call = mockTx.organizationSettings.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({ isDemo: true });
    expect(call.update).toMatchObject({ isDemo: true });
  });

  it("throws when orgId is empty", async () => {
    await expect(seedDemoOrg("", "user_1", "el")).rejects.toThrow(
      "[seed-demo-org] seedDemoOrg: orgId is required"
    );
  });

  it("throws when userId is empty", async () => {
    await expect(seedDemoOrg("org_test", "", "en")).rejects.toThrow("userId is required");
  });

  it("calls all three encryption functions with correct counts", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(encryptContactForOrg).toHaveBeenCalledTimes(8);
    expect(encryptPropertyForOrg).toHaveBeenCalledTimes(7);
    expect(encryptRequestForOrg).toHaveBeenCalledTimes(3);
  });

  it("creates a General channel in English locale", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(mockTx.channel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "General", slug: "general" }),
      })
    );
  });
});
