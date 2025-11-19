import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Initialize rate limiter with Vercel KV
// Falls back to in-memory rate limiting if Vercel KV is not configured
let ratelimit: Ratelimit | null = null;

// Check if Vercel KV is available (via KV_URL or KV_REST_API_URL)
if (process.env.KV_URL || process.env.KV_REST_API_URL) {
  try {
    // Create rate limiter with sliding window
    // Default: 10 requests per 10 seconds per identifier
    ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@vercel/kv/ratelimit',
    });
  } catch (error) {
    console.error('[RATE_LIMIT_INIT] Failed to initialize Vercel KV:', error);
  }
}

// In-memory rate limiter fallback (for development without Redis)
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs = 10 * 1000; // 10 seconds
  private readonly maxRequests = 10;

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const key = identifier;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Create new window
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    this.store.set(key, record);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: record.resetTime,
    };
  }
}

const inMemoryRateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit an identifier (IP address, user ID, etc.)
 * @param identifier - Unique identifier to rate limit (e.g., IP address or user ID)
 * @returns Rate limit result with success status and metadata
 */
export async function rateLimit(
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (ratelimit) {
    try {
      return await ratelimit.limit(identifier);
    } catch (error) {
      console.error('[RATE_LIMIT_ERROR] Vercel KV error, falling back to in-memory:', error);
      // Fall through to in-memory fallback
    }
  }

  // Fallback to in-memory rate limiting
  return await inMemoryRateLimiter.limit(identifier);
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

