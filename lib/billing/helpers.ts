// lib/billing/helpers.ts
import { getStripeClient } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { getPlanConfig } from "@/lib/billing/plans";
import { getClerkClient } from "@/lib/clerk";
import type { SubscriptionPlan } from "@prisma/client";

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
  const customer = await stripe.customers.create(
    {
      email,
      name,
      metadata: { organizationId },
    },
    {
      idempotencyKey: `create-customer-${organizationId}`,
    }
  );

  // Upsert prevents a unique-constraint crash if two requests race past the findUnique above.
  // update: {} is a deliberate no-op — we preserve the winner's stripeCustomerId and accept
  // that our newly created Stripe customer becomes an orphan in the rare concurrent case.
  try {
    const sub = await prismadb.orgSubscription.upsert({
      where: { organizationId },
      create: { organizationId, stripeCustomerId: customer.id },
      update: {},
    });
    return sub.stripeCustomerId;
  } catch (e: unknown) {
    // P2002: unique constraint — concurrent request already created the record
    if ((e as { code?: string }).code !== "P2002") throw e;
    const created = await prismadb.orgSubscription.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });
    return created!.stripeCustomerId;
  }
}

/**
 * Returns the current member count for a Clerk org.
 */
export async function getOrgMemberCount(organizationId: string): Promise<number> {
  const clerk = await getClerkClient();
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

  // Compare-and-swap: only update if overageSeats still matches the value we read.
  // If a concurrent request already incremented it, count === 0 and we skip the Stripe call,
  // preventing duplicate proration invoices from back-to-back membership webhooks.
  const updated = await prismadb.orgSubscription.updateMany({
    where: { organizationId, overageSeats: sub.overageSeats },
    data: { overageSeats: newOverage },
  });

  if (updated.count === 0) return;

  const stripe = getStripeClient();
  // proration_behavior: "always_invoice" immediately charges/credits the prorated amount
  // rather than rolling it into the next billing cycle, keeping Stripe and DB in sync.
  await stripe.subscriptionItems.update(sub.stripeSeatItemId, {
    quantity: newOverage,
    proration_behavior: "always_invoice",
  });
}
