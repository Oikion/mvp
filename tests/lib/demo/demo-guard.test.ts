import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prismadb
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    organizationSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { isDemoOrg } from "@/lib/demo/demo-guard";
import { prismadb } from "@/lib/prisma";

describe("isDemoOrg", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when OrganizationSettings.isDemo is true", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue({
      isDemo: true,
    } as never);
    expect(await isDemoOrg("org_abc")).toBe(true);
  });

  it("returns false when OrganizationSettings.isDemo is false", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue({
      isDemo: false,
    } as never);
    expect(await isDemoOrg("org_abc")).toBe(false);
  });

  it("returns false when no OrganizationSettings row exists", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue(null);
    expect(await isDemoOrg("org_abc")).toBe(false);
  });

  it("throws when orgId is empty", async () => {
    await expect(isDemoOrg("")).rejects.toThrow("orgId is required");
  });
});
