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

import { updateRequest } from "@/actions/requests/update-request";
import { prismadb } from "@/lib/prisma";
import { requireAction } from "@/lib/permissions/action-guards";

describe("updateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.request.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.request.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
    });
  });

  it("checks request:update permission first", async () => {
    await updateRequest("req-1", { notes: "Test" });
    expect(requireAction).toHaveBeenCalledWith("request:update");
  });

  it("calls prismadb.request.update", async () => {
    await updateRequest("req-1", { notes: "Test" });
    expect(prismadb.request.update).toHaveBeenCalled();
  });

  it("returns error when permission is denied", async () => {
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: "Forbidden",
    });
    const result = await updateRequest("req-1", { notes: "Test" });
    expect(result).toEqual({ error: "Forbidden" });
    expect(prismadb.request.update).not.toHaveBeenCalled();
  });

  it("includes organizationId in the where clause", async () => {
    const result = await updateRequest("req-1", { notes: "Updated" });
    expect("data" in result ? result.data : undefined).toBeDefined();
    expect(prismadb.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-test-123" }),
      })
    );
  });
});
