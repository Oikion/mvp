// lib/billing/plans.ts
import type { SubscriptionPlan, BillingCycle } from "@prisma/client";

export const PLAN_CONFIGS = {
  PRO: {
    name: "Pro",
    seatAllowance: 5,
    features: [
      "mls", "crm", "matchmaking", "calendar", "documents", "import", "export",
    ] as string[],
    priceIds: {
      baseMonthly: process.env.STRIPE_PRO_BASE_MONTHLY_ID ?? "",
      baseYearly: process.env.STRIPE_PRO_BASE_YEARLY_ID ?? "",
      seatMonthly: process.env.STRIPE_PRO_SEAT_MONTHLY_ID ?? "",
      seatYearly: process.env.STRIPE_PRO_SEAT_YEARLY_ID ?? "",
    },
    display: {
      monthlyBase: 3900,
      yearlyBase: 39000,
      monthlyPerSeat: 1000,
      yearlyPerSeat: 10000,
    },
  },
  BUSINESS: {
    name: "Business",
    seatAllowance: 15,
    features: [
      "mls", "crm", "matchmaking", "calendar", "documents", "import", "export",
      "network", "advanced_analytics", "api_access",
    ] as string[],
    priceIds: {
      baseMonthly: process.env.STRIPE_BUSINESS_BASE_MONTHLY_ID ?? "",
      baseYearly: process.env.STRIPE_BUSINESS_BASE_YEARLY_ID ?? "",
      seatMonthly: process.env.STRIPE_BUSINESS_SEAT_MONTHLY_ID ?? "",
      seatYearly: process.env.STRIPE_BUSINESS_SEAT_YEARLY_ID ?? "",
    },
    display: {
      monthlyBase: 9900,
      yearlyBase: 99000,
      monthlyPerSeat: 800,
      yearlyPerSeat: 8000,
    },
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIGS;

/** Returns base price ID for a given plan + billing cycle. */
export function getBasePriceId(plan: PlanKey, cycle: BillingCycle): string {
  return cycle === "MONTHLY"
    ? PLAN_CONFIGS[plan].priceIds.baseMonthly
    : PLAN_CONFIGS[plan].priceIds.baseYearly;
}

/** Returns per-seat overage price ID for a given plan + billing cycle. */
export function getSeatPriceId(plan: PlanKey, cycle: BillingCycle): string {
  return cycle === "MONTHLY"
    ? PLAN_CONFIGS[plan].priceIds.seatMonthly
    : PLAN_CONFIGS[plan].priceIds.seatYearly;
}

/** Returns PLAN_CONFIGS entry if plan is PRO or BUSINESS, null for FREE. */
export function getPlanConfig(plan: SubscriptionPlan) {
  if (plan === "FREE") return null;
  return PLAN_CONFIGS[plan as PlanKey];
}

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
};
