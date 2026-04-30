import { describe, it, expect } from "vitest";
import { OrgRole } from "@prisma/client";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions/defaults";

describe("archive permission defaults", () => {
  it("grants all archive permissions to OWNER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.OWNER];
    expect(perms.canViewArchive).toBe(true);
    expect(perms.canRestoreArchived).toBe(true);
    expect(perms.canPermanentDelete).toBe(true);
  });

  it("denies all archive permissions to LEAD", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.LEAD];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });

  it("denies all archive permissions to MEMBER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.MEMBER];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });

  it("denies all archive permissions to VIEWER", () => {
    const perms = DEFAULT_PERMISSIONS[OrgRole.VIEWER];
    expect(perms.canViewArchive).toBe(false);
    expect(perms.canRestoreArchived).toBe(false);
    expect(perms.canPermanentDelete).toBe(false);
  });
});
