import { describe, it, expect } from "vitest";
import { withoutArchived } from "@/lib/query-guards";

describe("withoutArchived", () => {
  it("returns { archivedAt: null }", () => {
    expect(withoutArchived()).toEqual({ archivedAt: null });
  });

  it("is spreadable into a Prisma where clause", () => {
    const where = { organizationId: "org_123", ...withoutArchived() };
    expect(where).toEqual({ organizationId: "org_123", archivedAt: null });
  });
});
