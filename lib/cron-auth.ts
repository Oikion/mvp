import { createHmac, timingSafeEqual } from "crypto";

// Fixed-length key — HMAC normalises both sides to 32 bytes before timingSafeEqual,
// eliminating the early-exit length oracle present in raw buffer comparison.
const HMAC_KEY = Buffer.alloc(32);

/**
 * Timing-safe HMAC-based verification for cron/worker auth headers.
 *
 * Both the expected token and the provided header are hashed through HMAC-SHA256
 * before comparison, so timingSafeEqual always operates on equal-length digests
 * regardless of the length of the raw secret.
 *
 * @param authHeader  - The raw Authorization header value (e.g. "Bearer <token>")
 * @param secret      - The expected secret (from env var, already without "Bearer " prefix)
 * @returns true only when authHeader === "Bearer <secret>" in constant time
 */
export function verifyAuthToken(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const expected = createHmac("sha256", HMAC_KEY).update("Bearer " + secret).digest();
  const provided = createHmac("sha256", HMAC_KEY).update(authHeader).digest();
  return timingSafeEqual(expected, provided);
}
