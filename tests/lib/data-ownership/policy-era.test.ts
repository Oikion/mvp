import { describe, it, expect } from "vitest";
import { getPolicyForEntity, shouldMigrateData } from "@/lib/data-ownership";
import { DataOwnershipMode, DepartureReason } from "@prisma/client";
import type { PolicyEra } from "@/lib/data-ownership/types";

describe("getPolicyForEntity", () => {
  it("returns current mode when no policy history", () => {
    const result = getPolicyForEntity(
      new Date("2026-06-01"),
      DataOwnershipMode.AGENCY,
      null
    );
    expect(result.mode).toBe("AGENCY");
  });

  it("returns current mode when policy history is empty", () => {
    const result = getPolicyForEntity(
      new Date("2026-06-01"),
      DataOwnershipMode.AGENT,
      []
    );
    expect(result.mode).toBe("AGENT");
  });

  it("returns old mode for entity created before policy change", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2026-03-15"), // created during AGENT era
      DataOwnershipMode.AGENCY, // current mode
      history
    );
    expect(result.mode).toBe("AGENT");
  });

  it("returns new mode for entity created after policy change", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2026-07-15"), // created during AGENCY era
      DataOwnershipMode.AGENCY,
      history
    );
    expect(result.mode).toBe("AGENCY");
  });

  it("handles multiple policy changes correctly", () => {
    const history: PolicyEra[] = [
      { mode: "AGENCY", from: "2026-01-01T00:00:00Z", to: "2026-03-01T00:00:00Z" },
      { mode: "AGENT", from: "2026-03-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    // Entity in first era
    expect(
      getPolicyForEntity(new Date("2026-02-01"), DataOwnershipMode.AGENCY, history).mode
    ).toBe("AGENCY");
    // Entity in middle era
    expect(
      getPolicyForEntity(new Date("2026-04-15"), DataOwnershipMode.AGENCY, history).mode
    ).toBe("AGENT");
    // Entity in current era
    expect(
      getPolicyForEntity(new Date("2026-07-01"), DataOwnershipMode.AGENCY, history).mode
    ).toBe("AGENCY");
  });

  it("falls back to earliest era for entity predating all history", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2025-12-01"), // before any era
      DataOwnershipMode.AGENT,
      history
    );
    expect(result.mode).toBe("AGENT");
  });

  it("returns the matching era object", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2026-03-15"),
      DataOwnershipMode.AGENCY,
      history
    );
    expect(result.era).toEqual(history[0]);
  });
});

describe("shouldMigrateData", () => {
  it("returns true for LEFT_ORG with AGENT mode", () => {
    expect(shouldMigrateData(DepartureReason.LEFT_ORG, DataOwnershipMode.AGENT)).toBe(true);
  });

  it("returns true for REMOVED_FROM_ORG with AGENT mode", () => {
    expect(shouldMigrateData(DepartureReason.REMOVED_FROM_ORG, DataOwnershipMode.AGENT)).toBe(true);
  });

  it("returns false for ACCOUNT_DELETED regardless of mode", () => {
    expect(shouldMigrateData(DepartureReason.ACCOUNT_DELETED, DataOwnershipMode.AGENT)).toBe(false);
    expect(shouldMigrateData(DepartureReason.ACCOUNT_DELETED, DataOwnershipMode.AGENCY)).toBe(false);
  });

  it("returns false for ADMIN_FORCE_DELETED regardless of mode", () => {
    expect(shouldMigrateData(DepartureReason.ADMIN_FORCE_DELETED, DataOwnershipMode.AGENT)).toBe(false);
  });

  it("returns false for AGENCY mode regardless of reason", () => {
    expect(shouldMigrateData(DepartureReason.LEFT_ORG, DataOwnershipMode.AGENCY)).toBe(false);
    expect(shouldMigrateData(DepartureReason.REMOVED_FROM_ORG, DataOwnershipMode.AGENCY)).toBe(false);
  });
});
