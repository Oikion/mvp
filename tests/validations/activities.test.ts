import { describe, it, expect } from "vitest";

import {
  createActivitySchema,
  updateActivitySchema,
  listActivitiesSchema,
} from "@/lib/validations/activities";

// =============================================================================
// createActivitySchema
// =============================================================================

describe("createActivitySchema", () => {
  it("rejects missing required fields", () => {
    const result = createActivitySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty organizationId", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid activity", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
    });
    expect(result.success).toBe(true);
  });

  it("defaults direction to INTERNAL when not provided", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.direction).toBe("INTERNAL");
    }
  });

  it("accepts all valid kind values", () => {
    const kinds = ["EMAIL", "CALL", "MEETING", "NOTE", "TASK", "SHOWING", "DOCUMENT", "OTHER"] as const;
    for (const kind of kinds) {
      const result = createActivitySchema.safeParse({
        organizationId: "org_abc123",
        parentType: "CONTACT",
        parentId: "cld123abc",
        kind,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid kind value", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "INVALID_KIND",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
      hackerField: "injected",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative durationMin", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "CALL",
      durationMin: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts durationMin of zero", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "CALL",
      durationMin: 0,
    });
    expect(result.success).toBe(true);
  });

  it("coerces durationMin string to integer", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "CALL",
      durationMin: "30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationMin).toBe(30);
    }
  });

  it("coerces scheduledAt string to Date", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "MEETING",
      scheduledAt: "2026-05-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledAt).toBeInstanceOf(Date);
    }
  });

  it("coerces occurredAt string to Date", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "MEETING",
      occurredAt: "2026-04-09T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredAt).toBeInstanceOf(Date);
    }
  });

  it("accepts subject up to 500 characters", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "EMAIL",
      subject: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects subject longer than 500 characters", () => {
    const result = createActivitySchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "EMAIL",
      subject: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid parentType values", () => {
    const parentTypes = ["CONTACT", "REQUEST", "DEAL", "PROPERTY", "SHOWING"] as const;
    for (const parentType of parentTypes) {
      const result = createActivitySchema.safeParse({
        organizationId: "org_abc123",
        parentType,
        parentId: "cld123abc",
        kind: "NOTE",
      });
      expect(result.success).toBe(true);
    }
  });
});

// =============================================================================
// updateActivitySchema
// =============================================================================

describe("updateActivitySchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateActivitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("does not accept organizationId (field stripped by omit)", () => {
    const result = updateActivitySchema.safeParse({
      organizationId: "org_abc123",
      kind: "NOTE",
    });
    // strict() — unknown field organizationId should be rejected
    expect(result.success).toBe(false);
  });

  it("accepts partial update with just kind", () => {
    const result = updateActivitySchema.safeParse({ kind: "EMAIL" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid kind in update", () => {
    const result = updateActivitySchema.safeParse({ kind: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects negative durationMin in update", () => {
    const result = updateActivitySchema.safeParse({ durationMin: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = updateActivitySchema.safeParse({
      kind: "NOTE",
      unknownField: "bad",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// listActivitiesSchema
// =============================================================================

describe("listActivitiesSchema", () => {
  it("rejects missing organizationId", () => {
    const result = listActivitiesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts minimal valid query (organizationId only)", () => {
    const result = listActivitiesSchema.safeParse({
      organizationId: "org_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("defaults page to 1 and pageSize to 20", () => {
    const result = listActivitiesSchema.safeParse({
      organizationId: "org_abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("coerces page and pageSize from strings", () => {
    const result = listActivitiesSchema.safeParse({
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

  it("rejects pageSize greater than 100", () => {
    const result = listActivitiesSchema.safeParse({
      organizationId: "org_abc123",
      pageSize: 101,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional filter fields", () => {
    const result = listActivitiesSchema.safeParse({
      organizationId: "org_abc123",
      parentType: "CONTACT",
      parentId: "cld123abc",
      assignedToUserId: "user_789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid parentType in list query", () => {
    const result = listActivitiesSchema.safeParse({
      organizationId: "org_abc123",
      parentType: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });
});
