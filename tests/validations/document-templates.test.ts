import { describe, it, expect } from "vitest";
import {
  createDocumentTemplateSchema,
  updateDocumentTemplateSchema,
  createOrgDocumentTemplateSchema,
  publishOrgDocumentTemplateSchema,
  cloneOrgDocumentTemplateSchema,
  listOrgDocumentTemplatesSchema,
} from "@/lib/validations/document-templates";

// ---------------------------------------------------------------------------
// createDocumentTemplateSchema (action-layer alias — no organizationId)
// ---------------------------------------------------------------------------

describe("createDocumentTemplateSchema", () => {
  it("rejects missing name", () => {
    const result = createDocumentTemplateSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });

  it("accepts valid template", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "Listing Agreement",
      category: "LISTING_AGREEMENT",
      body: { type: "doc", content: [] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "Test",
      category: "NOT_A_CATEGORY",
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("defaults category to GENERAL when omitted", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "General Doc",
      body: { type: "doc", content: [] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("GENERAL");
    }
  });

  it("strips unknown fields (.strict())", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "Test",
      body: {},
      unknownField: "should be rejected",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 255 characters", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "a".repeat(256),
      body: {},
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateDocumentTemplateSchema
// ---------------------------------------------------------------------------

describe("updateDocumentTemplateSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateDocumentTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only isPublished", () => {
    const result = updateDocumentTemplateSchema.safeParse({ isPublished: true });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (.strict())", () => {
    const result = updateDocumentTemplateSchema.safeParse({
      name: "Valid",
      extraField: "not allowed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = updateDocumentTemplateSchema.safeParse({
      category: "INVALID_CATEGORY",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createOrgDocumentTemplateSchema (includes organizationId)
// ---------------------------------------------------------------------------

describe("createOrgDocumentTemplateSchema", () => {
  const validPayload = {
    organizationId: "org_abc123",
    name: "Purchase Contract Template",
    category: "PURCHASE_CONTRACT",
    body: { type: "doc", content: [] },
  };

  it("accepts a fully valid payload", () => {
    const result = createOrgDocumentTemplateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects empty organizationId", () => {
    const result = createOrgDocumentTemplateSchema.safeParse({
      ...validPayload,
      organizationId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing organizationId", () => {
    const { organizationId: _omit, ...rest } = validPayload;
    const result = createOrgDocumentTemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("defaults isPublished to false", () => {
    const result = createOrgDocumentTemplateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(false);
    }
  });

  it("defaults version to 1", () => {
    const result = createOrgDocumentTemplateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
    }
  });

  it("coerces version string to integer", () => {
    const result = createOrgDocumentTemplateSchema.safeParse({
      ...validPayload,
      version: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(3);
    }
  });

  it("rejects name longer than 255 characters", () => {
    const result = createOrgDocumentTemplateSchema.safeParse({
      ...validPayload,
      name: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (.strict())", () => {
    const result = createOrgDocumentTemplateSchema.safeParse({
      ...validPayload,
      unexpectedField: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// publishOrgDocumentTemplateSchema
// ---------------------------------------------------------------------------

describe("publishOrgDocumentTemplateSchema", () => {
  it("accepts valid organizationId and id", () => {
    const result = publishOrgDocumentTemplateSchema.safeParse({
      organizationId: "org_abc123",
      id: "cld_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = publishOrgDocumentTemplateSchema.safeParse({
      organizationId: "org_abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty organizationId", () => {
    const result = publishOrgDocumentTemplateSchema.safeParse({
      organizationId: "",
      id: "cld_abc123",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cloneOrgDocumentTemplateSchema
// ---------------------------------------------------------------------------

describe("cloneOrgDocumentTemplateSchema", () => {
  it("accepts payload without optional name", () => {
    const result = cloneOrgDocumentTemplateSchema.safeParse({
      organizationId: "org_abc123",
      id: "cld_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts payload with name override", () => {
    const result = cloneOrgDocumentTemplateSchema.safeParse({
      organizationId: "org_abc123",
      id: "cld_abc123",
      name: "Copy of Listing Agreement",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name override longer than 255 characters", () => {
    const result = cloneOrgDocumentTemplateSchema.safeParse({
      organizationId: "org_abc123",
      id: "cld_abc123",
      name: "z".repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// listOrgDocumentTemplatesSchema
// ---------------------------------------------------------------------------

describe("listOrgDocumentTemplatesSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("coerces page and pageSize from strings", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
      page: "2",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejects pageSize above 100", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
      pageSize: 101,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional category filter", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
      category: "NDA",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("NDA");
    }
  });

  it("rejects invalid category filter", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
      category: "NOT_VALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional isPublished filter", () => {
    const result = listOrgDocumentTemplatesSchema.safeParse({
      organizationId: "org_abc123",
      isPublished: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(true);
    }
  });
});
