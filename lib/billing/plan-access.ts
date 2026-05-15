// lib/billing/plan-access.ts
import { prismadb } from "@/lib/prisma";
import { PLAN_RANK, getPlanConfig } from "@/lib/billing/plans";
import type { OrgSubscription, SubscriptionPlan } from "@prisma/client";

export type { OrgSubscription };

export async function getOrgSubscription(
  organizationId: string
): Promise<OrgSubscription | null> {
  return prismadb.orgSubscription.findUnique({
    where: { organizationId },
  });
}

/** Returns true if the org has an active or trialing subscription. */
export function hasActiveSubscription(sub: OrgSubscription | null): boolean {
  return sub?.status === "ACTIVE" || sub?.status === "TRIALING";
}

/** Returns true if the org's plan is at least the required plan level. */
export function isPlanAtLeast(
  sub: OrgSubscription | null,
  requiredPlan: SubscriptionPlan
): boolean {
  const currentPlan: SubscriptionPlan = sub?.plan ?? "FREE";
  return (
    hasActiveSubscription(sub) &&
    PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan]
  );
}

/** Returns true if the org's current plan includes a specific feature. */
export function hasFeature(
  sub: OrgSubscription | null,
  feature: string
): boolean {
  if (!hasActiveSubscription(sub) || !sub || sub.plan === "FREE") return false;
  const config = getPlanConfig(sub.plan);
  return (config?.features as readonly string[] | undefined)?.includes(feature) ?? false;
}

/**
 * Convenience: fetch + check in one call.
 * Use in Server Components and Route Handlers only (async).
 */
export async function orgHasFeature(
  organizationId: string,
  feature: string
): Promise<boolean> {
  const sub = await getOrgSubscription(organizationId);
  return hasFeature(sub, feature);
}
