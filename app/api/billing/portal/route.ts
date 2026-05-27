// app/api/billing/portal/route.ts
import { auth } from "@clerk/nextjs/server";
import { getStripeClient } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { isAtLeastLead } from "@/lib/org-admin";
import {
  apiUnauthorized,
  apiBadRequest,
  apiForbidden,
  apiInternalError,
} from "@/lib/api-response";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const canAccessBilling = await isAtLeastLead();
    if (!canAccessBilling) return apiForbidden("Billing access requires at least Lead role");

    const sub = await prismadb.orgSubscription.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      return apiBadRequest("No billing account found for this organization");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/app/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[BILLING_PORTAL]", error);
    return apiInternalError("Failed to create portal session", error as Error);
  }
}
