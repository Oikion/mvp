// lib/billing/plans.ts
import type { SubscriptionPlan, BillingCycle } from "@prisma/client";

export const PLAN_CONFIGS = {
  PRO: {
    name: "Pro",
    seatAllowance: 5,
    features: [
      "mls", "crm", "matchmaking", "calendar", "documents", "import", "export",
    ],
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
    ],
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

/** Returns base price ID for a given plan + billing cycle. Throws if not configured. */
export function getBasePriceId(plan: PlanKey, cycle: BillingCycle): string {
  const id =
    cycle === "MONTHLY"
      ? PLAN_CONFIGS[plan].priceIds.baseMonthly
      : PLAN_CONFIGS[plan].priceIds.baseYearly;
  if (!id) throw new Error(`Stripe base price ID not configured for ${plan} ${cycle}`);
  return id;
}

/** Returns per-seat overage price ID for a given plan + billing cycle. Throws if not configured. */
export function getSeatPriceId(plan: PlanKey, cycle: BillingCycle): string {
  const id =
    cycle === "MONTHLY"
      ? PLAN_CONFIGS[plan].priceIds.seatMonthly
      : PLAN_CONFIGS[plan].priceIds.seatYearly;
  if (!id) throw new Error(`Stripe seat price ID not configured for ${plan} ${cycle}`);
  return id;
}

/** Returns PLAN_CONFIGS entry if plan is PRO or BUSINESS, null for FREE. */
export function getPlanConfig(plan: SubscriptionPlan) {
  if (plan === "FREE") return null;
  if (plan !== "PRO" && plan !== "BUSINESS") {
    throw new Error(`Unknown subscription plan: ${plan}`);
  }
  return PLAN_CONFIGS[plan];
}

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
};
