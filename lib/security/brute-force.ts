import { cacheIncr, cacheDel, cacheGet } from "@/lib/redis";

/**
 * Brute Force Protection
 *
 * Redis-backed attempt counters for sensitive operations.
 * Fail-closed: if Redis is unavailable, requests are blocked.
 */

type BruteForceType = "otp" | "login" | "pin";

const LIMITS: Record<BruteForceType, { maxAttempts: number; windowSeconds: number }> = {
  otp: { maxAttempts: 5, windowSeconds: 900 },    // 5 attempts per 15 minutes
  login: { maxAttempts: 10, windowSeconds: 900 },  // 10 attempts per 15 minutes
  pin: { maxAttempts: 5, windowSeconds: 900 },     // 5 PIN attempts per 15 minutes
};

function getKey(type: string, identifier: string): string {
  return `oik:brute:${type}:${identifier}`;
}

export interface BruteForceResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Check if an attempt is allowed (does NOT increment the counter).
 * Call recordFailedAttempt() separately on failure.
 */
export async function checkAttempt(
  type: BruteForceType,
  identifier: string
): Promise<BruteForceResult> {
  const config = LIMITS[type];
  const key = getKey(type, identifier);

  let current: number | null;
  try {
    current = await cacheGet<number>(key);
  } catch {
    // Fail-closed: if Redis is down, block the request to prevent brute force
    console.error(`[BRUTE_FORCE] Redis error for key ${key}, failing closed`);
    return { allowed: false, remaining: 0, retryAfter: 60 };
  }

  // No attempts recorded yet — allow
  if (current === null || current === 0) {
    return { allowed: true, remaining: config.maxAttempts };
  }

  if (current >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: config.windowSeconds,
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - current,
  };
}

/**
 * Record a failed attempt. Increments the counter and sets TTL.
 */
export async function recordFailedAttempt(
  type: BruteForceType,
  identifier: string
): Promise<void> {
  const config = LIMITS[type];
  await cacheIncr(getKey(type, identifier), config.windowSeconds);
}

/**
 * Clear all attempts for an identifier (e.g., on successful auth).
 */
export async function clearAttempts(
  type: BruteForceType,
  identifier: string
): Promise<void> {
  await cacheDel(getKey(type, identifier));
}
