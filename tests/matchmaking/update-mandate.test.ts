import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    request: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions/action-guards", () => ({
  requireAction: vi.fn().mockResolvedValue(null), // null = allowed
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("org-test-123"),
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-test-1" }),
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptRequestForOrg: vi
    .fn()
    .mockImplementation((data) => Promise.resolve(data)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/actions/activities", () => ({
  createSystemActivity: vi.fn().mockResolvedValue(undefined),
}));

import { updateMandate } from "@/actions/mandates/update-mandate";
import { prismadb } from "@/lib/prisma";
import { requireAction } from "@/lib/permissions/action-guards";

describe("updateMandate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.request.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.request.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
    });
  });

  it("checks request:update permission first", async () => {
    await updateMandate({ id: "req-1", notes: "Test" });
    expect(requireAction).toHaveBeenCalledWith("request:update");
  });

  it("calls prismadb.request.update (not mandate)", async () => {
    await updateMandate({ id: "req-1", notes: "Test" });
    expect(prismadb.request.update).toHaveBeenCalled();
  });

  it("returns error when permission is denied", async () => {
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: "Forbidden",
    });
    const result = await updateMandate({ id: "req-1", notes: "Test" });
    expect(result).toEqual({ error: "Forbidden" });
    expect(prismadb.request.update).not.toHaveBeenCalled();
  });

  it("includes organizationId in the where clause", async () => {
    const result = await updateMandate({ id: "req-1", notes: "Updated" });
    expect(result.data).toBeDefined();
    expect(prismadb.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-test-123" }),
      })
    );
  });
});
