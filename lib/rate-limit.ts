import { Ratelimit } from '@upstash/ratelimit';
import { redis, isRedisAvailable } from '@/lib/redis';

// Rate limit tiers for different API types
export type RateLimitTier = 'default' | 'strict' | 'lenient' | 'burst' | 'api';

// Rate limit configurations per tier
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, { requests: number; window: string; windowMs: number }> = {
  // Default: 60 requests per minute (general API usage)
  default: { requests: 60, window: '1 m', windowMs: 60 * 1000 },
  // Strict: 10 requests per minute (sensitive operations like auth, password reset)
  strict: { requests: 10, window: '1 m', windowMs: 60 * 1000 },
  // Lenient: 120 requests per minute (read-heavy operations)
  lenient: { requests: 120, window: '1 m', windowMs: 60 * 1000 },
  // Burst: 30 requests per 10 seconds (allows short bursts but limits sustained abuse)
  burst: { requests: 30, window: '10 s', windowMs: 10 * 1000 },
  // API: 100 requests per minute (external API access via API keys)
  api: { requests: 100, window: '1 m', windowMs: 60 * 1000 },
};

// Initialize rate limiters with Vercel KV
const rateLimiters: Partial<Record<RateLimitTier, Ratelimit>> = {};

if (isRedisAvailable) {
  try {
    // Create rate limiters for each tier
    for (const [tier, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
      rateLimiters[tier as RateLimitTier] = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
        analytics: true,
        prefix: `@oikion/ratelimit/${tier}`,
      });
    }
  } catch (error) {
    console.error('[RATE_LIMIT_INIT] Failed to initialize Upstash Redis:', error);
  }
}

// In-memory rate limiter fallback (for development without Redis)
class InMemoryRateLimiter {
  private readonly store = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    // Clean up expired entries every 30 seconds to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 30 * 1000);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((record, key) => {
      if (now > record.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.store.delete(key));
  }

  async limit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const key = identifier;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Create new window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    if (record.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    this.store.set(key, record);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.count,
      reset: record.resetTime,
    };
  }
}

const inMemoryRateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit an identifier (IP address, user ID, etc.)
 * @param identifier - Unique identifier to rate limit (e.g., IP address or user ID)
 * @param tier - Rate limit tier to use (default, strict, lenient, burst)
 * @returns Rate limit result with success status and metadata
 */
export async function rateLimit(
  identifier: string,
  tier: RateLimitTier = 'default'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Skip rate limiting only in non-production environments
  if (process.env.DISABLE_RATE_LIMITING === 'true' && process.env.NODE_ENV !== 'production') {
    const config = RATE_LIMIT_CONFIGS[tier];
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: Date.now() + config.windowMs,
    };
  }

  const config = RATE_LIMIT_CONFIGS[tier];
  const limiter = rateLimiters[tier];

  if (limiter) {
    try {
      return await limiter.limit(identifier);
    } catch (error) {
      console.error('[RATE_LIMIT_ERROR] Upstash Redis error, falling back to in-memory:', error);
      // Fall through to in-memory fallback
    }
  }

  // Fallback to in-memory rate limiting
  return await inMemoryRateLimiter.limit(identifier, config.requests, config.windowMs);
}

/**
 * Get identifier from request (IP address or user ID)
 * Works with both server and edge runtime
 *
 * Priority: x-vercel-forwarded-for (platform-set, unspoofable on Vercel)
 *           > x-real-ip > x-forwarded-for (client-spoofable) > 'unknown'
 */
export function getRateLimitIdentifier(req: Request): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = vercelIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : 'unknown');
  return `ip:${ip}`;
}

/**
 * Get rate limit identifier for API key authenticated requests
 * @param apiKeyId - The API key ID
 * @returns Rate limit identifier string
 */
export function getApiKeyRateLimitIdentifier(apiKeyId: string): string {
  return `apikey:${apiKeyId}`;
}

/**
 * Determine the appropriate rate limit tier based on the request path
 * @param pathname - The request pathname
 * @returns The appropriate rate limit tier
 */
export function getRateLimitTier(pathname: string): RateLimitTier {
  // Strict rate limiting for sensitive operations
  const strictPaths = [
    '/api/auth',
    '/api/user/setnewpass',
    '/api/user/inviteuser',
    '/api/user/passwordReset',
  ];

  if (strictPaths.some(p => pathname.startsWith(p))) {
    return 'strict';
  }

  // Lenient rate limiting for read-heavy operations
  const lenientPaths = [
    '/api/user/check-username',
  ];

  if (lenientPaths.some(p => pathname.startsWith(p))) {
    return 'lenient';
  }

  // External API uses its own tier
  if (pathname.startsWith('/api/v1')) {
    return 'api';
  }

  return 'default';
}
