// app/api/billing/checkout/route.ts
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getStripeClient } from "@/lib/stripe";
import { getClerkClient } from "@/lib/clerk";
import { createOrRetrieveCustomer } from "@/lib/billing/helpers";
import { getBasePriceId, PLAN_CONFIGS } from "@/lib/billing/plans";
import {
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
  validateBody,
} from "@/lib/api-response";
import { NextResponse } from "next/server";

const checkoutSchema = z
  .object({
    plan: z.enum(["PRO", "BUSINESS"]),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const body = await req.json();
    const validation = validateBody(body, checkoutSchema);
    if (!validation.success) return validation.error;

    const { plan, billingCycle } = validation.data;

    const clerk = await getClerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const org = await clerk.organizations.getOrganization({ organizationId });

    const stripeCustomerId = await createOrRetrieveCustomer(
      organizationId,
      email,
      org.name
    );

    const basePriceId = getBasePriceId(plan, billingCycle);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: basePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          organizationId,
          plan,
          billingCycle,
          seatAllowance: String(PLAN_CONFIGS[plan].seatAllowance),
        },
      },
      success_url: `${appUrl}/app/settings/billing?success=true`,
      cancel_url: `${appUrl}/app/settings/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[BILLING_CHECKOUT]", error);
    return apiInternalError("Failed to create checkout session", error as Error);
  }
}
