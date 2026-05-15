// lib/stripe.ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  if (!process.env.STRIPE_API_KEY) {
    throw new Error("STRIPE_API_KEY is not set");
  }

  _stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return _stripe;
}
