// lib/billing/helpers.ts
import { getStripeClient } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { getPlanConfig } from "@/lib/billing/plans";
import type { SubscriptionPlan } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

/**
 * Gets or creates a Stripe customer record for the org.
 * Upserts the OrgSubscription row (stripeCustomerId only) so it exists before checkout.
 */
export async function createOrRetrieveCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  const existing = await prismadb.orgSubscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (existing) return existing.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId },
  });

  await prismadb.orgSubscription.create({
    data: {
      organizationId,
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/**
 * Returns the current member count for a Clerk org.
 */
export async function getOrgMemberCount(organizationId: string): Promise<number> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 500,
  });
  return memberships.totalCount;
}

/**
 * Calculates how many extra seats (beyond included allowance) the org needs.
 */
export function calculateOverageSeats(memberCount: number, seatAllowance: number): number {
  return Math.max(0, memberCount - seatAllowance);
}

/**
 * Syncs the seat overage quantity on the Stripe subscription.
 * Called after org member count changes.
 */
export async function syncSeatQuantity(organizationId: string): Promise<void> {
  const sub = await prismadb.orgSubscription.findUnique({
    where: { organizationId },
  });

  if (
    !sub ||
    !sub.stripeSubscriptionId ||
    !sub.stripeSeatItemId ||
    sub.status !== "ACTIVE" ||
    sub.plan === "FREE"
  ) {
    return;
  }

  const config = getPlanConfig(sub.plan as SubscriptionPlan);
  if (!config) return;

  const memberCount = await getOrgMemberCount(organizationId);
  const newOverage = calculateOverageSeats(memberCount, config.seatAllowance);

  if (newOverage === sub.overageSeats) return;

  const stripe = getStripeClient();
  await stripe.subscriptionItems.update(sub.stripeSeatItemId, {
    quantity: newOverage,
    proration_behavior: "always_invoice",
  });

  await prismadb.orgSubscription.update({
    where: { organizationId },
    data: { overageSeats: newOverage },
  });
}
