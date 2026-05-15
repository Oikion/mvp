# Stripe Billing Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Stripe subscription billing with hybrid pricing (flat base + per-seat overage), covering checkout, webhook sync, customer portal, and billing settings page.

**Architecture:** Two plans (Pro/Business) × two billing cycles (monthly/yearly). Each subscription has two Stripe items: a flat base price and a licensed per-seat overage item. Member seat count is synced on Clerk membership events. The billing page lives in `settings/(org-required)/billing/`.

**Tech Stack:** `stripe` npm package, Prisma (new `OrgSubscription` model), Clerk webhooks, Next.js App Router API routes, shadcn/ui, next-intl.

---

## Plan: Hybrid Billing Model

| Plan | Monthly | Yearly | Included Seats | Extra Seat/mo | Extra Seat/yr |
|------|---------|--------|---------------|---------------|---------------|
| Pro | €39 | €390 | 5 | €10 | €100 |
| Business | €99 | €990 | 15 | €8 | €80 |

---

## File Map

**New files:**
- `lib/stripe.ts` — Stripe singleton client
- `lib/billing/plans.ts` — Plan definitions, price IDs, features, seat allowances
- `lib/billing/helpers.ts` — createOrRetrieveCustomer, syncSeatQuantity, calculateOverageSeats
- `lib/billing/plan-access.ts` — getOrgSubscription, isPlanAtLeast, hasFeature
- `scripts/stripe-setup.ts` — One-time script to create Stripe products + prices
- `app/api/billing/checkout/route.ts` — POST: create Stripe Checkout session
- `app/api/billing/portal/route.ts` — POST: create Stripe Customer Portal session
- `app/api/webhooks/stripe/route.ts` — POST: handle Stripe webhook events
- `app/[locale]/app/(routes)/settings/(org-required)/billing/page.tsx` — Server component billing page
- `app/[locale]/app/(routes)/settings/(org-required)/billing/components/CurrentPlanCard.tsx`
- `app/[locale]/app/(routes)/settings/(org-required)/billing/components/PlanSelector.tsx`
- `app/[locale]/app/(routes)/settings/(org-required)/billing/components/BillingActions.tsx`
- `locales/en/billing.json`
- `locales/el/billing.json`
- `tests/billing/plan-access.test.ts`

**Modified files:**
- `package.json` — add `stripe`
- `prisma/schema.prisma` — add `OrgSubscription` model + 3 enums
- `i18n.ts` — add billing imports + messages registration
- `config/navigation.tsx` — add Billing nav item under Settings
- `app/api/webhooks/clerk/route.ts` — add `organizationMembership.created` for seat sync
- `.env.example` — add 8 Stripe price ID env vars

---

## Task 1: Install Stripe and Update Env Vars

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install stripe**

```bash
pnpm add stripe
```

Expected: `stripe` appears in `package.json` dependencies.

- [ ] **Step 2: Add Stripe price env vars to .env.example**

Replace the existing `# ----- STRIPE PAYMENTS -----` block in `.env.example`:

```env
# ----- STRIPE PAYMENTS -----
STRIPE_API_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Pro Plan price IDs (base flat rate + per-seat overage)
STRIPE_PRO_BASE_MONTHLY_ID=""
STRIPE_PRO_BASE_YEARLY_ID=""
STRIPE_PRO_SEAT_MONTHLY_ID=""
STRIPE_PRO_SEAT_YEARLY_ID=""

# Business Plan price IDs (base flat rate + per-seat overage)
STRIPE_BUSINESS_BASE_MONTHLY_ID=""
STRIPE_BUSINESS_BASE_YEARLY_ID=""
STRIPE_BUSINESS_SEAT_MONTHLY_ID=""
STRIPE_BUSINESS_SEAT_YEARLY_ID=""
```

- [ ] **Step 3: Copy the 10 new vars into your local .env.local** (fill in STRIPE_API_KEY from Stripe dashboard — leave price IDs blank until Task 2 is done)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "feat(billing): add stripe dependency and env var stubs"
```

---

## Task 2: Create Stripe Products and Prices (Setup Script)

**Files:**
- Create: `scripts/stripe-setup.ts`

This script runs once locally against your Stripe test account to create all products and prices. Run it, copy the resulting price IDs into `.env.local`, then commit the env example update.

- [ ] **Step 1: Create the setup script**

```typescript
// scripts/stripe-setup.ts
import Stripe from "stripe";

async function main() {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });

  console.log("Creating Stripe products and prices...\n");

  // ── Pro Product ──────────────────────────────────────
  const pro = await stripe.products.create({
    name: "Oikion Pro",
    description: "Real estate agency platform — Pro tier",
    metadata: { plan: "PRO" },
  });
  console.log("Created product:", pro.id, "(Pro)");

  const proBaseMonthly = await stripe.prices.create({
    product: pro.id,
    currency: "eur",
    unit_amount: 3900,
    recurring: { interval: "month" },
    nickname: "Pro Base Monthly",
    metadata: { type: "base", plan: "PRO", cycle: "monthly" },
  });

  const proBaseYearly = await stripe.prices.create({
    product: pro.id,
    currency: "eur",
    unit_amount: 39000,
    recurring: { interval: "year" },
    nickname: "Pro Base Yearly",
    metadata: { type: "base", plan: "PRO", cycle: "yearly" },
  });

  const proSeatMonthly = await stripe.prices.create({
    product: pro.id,
    currency: "eur",
    unit_amount: 1000,
    recurring: { interval: "month" },
    nickname: "Pro Extra Seat Monthly",
    metadata: { type: "seat", plan: "PRO", cycle: "monthly" },
  });

  const proSeatYearly = await stripe.prices.create({
    product: pro.id,
    currency: "eur",
    unit_amount: 10000,
    recurring: { interval: "year" },
    nickname: "Pro Extra Seat Yearly",
    metadata: { type: "seat", plan: "PRO", cycle: "yearly" },
  });

  // ── Business Product ─────────────────────────────────
  const business = await stripe.products.create({
    name: "Oikion Business",
    description: "Real estate agency platform — Business tier",
    metadata: { plan: "BUSINESS" },
  });
  console.log("Created product:", business.id, "(Business)");

  const businessBaseMonthly = await stripe.prices.create({
    product: business.id,
    currency: "eur",
    unit_amount: 9900,
    recurring: { interval: "month" },
    nickname: "Business Base Monthly",
    metadata: { type: "base", plan: "BUSINESS", cycle: "monthly" },
  });

  const businessBaseYearly = await stripe.prices.create({
    product: business.id,
    currency: "eur",
    unit_amount: 99000,
    recurring: { interval: "year" },
    nickname: "Business Base Yearly",
    metadata: { type: "base", plan: "BUSINESS", cycle: "yearly" },
  });

  const businessSeatMonthly = await stripe.prices.create({
    product: business.id,
    currency: "eur",
    unit_amount: 800,
    recurring: { interval: "month" },
    nickname: "Business Extra Seat Monthly",
    metadata: { type: "seat", plan: "BUSINESS", cycle: "monthly" },
  });

  const businessSeatYearly = await stripe.prices.create({
    product: business.id,
    currency: "eur",
    unit_amount: 8000,
    recurring: { interval: "year" },
    nickname: "Business Extra Seat Yearly",
    metadata: { type: "seat", plan: "BUSINESS", cycle: "yearly" },
  });

  console.log("\n✅ Done. Add these to your .env.local:\n");
  console.log(`STRIPE_PRO_BASE_MONTHLY_ID="${proBaseMonthly.id}"`);
  console.log(`STRIPE_PRO_BASE_YEARLY_ID="${proBaseYearly.id}"`);
  console.log(`STRIPE_PRO_SEAT_MONTHLY_ID="${proSeatMonthly.id}"`);
  console.log(`STRIPE_PRO_SEAT_YEARLY_ID="${proSeatYearly.id}"`);
  console.log(`STRIPE_BUSINESS_BASE_MONTHLY_ID="${businessBaseMonthly.id}"`);
  console.log(`STRIPE_BUSINESS_BASE_YEARLY_ID="${businessBaseYearly.id}"`);
  console.log(`STRIPE_BUSINESS_SEAT_MONTHLY_ID="${businessSeatMonthly.id}"`);
  console.log(`STRIPE_BUSINESS_SEAT_YEARLY_ID="${businessSeatYearly.id}"`);
}

main().catch(console.error);
```

- [ ] **Step 2: Run the script**

```bash
STRIPE_API_KEY=$(grep STRIPE_API_KEY .env.local | cut -d= -f2 | tr -d '"') \
  pnpm tsx scripts/stripe-setup.ts
```

Expected output: 8 `price_xxx` IDs printed.

- [ ] **Step 3: Paste the 8 price IDs into your `.env.local`**

- [ ] **Step 4: Commit the script**

```bash
git add scripts/stripe-setup.ts
git commit -m "feat(billing): add stripe product/price setup script"
```

---

## Task 3: Prisma Schema — OrgSubscription Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and model to the end of schema.prisma** (before the final closing or after the last existing model)

Add these three enums:

```prisma
enum SubscriptionPlan {
  FREE
  PRO
  BUSINESS
}

enum SubscriptionStatus {
  INACTIVE
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

enum BillingCycle {
  MONTHLY
  YEARLY
}
```

Add this model:

```prisma
model OrgSubscription {
  id                   String             @id @default(cuid())
  organizationId       String             @unique
  stripeCustomerId     String             @unique
  stripeSubscriptionId String?            @unique
  stripeBaseItemId     String?
  stripeSeatItemId     String?
  plan                 SubscriptionPlan   @default(FREE)
  billingCycle         BillingCycle?
  status               SubscriptionStatus @default(INACTIVE)
  seatAllowance        Int                @default(0)
  overageSeats         Int                @default(0)
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([organizationId])
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}
```

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
# When prompted for migration name, enter: add_org_subscription
```

Expected: new migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify**

```bash
pnpm db:status
```

Expected: all migrations applied, no pending.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(billing): add OrgSubscription model with Stripe fields"
```

---

## Task 4: Core Lib — Stripe Client + Plan Config

**Files:**
- Create: `lib/stripe.ts`
- Create: `lib/billing/plans.ts`

- [ ] **Step 1: Create Stripe singleton**

```typescript
// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_API_KEY) {
  throw new Error("STRIPE_API_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_API_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});
```

- [ ] **Step 2: Create plan config**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts lib/billing/plans.ts
git commit -m "feat(billing): add Stripe client singleton and plan config"
```

---

## Task 5: Billing Helpers

**Files:**
- Create: `lib/billing/helpers.ts`

- [ ] **Step 1: Create helpers file**

```typescript
// lib/billing/helpers.ts
import { stripe } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { getBasePriceId, getSeatPriceId, getPlanConfig } from "@/lib/billing/plans";
import type { BillingCycle, PlanKey } from "@/lib/billing/plans";
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
 * Returns the current member count for a Clerk org, excluding personal workspaces.
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

  await stripe.subscriptionItems.update(sub.stripeSeatItemId, {
    quantity: newOverage,
    proration_behavior: "always_invoice",
  });

  await prismadb.orgSubscription.update({
    where: { organizationId },
    data: { overageSeats: newOverage },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/billing/helpers.ts
git commit -m "feat(billing): add billing helpers (customer, seat sync)"
```

---

## Task 6: Plan Access Helper

**Files:**
- Create: `lib/billing/plan-access.ts`

- [ ] **Step 1: Create plan-access.ts**

```typescript
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
  return config?.features.includes(feature) ?? false;
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
```

- [ ] **Step 2: Write unit tests**

Create `tests/billing/plan-access.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests**

```bash
pnpm vitest run tests/billing/plan-access.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/billing/plan-access.ts tests/billing/plan-access.test.ts
git commit -m "feat(billing): add plan-access helpers with unit tests"
```

---

## Task 7: Checkout API Route

**Files:**
- Create: `app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create checkout route**

```typescript
// app/api/billing/checkout/route.ts
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
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

    // Get org owner email + name from Clerk
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
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
    return apiInternalError("Failed to create checkout session", error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/billing/checkout/route.ts
git commit -m "feat(billing): add checkout session API route"
```

---

## Task 8: Customer Portal API Route

**Files:**
- Create: `app/api/billing/portal/route.ts`

- [ ] **Step 1: Create portal route**

```typescript
// app/api/billing/portal/route.ts
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import {
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
} from "@/lib/api-response";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const sub = await prismadb.orgSubscription.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      return apiBadRequest("No billing account found for this organization");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/app/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[BILLING_PORTAL]", error);
    return apiInternalError("Failed to create portal session", error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/billing/portal/route.ts
git commit -m "feat(billing): add customer portal API route"
```

---

## Task 9: Stripe Webhook Handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

The route is already public (proxy.ts has `/api/webhooks(.*)` as a public + rate-limit-excluded route). **IMPORTANT: use `req.text()` not `req.json()` — Stripe signature verification requires the raw body bytes.**

- [ ] **Step 1: Create webhook route**

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import { PLAN_CONFIGS, getPlanConfig } from "@/lib/billing/plans";
import { calculateOverageSeats, getOrgMemberCount } from "@/lib/billing/helpers";
import type { SubscriptionPlan, BillingCycle } from "@prisma/client";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text(); // raw body needed for signature verification
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

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
        // Unhandled event — ignore
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

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ["items.data.price"],
  });

  const organizationId = subscription.metadata.organizationId;
  const plan = subscription.metadata.plan as SubscriptionPlan;
  const billingCycle = subscription.metadata.billingCycle as BillingCycle;
  const seatAllowance = Number(subscription.metadata.seatAllowance ?? 0);

  if (!organizationId || !plan) {
    console.error("[STRIPE_WEBHOOK] checkout.session.completed missing metadata");
    return;
  }

  // The subscription currently has only the base item.
  // Check if overage seats are needed and add a seat item.
  const baseItem = subscription.items.data[0];
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
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Activated ${plan} subscription for org ${organizationId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) return;

  const stripeStatus = subscription.status;
  const statusMap: Record<string, SubscriptionPlan | string> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INACTIVE",
    incomplete_expired: "INACTIVE",
    paused: "INACTIVE",
  };

  const status = (statusMap[stripeStatus] ?? "INACTIVE") as any;

  await prismadb.orgSubscription.updateMany({
    where: { organizationId },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
  const customerId = invoice.customer as string;
  if (!customerId) return;

  await prismadb.orgSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });
}
```

- [ ] **Step 2: Set up Stripe CLI for local webhook testing**

Install the Stripe CLI if not already installed:
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

Start webhook forwarding in a separate terminal:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` secret it prints and set `STRIPE_WEBHOOK_SECRET` in `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat(billing): add Stripe webhook handler"
```

---

## Task 10: Update Clerk Webhook — Seat Sync on Member Join

**Files:**
- Modify: `app/api/webhooks/clerk/route.ts`

The Clerk webhook already handles `organizationMembership.deleted` (departure flow). We need to add `organizationMembership.created` to trigger seat sync when someone joins, and add seat sync to the existing deletion handler.

- [ ] **Step 1: Add import for syncSeatQuantity at top of file**

In `app/api/webhooks/clerk/route.ts`, add this import alongside the existing ones:

```typescript
import { syncSeatQuantity } from "@/lib/billing/helpers";
```

- [ ] **Step 2: Add organizationMembership.created handler**

After the existing `organizationMembership.deleted` block (around line 188), add:

```typescript
  // Handle membership creation — sync seat quantity for billing
  if (eventType === "organizationMembership.created") {
    const data = evt.data as {
      organization?: { id: string; public_metadata?: Record<string, unknown> };
    };

    const orgId = data.organization?.id;
    const orgMetadata = data.organization?.public_metadata;

    // Skip personal workspaces — they don't have billing subscriptions
    if (orgId && orgMetadata?.type !== "personal") {
      syncSeatQuantity(orgId).catch((err) => {
        console.error(`[WEBHOOK] Seat sync failed for org ${orgId}:`, err);
      });
    }
  }
```

- [ ] **Step 3: Add seat sync to the organizationMembership.deleted handler**

Inside the existing `organizationMembership.deleted` handler, after the `if (orgMetadata?.type === "personal")` branch's else block (after `handleUserDeparture` call), add seat sync:

```typescript
      // Sync seat count after member removal (non-blocking)
      syncSeatQuantity(orgId).catch((err) => {
        console.error(`[WEBHOOK] Seat sync after departure failed for org ${orgId}:`, err);
      });
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/clerk/route.ts
git commit -m "feat(billing): sync Stripe seat quantity on Clerk membership events"
```

---

## Task 11: i18n — Billing Translations

**Files:**
- Create: `locales/en/billing.json`
- Create: `locales/el/billing.json`
- Modify: `i18n.ts`

- [ ] **Step 1: Create English billing translations**

```json
{
  "title": "Billing",
  "currentPlan": "Current Plan",
  "plan": {
    "free": "Free",
    "pro": "Pro",
    "business": "Business"
  },
  "status": {
    "active": "Active",
    "trialing": "Trial",
    "past_due": "Past Due",
    "canceled": "Canceled",
    "inactive": "Inactive",
    "unpaid": "Unpaid"
  },
  "cycle": {
    "monthly": "Monthly",
    "yearly": "Yearly"
  },
  "seats": {
    "label": "Team Seats",
    "included": "{count} included",
    "used": "{used} of {total} used",
    "overage": "{count} extra seat",
    "overage_plural": "{count} extra seats"
  },
  "renewal": "Renews on {date}",
  "cancelAt": "Cancels on {date}",
  "upgradeTitle": "Upgrade your plan",
  "upgradeDescription": "Unlock more features and seats for your team.",
  "actions": {
    "upgrade": "Upgrade",
    "manage": "Manage Billing",
    "portal": "Open Billing Portal",
    "upgrading": "Redirecting to checkout…",
    "managing": "Opening portal…"
  },
  "success": "Subscription activated! Welcome to {plan}.",
  "canceled": "Checkout canceled. No changes were made.",
  "pastDueNotice": "Your payment is past due. Please update your payment method to keep your subscription active.",
  "perMonth": "/mo",
  "perYear": "/yr",
  "perSeat": "/seat",
  "proFeatures": [
    "MLS property listings",
    "CRM contacts & requests",
    "Matchmaking",
    "Calendar & events",
    "Documents",
    "Import & Export"
  ],
  "businessFeatures": [
    "Everything in Pro",
    "Agency network access",
    "Advanced analytics",
    "External API access"
  ]
}
```

- [ ] **Step 2: Create Greek billing translations**

```json
{
  "title": "Χρέωση",
  "currentPlan": "Τρέχον Πλάνο",
  "plan": {
    "free": "Δωρεάν",
    "pro": "Pro",
    "business": "Business"
  },
  "status": {
    "active": "Ενεργό",
    "trialing": "Δοκιμαστική Περίοδος",
    "past_due": "Ληξιπρόθεσμο",
    "canceled": "Ακυρωμένο",
    "inactive": "Ανενεργό",
    "unpaid": "Απλήρωτο"
  },
  "cycle": {
    "monthly": "Μηνιαίο",
    "yearly": "Ετήσιο"
  },
  "seats": {
    "label": "Θέσεις Ομάδας",
    "included": "{count} συμπεριλαμβάνονται",
    "used": "{used} από {total} χρησιμοποιούνται",
    "overage": "{count} επιπλέον θέση",
    "overage_plural": "{count} επιπλέον θέσεις"
  },
  "renewal": "Ανανέωση στις {date}",
  "cancelAt": "Ακύρωση στις {date}",
  "upgradeTitle": "Αναβαθμίστε το πλάνο σας",
  "upgradeDescription": "Ξεκλειδώστε περισσότερες λειτουργίες και θέσεις για την ομάδα σας.",
  "actions": {
    "upgrade": "Αναβάθμιση",
    "manage": "Διαχείριση Χρέωσης",
    "portal": "Άνοιγμα Πύλης Χρέωσης",
    "upgrading": "Μεταφορά στο checkout…",
    "managing": "Άνοιγμα πύλης…"
  },
  "success": "Η συνδρομή ενεργοποιήθηκε! Καλωσορίσατε στο {plan}.",
  "canceled": "Το checkout ακυρώθηκε. Δεν έγιναν αλλαγές.",
  "pastDueNotice": "Η πληρωμή σας είναι ληξιπρόθεσμη. Παρακαλώ ενημερώστε τον τρόπο πληρωμής σας.",
  "perMonth": "/μήνα",
  "perYear": "/χρόνο",
  "perSeat": "/θέση",
  "proFeatures": [
    "Αγγελίες ακινήτων MLS",
    "CRM επαφές & αιτήσεις",
    "Matchmaking",
    "Ημερολόγιο & εκδηλώσεις",
    "Έγγραφα",
    "Εισαγωγή & Εξαγωγή"
  ],
  "businessFeatures": [
    "Όλα του Pro",
    "Πρόσβαση στο δίκτυο μεσιτών",
    "Σύνθετη ανάλυση",
    "Πρόσβαση εξωτερικού API"
  ]
}
```

- [ ] **Step 3: Register billing in i18n.ts**

In `i18n.ts`, add the static imports after the last existing import:

```typescript
import billingEn from "./locales/en/billing.json";
import billingEl from "./locales/el/billing.json";
```

Then in the `loadMessages` function, add `messages.billing` to both the Greek (`el`) and the default (English) branches:

In the `el` branch, after the last `messages.xxx = xxxEl;` line:
```typescript
messages.billing = billingEl;
```

In the English `else` branch, after the last `messages.xxx = xxxEn;` line:
```typescript
messages.billing = billingEn;
```

- [ ] **Step 4: Commit**

```bash
git add locales/en/billing.json locales/el/billing.json i18n.ts
git commit -m "feat(billing): add billing translations (en + el) and register in i18n"
```

---

## Task 12: Billing UI Components

**Files:**
- Create: `app/[locale]/app/(routes)/settings/(org-required)/billing/components/CurrentPlanCard.tsx`
- Create: `app/[locale]/app/(routes)/settings/(org-required)/billing/components/PlanSelector.tsx`
- Create: `app/[locale]/app/(routes)/settings/(org-required)/billing/components/BillingActions.tsx`

- [ ] **Step 1: Create CurrentPlanCard (server component)**

```typescript
// app/[locale]/app/(routes)/settings/(org-required)/billing/components/CurrentPlanCard.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { OrgSubscription } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";

type Props = {
  sub: OrgSubscription | null;
  memberCount: number;
};

export async function CurrentPlanCard({ sub, memberCount }: Props) {
  const t = await getTranslations("billing");

  const plan = sub?.plan ?? "FREE";
  const status = sub?.status ?? "INACTIVE";
  const seatAllowance = sub?.seatAllowance ?? 0;
  const totalSeats = seatAllowance + (sub?.overageSeats ?? 0);

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    TRIALING: "secondary",
    PAST_DUE: "destructive",
    CANCELED: "outline",
    INACTIVE: "outline",
    UNPAID: "destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("currentPlan")}</CardTitle>
          <Badge variant={statusVariant[status] ?? "outline"}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{t(`plan.${plan.toLowerCase()}`)}</span>
          {sub?.billingCycle && (
            <span className="text-sm text-muted-foreground">
              · {t(`cycle.${sub.billingCycle.toLowerCase()}`)}
            </span>
          )}
        </div>

        {plan !== "FREE" && seatAllowance > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("seats.label")}</span>
              <span className="tabular-nums">
                {t("seats.used", { used: memberCount, total: totalSeats })}
              </span>
            </div>
            <Progress value={(memberCount / Math.max(totalSeats, 1)) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {t("seats.included", { count: seatAllowance })}
              {(sub?.overageSeats ?? 0) > 0 && (
                <> · {t("seats.overage", { count: sub!.overageSeats })}</>
              )}
            </p>
          </div>
        )}

        {sub?.currentPeriodEnd && status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
          <p className="text-xs text-muted-foreground">
            {t("renewal", { date: format(sub.currentPeriodEnd, "PPP") })}
          </p>
        )}
        {sub?.currentPeriodEnd && sub.cancelAtPeriodEnd && (
          <p className="text-xs text-destructive">
            {t("cancelAt", { date: format(sub.currentPeriodEnd, "PPP") })}
          </p>
        )}

        {status === "PAST_DUE" && (
          <p className="text-xs text-destructive">{t("pastDueNotice")}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create BillingActions (client component)**

```typescript
// app/[locale]/app/(routes)/settings/(org-required)/billing/components/BillingActions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import type { OrgSubscription } from "@prisma/client";

type Props = {
  sub: OrgSubscription | null;
  plan?: "PRO" | "BUSINESS";
  billingCycle?: "MONTHLY" | "YEARLY";
  variant?: "upgrade" | "portal";
};

export function BillingActions({ sub, plan, billingCycle, variant = "portal" }: Props) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    if (!plan || !billingCycle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  if (variant === "upgrade") {
    return (
      <Button onClick={handleUpgrade} disabled={loading} size="sm">
        {loading ? t("actions.upgrading") : t("actions.upgrade")}
      </Button>
    );
  }

  if (!sub?.stripeSubscriptionId) return null;

  return (
    <Button onClick={handlePortal} disabled={loading} variant="outline" size="sm">
      {loading ? t("actions.managing") : t("actions.portal")}
    </Button>
  );
}
```

- [ ] **Step 3: Create PlanSelector (server component)**

```typescript
// app/[locale]/app/(routes)/settings/(org-required)/billing/components/PlanSelector.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BillingActions } from "./BillingActions";
import type { OrgSubscription } from "@prisma/client";

type Props = {
  sub: OrgSubscription | null;
  defaultCycle?: "MONTHLY" | "YEARLY";
};

export async function PlanSelector({ sub, defaultCycle = "MONTHLY" }: Props) {
  const t = await getTranslations("billing");

  const plans = [
    {
      key: "PRO" as const,
      name: t("plan.pro"),
      monthlyPrice: "€39",
      yearlyPrice: "€390",
      features: t.raw("proFeatures") as string[],
    },
    {
      key: "BUSINESS" as const,
      name: t("plan.business"),
      monthlyPrice: "€99",
      yearlyPrice: "€990",
      features: t.raw("businessFeatures") as string[],
    },
  ];

  const currentPlan = sub?.plan ?? "FREE";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        return (
          <Card key={plan.key} className={isCurrent ? "border-primary" : undefined}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="text-lg font-bold text-foreground">
                      {defaultCycle === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="text-xs ml-1">
                      {defaultCycle === "MONTHLY" ? t("perMonth") : t("perYear")}
                    </span>
                  </CardDescription>
                </div>
                {!isCurrent && (
                  <BillingActions
                    sub={sub}
                    plan={plan.key}
                    billingCycle={defaultCycle}
                    variant="upgrade"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/\(routes\)/settings/\(org-required\)/billing/components/
git commit -m "feat(billing): add billing UI components (CurrentPlanCard, PlanSelector, BillingActions)"
```

---

## Task 13: Billing Settings Page

**Files:**
- Create: `app/[locale]/app/(routes)/settings/(org-required)/billing/page.tsx`

- [ ] **Step 1: Create billing page**

```typescript
// app/[locale]/app/(routes)/settings/(org-required)/billing/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClerkClient } from "@clerk/backend";
import Container from "@/app/[locale]/app/(routes)/components/ui/Container";
import { getOrgSubscription } from "@/lib/billing/plan-access";
import { getOrgMemberCount } from "@/lib/billing/helpers";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { PlanSelector } from "./components/PlanSelector";
import { BillingActions } from "./components/BillingActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function BillingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { success, canceled } = await searchParams;
  const t = await getTranslations("billing");

  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) redirect(`/${locale}/app/sign-in`);

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const org = await clerk.organizations.getOrganization({ organizationId });
  const isPersonalWorkspace = (org.publicMetadata as Record<string, unknown>)?.type === "personal";
  if (isPersonalWorkspace) redirect(`/${locale}/app`);

  const [sub, memberCount] = await Promise.all([
    getOrgSubscription(organizationId),
    getOrgMemberCount(organizationId),
  ]);

  const currentPlan = sub?.plan ?? "FREE";
  const hasSubscription = sub?.stripeSubscriptionId != null;
  const defaultCycle = sub?.billingCycle ?? "MONTHLY";

  return (
    <Container>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {t("success", { plan: t(`plan.${currentPlan.toLowerCase()}`) })}
            </AlertDescription>
          </Alert>
        )}

        {canceled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{t("canceled")}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CurrentPlanCard sub={sub} memberCount={memberCount} />

          {hasSubscription && (
            <div className="flex items-start">
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">{t("actions.manage")}</p>
                <BillingActions sub={sub} variant="portal" />
              </div>
            </div>
          )}
        </div>

        {currentPlan !== "BUSINESS" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("upgradeTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("upgradeDescription")}</p>
            </div>
            <PlanSelector sub={sub} defaultCycle={defaultCycle} />
          </div>
        )}
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/app/(routes)/settings/(org-required)/billing/page.tsx"
git commit -m "feat(billing): add billing settings page"
```

---

## Task 14: Navigation — Add Billing Link

**Files:**
- Modify: `config/navigation.tsx`

- [ ] **Step 1: Add Billing to the settings items array**

In `config/navigation.tsx`, locate the settings nav block (the one with `url: "/app/admin"` and items including `data-control`, `departures`). Add a billing item:

```typescript
{
  title: dict.navigation.ModuleMenu.billing ?? "Billing",
  url: "/app/settings/billing",
},
```

Add it before `data-control` in the `items` array. The full items array will look like:

```typescript
items: [
  {
    title: dict.navigation.ModuleMenu.settings,
    url: "/app/admin",
  },
  {
    title: dict.navigation.ModuleMenu.billing ?? "Billing",
    url: "/app/settings/billing",
  },
  {
    title: dict.navigation.ModuleMenu.dataControl || "Data Control",
    url: "/app/settings/data-control",
  },
  {
    title: dict.navigation.ModuleMenu.departures || "Departures",
    url: "/app/settings/departures",
  },
],
```

- [ ] **Step 2: Add "billing" key to navigation locale files**

In `locales/en/navigation.json`, add to `ModuleMenu`:
```json
"billing": "Billing"
```

In `locales/el/navigation.json`, add to `ModuleMenu`:
```json
"billing": "Χρέωση"
```

- [ ] **Step 3: Commit**

```bash
git add config/navigation.tsx locales/en/navigation.json locales/el/navigation.json
git commit -m "feat(billing): add Billing nav link in settings sidebar"
```

---

## Task 15: End-to-End Test

- [ ] **Step 1: Start the dev server and Stripe CLI listener**

Terminal 1:
```bash
pnpm dev
```

Terminal 2:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

- [ ] **Step 2: Trigger a test checkout**

1. Navigate to `https://localhost:3000/app/settings/billing`
2. Click "Upgrade" on the Pro Monthly card
3. Complete checkout with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
4. Verify redirect to `/app/settings/billing?success=true`
5. Verify success alert appears and plan shows "Pro"

- [ ] **Step 3: Verify DB record**

```bash
pnpm prisma studio
```

Open OrgSubscription table — verify a row exists with `status: ACTIVE`, `plan: PRO`.

- [ ] **Step 4: Test portal**

Click "Open Billing Portal" — verify redirect to Stripe-hosted portal page.

- [ ] **Step 5: Test seat sync**

Add a member to the org (via Clerk dashboard or the app's team management).
Verify Stripe CLI terminal shows the webhook event.
Check OrgSubscription row for updated `overageSeats` if member count exceeded 5.

- [ ] **Step 6: Final commit**

```bash
git add -p  # review and stage any remaining changes
git commit -m "feat(billing): complete Stripe billing integration"
```

---

## Self-Review Against Spec

| Requirement | Task |
|---|---|
| Install Stripe | Task 1 |
| Create Stripe products/prices | Task 2 |
| Prisma OrgSubscription model | Task 3 |
| Plan config (Pro €39+€10/seat, Business €99+€8/seat) | Task 4 |
| 5 / 15 seat allowances | Task 4 |
| Monthly + yearly billing cycles | Task 4, 5 |
| Customer creation | Task 5 |
| Seat overage calculation | Task 5 |
| Seat sync on member join/leave | Task 10 |
| Checkout API | Task 7 |
| Portal API | Task 8 |
| Stripe webhook (checkout, update, delete, payment_failed) | Task 9 |
| Plan access helper with feature gating | Task 6 |
| Unit tests | Task 6 |
| Billing page with current plan, seats, upgrade cards | Task 12, 13 |
| Navigation link | Task 14 |
| i18n (en + el) | Task 11 |
| Success/canceled URL param handling | Task 13 |

No gaps found. All spec requirements covered.
