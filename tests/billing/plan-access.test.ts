// tests/billing/plan-access.test.ts
import { describe, it, expect } from "vitest";
import {
  hasActiveSubscription,
  isPlanAtLeast,
  hasFeature,
} from "@/lib/billing/plan-access";
import type { OrgSubscription } from "@prisma/client";

const makeSubWith = (overrides: Partial<OrgSubscription>): OrgSubscription => ({
  id: "sub_1",
  organizationId: "org_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: null,
  stripeBaseItemId: null,
  stripeSeatItemId: null,
  plan: "FREE",
  billingCycle: null,
  status: "INACTIVE",
  seatAllowance: 0,
  overageSeats: 0,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("hasActiveSubscription", () => {
  it("returns true for ACTIVE", () => {
    expect(hasActiveSubscription(makeSubWith({ status: "ACTIVE" }))).toBe(true);
  });
  it("returns true for TRIALING", () => {
    expect(hasActiveSubscription(makeSubWith({ status: "TRIALING" }))).toBe(true);
  });
  it("returns false for INACTIVE", () => {
    expect(hasActiveSubscription(makeSubWith({ status: "INACTIVE" }))).toBe(false);
  });
  it("returns false for null", () => {
    expect(hasActiveSubscription(null)).toBe(false);
  });
});

describe("isPlanAtLeast", () => {
  const activePro = makeSubWith({ status: "ACTIVE", plan: "PRO" });
  const activeBusiness = makeSubWith({ status: "ACTIVE", plan: "BUSINESS" });
  const inactivePro = makeSubWith({ status: "INACTIVE", plan: "PRO" });

  it("PRO >= FREE is true", () => {
    expect(isPlanAtLeast(activePro, "FREE")).toBe(true);
  });
  it("PRO >= PRO is true", () => {
    expect(isPlanAtLeast(activePro, "PRO")).toBe(true);
  });
  it("PRO >= BUSINESS is false", () => {
    expect(isPlanAtLeast(activePro, "BUSINESS")).toBe(false);
  });
  it("BUSINESS >= PRO is true", () => {
    expect(isPlanAtLeast(activeBusiness, "PRO")).toBe(true);
  });
  it("returns false when inactive even if rank is sufficient", () => {
    expect(isPlanAtLeast(inactivePro, "PRO")).toBe(false);
  });
});

describe("hasFeature", () => {
  const activeBusiness = makeSubWith({ status: "ACTIVE", plan: "BUSINESS" });
  const activePro = makeSubWith({ status: "ACTIVE", plan: "PRO" });

  it("BUSINESS has api_access", () => {
    expect(hasFeature(activeBusiness, "api_access")).toBe(true);
  });
  it("PRO does not have api_access", () => {
    expect(hasFeature(activePro, "api_access")).toBe(false);
  });
  it("PRO has mls", () => {
    expect(hasFeature(activePro, "mls")).toBe(true);
  });
  it("FREE has nothing", () => {
    expect(hasFeature(makeSubWith({ status: "ACTIVE", plan: "FREE" }), "mls")).toBe(false);
  });
});
