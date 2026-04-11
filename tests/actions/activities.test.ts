import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules BEFORE imports
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    activity: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    contact: { findFirst: vi.fn() },
    mandate: { findFirst: vi.fn() },
    deal: { findFirst: vi.fn() },
    property: { findFirst: vi.fn() },
    showing: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/get-current-user", () => ({
  getCurrentOrgId: vi.fn(),
  getCurrentUserId: vi.fn(),
}));
vi.mock("@/lib/permissions/action-guards", () => ({
  requireAction: vi.fn(),
  requireActionOnEntity: vi.fn(),
}));
vi.mock("@/lib/model-encryption", () => ({
  encryptActivityForOrg: vi.fn((data: unknown) => Promise.resolve(data)),
  decryptActivityForOrg: vi.fn((data: unknown) => Promise.resolve(data)),
}));
vi.mock("@/lib/validations/activities", () => ({
  createActivitySchema: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  updateActivitySchema: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
}));
vi.mock("@/lib/prisma-serialize", () => ({
  serializePrisma: vi.fn((x: unknown) => x),
}));

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { createActivity, listActivities, updateActivity, deleteActivity } from "@/actions/activities";

const mockActivity = {
  id: "act-1",
  organizationId: "org-1",
  parentType: "CONTACT",
  parentId: "cont-1",
  kind: "NOTE",
  direction: "INTERNAL",
  occurredAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdByUserId: "user-1",
};

describe("createActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (getCurrentUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.activity.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);
  });

  it("sets organizationId from getCurrentOrgId", async () => {
    await createActivity({
      parentType: "CONTACT",
      parentId: "cont-1",
      kind: "NOTE",
      direction: "INTERNAL",
    });
    expect(prismadb.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-1" }),
      })
    );
  });

  it("sets createdByUserId from getCurrentUserId", async () => {
    await createActivity({
      parentType: "CONTACT",
      parentId: "cont-1",
      kind: "NOTE",
    });
    expect(prismadb.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdByUserId: "user-1" }),
      })
    );
  });

  it("checks activity:create permission", async () => {
    await createActivity({
      parentType: "CONTACT",
      parentId: "cont-1",
      kind: "NOTE",
    });
    expect(requireAction).toHaveBeenCalledWith("activity:create");
  });

  it("returns error when permission guard denies", async () => {
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Permission denied",
      code: "FORBIDDEN",
    });
    const result = await createActivity({
      parentType: "CONTACT",
      parentId: "cont-1",
      kind: "NOTE",
    });
    expect(result).toMatchObject({ success: false, error: "Permission denied" });
  });

  it("ignores client-supplied organizationId", async () => {
    await createActivity({
      organizationId: "org-attacker",
      parentType: "CONTACT",
      parentId: "cont-1",
      kind: "NOTE",
      direction: "INTERNAL",
    });
    expect(prismadb.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-1" }),
      })
    );
  });
});

describe("listActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Ownership proof: parent entity belongs to the org
    (prismadb.contact as any).findFirst.mockResolvedValue({ id: "cont-1" });
    (prismadb.deal as any).findFirst.mockResolvedValue({ id: "deal-1" });
  });

  it("filters by organizationId and parentId", async () => {
    await listActivities("CONTACT", "cont-1");
    expect(prismadb.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          parentId: "cont-1",
          deletedAt: null,
        }),
      })
    );
  });

  it("filters by parentType", async () => {
    await listActivities("DEAL", "deal-1");
    expect(prismadb.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parentType: "DEAL",
        }),
      })
    );
  });

  it("orders by occurredAt desc", async () => {
    await listActivities("CONTACT", "cont-1");
    expect(prismadb.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { occurredAt: "desc" },
      })
    );
  });

  it("checks activity:read permission", async () => {
    await listActivities("CONTACT", "cont-1");
    expect(requireAction).toHaveBeenCalledWith("activity:read");
  });
});

describe("updateActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireActionOnEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      createdByUserId: "user-1",
    });
    (prismadb.activity.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockActivity,
      subject: "Updated",
    });
  });

  it("returns not found error when activity does not exist", async () => {
    (prismadb.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await updateActivity("nonexistent", { subject: "Updated" });
    expect(result).toMatchObject({ success: false, error: "Activity not found" });
  });

  it("checks ownership via requireActionOnEntity", async () => {
    await updateActivity("act-1", { subject: "Updated" });
    expect(requireActionOnEntity).toHaveBeenCalledWith(
      "activity:update",
      expect.any(String),
      "act-1",
      "user-1"
    );
  });

  it("does not access activities outside org", async () => {
    await updateActivity("act-1", { subject: "Updated" });
    expect(prismadb.activity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
      })
    );
  });

  it("includes organizationId in the update where clause", async () => {
    await updateActivity("act-1", { subject: "Updated" });
    expect(prismadb.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "act-1", organizationId: "org-1" }),
      })
    );
  });
});

describe("deleteActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireActionOnEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      createdByUserId: "user-1",
    });
    (prismadb.activity.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockActivity,
      deletedAt: new Date(),
    });
  });

  it("soft-deletes by setting deletedAt", async () => {
    await deleteActivity("act-1");
    expect(prismadb.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "act-1" }),
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("includes organizationId in the soft-delete where clause", async () => {
    await deleteActivity("act-1");
    expect(prismadb.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "act-1", organizationId: "org-1" }),
      })
    );
  });

  it("does not hard-delete", async () => {
    await deleteActivity("act-1");
    expect((prismadb.activity as Record<string, unknown>).delete).toBeUndefined();
  });

  it("returns not found error when activity does not exist", async () => {
    (prismadb.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await deleteActivity("nonexistent");
    expect(result).toMatchObject({ success: false, error: "Activity not found" });
  });

  it("returns success true", async () => {
    const result = await deleteActivity("act-1");
    expect(result).toMatchObject({ success: true });
  });
});
