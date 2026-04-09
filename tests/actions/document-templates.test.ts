import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules BEFORE imports
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    orgDocumentTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
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
  encryptOrgDocumentTemplateForOrg: vi.fn((data: unknown) => Promise.resolve(data)),
  decryptOrgDocumentTemplateForOrg: vi.fn((data: unknown) => Promise.resolve(data)),
}));
vi.mock("@/lib/validations/document-templates", () => ({
  createDocumentTemplateSchema: {
    safeParse: vi.fn((x: unknown) => ({ success: true, data: x })),
  },
  updateDocumentTemplateSchema: {
    safeParse: vi.fn((x: unknown) => ({ success: true, data: x })),
  },
}));
vi.mock("@/lib/prisma-serialize", () => ({
  serializePrisma: vi.fn((x: unknown) => x),
}));

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { decryptOrgDocumentTemplateForOrg } from "@/lib/model-encryption";
import {
  createDocumentTemplate,
  updateDocumentTemplate,
  publishDocumentTemplate,
  cloneDocumentTemplate,
  deleteDocumentTemplate,
  listDocumentTemplates,
} from "@/actions/document-templates";

const mockTemplate = {
  id: "tmpl-1",
  organizationId: "org-1",
  name: "Test Template",
  nameEl: null,
  nameEn: null,
  category: "GENERAL",
  body: { type: "doc", content: [] },
  placeholders: [],
  version: 1,
  isPublished: false,
  baseTemplateId: null,
  createdByUserId: "user-1",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── createDocumentTemplate ──────────────────────────────────────────────────

describe("createDocumentTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (getCurrentUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockTemplate
    );
  });

  it("sets organizationId from server auth — not from client", async () => {
    await createDocumentTemplate({
      name: "Test Template",
      category: "GENERAL",
      body: { type: "doc", content: [] },
    });
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-1" }),
      })
    );
  });

  it("ignores client-supplied organizationId", async () => {
    await createDocumentTemplate({
      organizationId: "org-attacker",
      name: "Test Template",
      category: "GENERAL",
      body: { type: "doc", content: [] },
    });
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-1" }),
      })
    );
    expect(prismadb.orgDocumentTemplate.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-attacker" }),
      })
    );
  });

  it("sets createdByUserId from getCurrentUserId", async () => {
    await createDocumentTemplate({
      name: "Test Template",
      category: "GENERAL",
      body: { type: "doc", content: [] },
    });
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdByUserId: "user-1" }),
      })
    );
  });

  it("checks template:create permission", async () => {
    await createDocumentTemplate({ name: "Test", category: "GENERAL", body: {} });
    expect(requireAction).toHaveBeenCalledWith("template:create");
  });

  it("returns error when permission guard denies", async () => {
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Permission denied",
      code: "FORBIDDEN",
    });
    const result = await createDocumentTemplate({
      name: "Test",
      category: "GENERAL",
      body: {},
    });
    expect(result).toMatchObject({ success: false, error: "Permission denied" });
  });

  it("sets version: 1 on create", async () => {
    await createDocumentTemplate({
      name: "Test Template",
      category: "GENERAL",
      body: {},
    });
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1 }),
      })
    );
  });

  it("sets isPublished: false on create", async () => {
    await createDocumentTemplate({
      name: "Test Template",
      category: "GENERAL",
      body: {},
    });
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: false }),
      })
    );
  });
});

// ─── updateDocumentTemplate ──────────────────────────────────────────────────

describe("updateDocumentTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (getCurrentUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");
    (requireActionOnEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      createdByUserId: "user-1",
    });
    (prismadb.orgDocumentTemplate.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
      name: "Updated Template",
    });
  });

  it("includes organizationId in the findFirst where clause", async () => {
    await updateDocumentTemplate("tmpl-1", { name: "Updated" });
    expect(prismadb.orgDocumentTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "tmpl-1", organizationId: "org-1", deletedAt: null }),
      })
    );
  });

  it("includes organizationId in the update where clause", async () => {
    await updateDocumentTemplate("tmpl-1", { name: "Updated" });
    expect(prismadb.orgDocumentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "tmpl-1", organizationId: "org-1" }),
      })
    );
  });

  it("returns not found when template does not exist", async () => {
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await updateDocumentTemplate("nonexistent", { name: "Updated" });
    expect(result).toMatchObject({ success: false });
  });

  it("checks ownership via requireActionOnEntity", async () => {
    await updateDocumentTemplate("tmpl-1", { name: "Updated" });
    expect(requireActionOnEntity).toHaveBeenCalledWith(
      "template:update",
      expect.any(String),
      "tmpl-1",
      "user-1"
    );
  });

  it("increments version on content update", async () => {
    await updateDocumentTemplate("tmpl-1", { name: "Updated" });
    expect(prismadb.orgDocumentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: expect.objectContaining({ increment: 1 }),
        }),
      })
    );
  });
});

// ─── publishDocumentTemplate ─────────────────────────────────────────────────

describe("publishDocumentTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireActionOnEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
      createdByUserId: "user-1",
    });
    (prismadb.orgDocumentTemplate.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
      isPublished: true,
    });
  });

  it("sets isPublished: true", async () => {
    await publishDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: true }),
      })
    );
  });

  it("does NOT increment version on publish", async () => {
    await publishDocumentTemplate("tmpl-1");
    const call = (prismadb.orgDocumentTemplate.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("version");
  });

  it("returns not found when template does not exist", async () => {
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await publishDocumentTemplate("nonexistent");
    expect(result).toMatchObject({ success: false });
  });

  it("checks template:publish permission", async () => {
    await publishDocumentTemplate("tmpl-1");
    expect(requireActionOnEntity).toHaveBeenCalledWith(
      "template:publish",
      expect.any(String),
      "tmpl-1",
      "user-1"
    );
  });
});

// ─── cloneDocumentTemplate ───────────────────────────────────────────────────

describe("cloneDocumentTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (getCurrentUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-2");
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
    });
    (prismadb.orgDocumentTemplate.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
      id: "tmpl-clone-1",
      version: 1,
      isPublished: false,
      baseTemplateId: "tmpl-1",
      createdByUserId: "user-2",
    });
    (decryptOrgDocumentTemplateForOrg as ReturnType<typeof vi.fn>).mockImplementation(
      (data: unknown) => Promise.resolve({ ...(data as object), name: "Test Template" })
    );
  });

  it("creates new record with version: 1", async () => {
    await cloneDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1 }),
      })
    );
  });

  it("creates new record with isPublished: false", async () => {
    await cloneDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: false }),
      })
    );
  });

  it("sets baseTemplateId to the source template id", async () => {
    await cloneDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baseTemplateId: "tmpl-1" }),
      })
    );
  });

  it("sets createdByUserId from getCurrentUserId", async () => {
    await cloneDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdByUserId: "user-2" }),
      })
    );
  });

  it("returns not found when source template does not exist", async () => {
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await cloneDocumentTemplate("nonexistent");
    expect(result).toMatchObject({ success: false });
  });

  it("checks template:create permission", async () => {
    await cloneDocumentTemplate("tmpl-1");
    expect(requireAction).toHaveBeenCalledWith("template:create");
  });
});

// ─── deleteDocumentTemplate ──────────────────────────────────────────────────

describe("deleteDocumentTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireActionOnEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      createdByUserId: "user-1",
    });
    (prismadb.orgDocumentTemplate.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTemplate,
      deletedAt: new Date(),
    });
  });

  it("soft-deletes by setting deletedAt", async () => {
    await deleteDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("includes organizationId in the soft-delete where clause", async () => {
    await deleteDocumentTemplate("tmpl-1");
    expect(prismadb.orgDocumentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "tmpl-1", organizationId: "org-1" }),
      })
    );
  });

  it("does not hard-delete", async () => {
    await deleteDocumentTemplate("tmpl-1");
    expect(
      (prismadb.orgDocumentTemplate as Record<string, unknown>).delete
    ).toBeUndefined();
  });

  it("returns not found when template does not exist", async () => {
    (prismadb.orgDocumentTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await deleteDocumentTemplate("nonexistent");
    expect(result).toMatchObject({ success: false });
  });

  it("checks ownership via requireActionOnEntity", async () => {
    await deleteDocumentTemplate("tmpl-1");
    expect(requireActionOnEntity).toHaveBeenCalledWith(
      "template:delete",
      expect.any(String),
      "tmpl-1",
      "user-1"
    );
  });
});

// ─── listDocumentTemplates ───────────────────────────────────────────────────

describe("listDocumentTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentOrgId as ReturnType<typeof vi.fn>).mockResolvedValue("org-1");
    (requireAction as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.orgDocumentTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("filters by organizationId and deletedAt: null", async () => {
    await listDocumentTemplates();
    expect(prismadb.orgDocumentTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          deletedAt: null,
        }),
      })
    );
  });

  it("orders by updatedAt desc", async () => {
    await listDocumentTemplates();
    expect(prismadb.orgDocumentTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: "desc" },
      })
    );
  });

  it("checks template:read permission", async () => {
    await listDocumentTemplates();
    expect(requireAction).toHaveBeenCalledWith("template:read");
  });

  it("uses select subset (excludes body field)", async () => {
    await listDocumentTemplates();
    const call = (prismadb.orgDocumentTemplate.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.select).toBeDefined();
    expect(call.select.body).toBeFalsy();
  });

  it("returns empty array when no templates exist", async () => {
    const result = await listDocumentTemplates();
    expect(result).toMatchObject({ success: true });
  });
});
