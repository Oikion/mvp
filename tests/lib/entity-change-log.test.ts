import { describe, it, expect } from "vitest";
import { diffEntity } from "@/lib/entity-change-log";

describe("diffEntity", () => {
  const watchedFields = ["status", "assignedToUserId", "visibility"];
  const encryptedFields = ["email", "phone"];

  it("returns empty array when no watched fields changed", () => {
    const before = { status: "LEAD", name: "Alice" };
    const after  = { status: "LEAD", name: "Bob" };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("detects a changed watched field", () => {
    const before = { status: "LEAD" };
    const after  = { status: "ACTIVE" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toEqual([{ field: "status", from: "LEAD", to: "ACTIVE" }]);
  });

  it("treats null and undefined as equivalent (both map to null)", () => {
    const before = { assignedToUserId: undefined };
    const after  = { assignedToUserId: null };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("records null→value as change", () => {
    const before = { assignedToUserId: null };
    const after  = { assignedToUserId: "user_abc" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toEqual([{ field: "assignedToUserId", from: null, to: "user_abc" }]);
  });

  it("masks encrypted fields with [encrypted]", () => {
    const allWatched = ["status", "email", "phone"];
    const before = { status: "LEAD", email: "old@example.com", phone: "111" };
    const after  = { status: "LEAD", email: "new@example.com", phone: "222" };
    const result = diffEntity(before, after, allWatched, encryptedFields);
    expect(result).toEqual([
      { field: "email", from: "[encrypted]", to: "[encrypted]" },
      { field: "phone", from: "[encrypted]", to: "[encrypted]" },
    ]);
  });

  it("ignores non-watched fields even if they change", () => {
    const before = { status: "LEAD", name: "Alice", notes: "old" };
    const after  = { status: "LEAD", name: "Bob",   notes: "new" };
    expect(diffEntity(before, after, watchedFields, encryptedFields)).toEqual([]);
  });

  it("handles multiple watched field changes", () => {
    const before = { status: "LEAD", visibility: "PRIVATE" };
    const after  = { status: "ACTIVE", visibility: "PUBLIC" };
    const result = diffEntity(before, after, watchedFields, encryptedFields);
    expect(result).toEqual([
      { field: "status",     from: "LEAD",    to: "ACTIVE" },
      { field: "visibility", from: "PRIVATE", to: "PUBLIC"  },
    ]);
  });
});
