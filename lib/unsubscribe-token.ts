import { createHmac, timingSafeEqual } from "crypto";

const HMAC_SECRET = process.env.CLERK_SECRET_KEY || "";

/**
 * Generate an HMAC-SHA256 token for an email address.
 * Used to sign unsubscribe links so they can't be forged.
 */
export function generateUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  return createHmac("sha256", HMAC_SECRET).update(normalized).digest("hex");
}

/**
 * Verify an HMAC token matches the expected value for an email.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyUnsubscribeToken(
  email: string,
  token: string
): boolean {
  const normalized = email.toLowerCase().trim();
  const expected = createHmac("sha256", HMAC_SECRET)
    .update(normalized)
    .digest("hex");

  if (token.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Build a full unsubscribe URL with signed token.
 */
export function buildUnsubscribeUrl(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
  const normalized = email.toLowerCase().trim();
  const token = generateUnsubscribeToken(normalized);
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(normalized)}&token=${token}`;
}
