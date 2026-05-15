/**
 * One-time Stripe setup script for Oikion hybrid billing model.
 * Creates two products (Pro, Business) with 4 prices each:
 * base (flat rate) + seat overage, monthly + yearly.
 *
 * Run once per Stripe account:
 *   STRIPE_API_KEY=sk_test_... pnpm tsx scripts/stripe-setup.ts
 *
 * Paste the printed price IDs into .env.local.
 * Re-running is safe — existing products are skipped.
 */

import Stripe from "stripe";

async function main() {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });

  // Verify API key is valid before doing anything
  const account = await stripe.accounts.retrieve();
  console.log(`Stripe account: ${account.id} (${account.country ?? "unknown country"})\n`);

  console.log("Creating Stripe products and prices...\n");

  // ── Pro Product ──────────────────────────────────────
  const existingProducts = await stripe.products.list({ limit: 100, active: true });

  const existingPro = existingProducts.data.find((p) => p.name === "Oikion Pro");
  if (existingPro) {
    console.warn("⚠️  'Oikion Pro' already exists — skipping creation. Delete it in Stripe dashboard first to re-run.");
    process.exit(0);
  }

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
