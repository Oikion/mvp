// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { getStripeClient } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { getPlanConfig } from "@/lib/billing/plans";
import { calculateOverageSeats, getOrgMemberCount } from "@/lib/billing/helpers";
import type { SubscriptionPlan, BillingCycle, SubscriptionStatus } from "@prisma/client";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text(); // raw body required for signature verification
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`[STRIPE_WEBHOOK] Error handling ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ["items.data.price"] }
  );

  const organizationId = subscription.metadata.organizationId;
  const plan = subscription.metadata.plan as SubscriptionPlan;
  const billingCycle = subscription.metadata.billingCycle as BillingCycle;
  const seatAllowance = Number(subscription.metadata.seatAllowance ?? 0);

  if (!organizationId || !plan) {
    console.error("[STRIPE_WEBHOOK] checkout.session.completed missing metadata");
    return;
  }

  const baseItem = subscription.items.data[0];
  // current_period_start/end live on SubscriptionItem in Stripe SDK v22+ (API 2024-12-18.acacia)
  const periodStart = new Date(baseItem.current_period_start * 1000);
  const periodEnd = new Date(baseItem.current_period_end * 1000);
  let seatItemId: string | null = null;

  const memberCount = await getOrgMemberCount(organizationId);
  const overageSeats = calculateOverageSeats(memberCount, seatAllowance);
  const config = getPlanConfig(plan);

  if (config && overageSeats > 0) {
    const seatPriceId =
      billingCycle === "MONTHLY"
        ? config.priceIds.seatMonthly
        : config.priceIds.seatYearly;

    const seatItem = await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: seatPriceId,
      quantity: overageSeats,
      proration_behavior: "always_invoice",
    });
    seatItemId = seatItem.id;
  }

  await prismadb.orgSubscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      stripeBaseItemId: baseItem.id,
      stripeSeatItemId: seatItemId,
      plan,
      billingCycle,
      status: "ACTIVE",
      seatAllowance,
      overageSeats,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeBaseItemId: baseItem.id,
      stripeSeatItemId: seatItemId,
      plan,
      billingCycle,
      status: "ACTIVE",
      seatAllowance,
      overageSeats,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Activated ${plan} subscription for org ${organizationId}`);
}

const STRIPE_TO_DB_STATUS: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INACTIVE",
  incomplete_expired: "INACTIVE",
  paused: "INACTIVE",
};

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) return;

  const status: SubscriptionStatus = STRIPE_TO_DB_STATUS[subscription.status] ?? "INACTIVE";

  const baseItem = subscription.items.data[0];
  await prismadb.orgSubscription.updateMany({
    where: { organizationId },
    data: {
      status,
      currentPeriodStart: baseItem
        ? new Date(baseItem.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: baseItem
        ? new Date(baseItem.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) return;

  await prismadb.orgSubscription.updateMany({
    where: { organizationId },
    data: {
      status: "CANCELED",
      plan: "FREE",
      billingCycle: null,
      stripeSubscriptionId: null,
      stripeBaseItemId: null,
      stripeSeatItemId: null,
      seatAllowance: 0,
      overageSeats: 0,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Subscription canceled for org ${organizationId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await prismadb.orgSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });
}
