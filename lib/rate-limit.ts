import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Rate limit tiers for different API types
export type RateLimitTier = 'default' | 'strict' | 'lenient' | 'burst';

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
};

// Initialize rate limiters with Vercel KV
const rateLimiters: Partial<Record<RateLimitTier, Ratelimit>> = {};

// Check if Vercel KV is available (via KV_URL or KV_REST_API_URL)
const isKvAvailable = !!(process.env.KV_URL || process.env.KV_REST_API_URL);

if (isKvAvailable) {
  try {
    // Create rate limiters for each tier
    for (const [tier, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
      rateLimiters[tier as RateLimitTier] = new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(config.requests, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
        analytics: true,
        prefix: `@oikion/ratelimit/${tier}`,
      });
    }
  } catch (error) {
    console.error('[RATE_LIMIT_INIT] Failed to initialize Vercel KV:', error);
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
  const config = RATE_LIMIT_CONFIGS[tier];
  const limiter = rateLimiters[tier];

  if (limiter) {
    try {
      return await limiter.limit(identifier);
    } catch (error) {
      console.error('[RATE_LIMIT_ERROR] Vercel KV error, falling back to in-memory:', error);
      // Fall through to in-memory fallback
    }
  }

  // Fallback to in-memory rate limiting
  return await inMemoryRateLimiter.limit(identifier, config.requests, config.windowMs);
}

/**
 * Get identifier from request (IP address or user ID)
 * Works with both server and edge runtime
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get user ID from headers (if authenticated)
  const userId = req.headers.get('x-user-id') || req.headers.get('x-clerk-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
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
    '/api/user/password',
    '/api/user/email',
    '/api/org/invite',
    '/api/webhooks',
  ];
  
  if (strictPaths.some(path => pathname.startsWith(path))) {
    return 'strict';
  }

  // Lenient rate limiting for read-heavy operations
  const lenientPaths = [
    '/api/global-search',
    '/api/mls/properties',
    '/api/crm/clients',
    '/api/documents',
    '/api/calendar/events',
    '/api/notifications',
  ];
  
  // Only GET requests to these paths get lenient limits
  if (lenientPaths.some(path => pathname.startsWith(path))) {
    return 'lenient';
  }

  // Burst tier for file operations and real-time features
  const burstPaths = [
    '/api/upload',
    '/api/documents/upload',
    '/api/profile/upload',
  ];
  
  if (burstPaths.some(path => pathname.startsWith(path))) {
    return 'burst';
  }

  return 'default';
}

