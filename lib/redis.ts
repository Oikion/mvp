import { Redis } from "@upstash/redis";

/**
 * Centralized Redis Client
 *
 * Provides a singleton Upstash Redis instance and typed cache helpers.
 * Used for: rate limiting, API key caching, permission caching,
 * notification counts, encryption key caching, and brute force protection.
 *
 * Falls back to an in-memory Map when Redis env vars are missing (development).
 * All cache methods are wrapped in try/catch — Redis is always optional.
 */

// ─── Redis Availability ──────────────────────────────────────────────────────

export const isRedisAvailable = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// ─── Singleton Instance ──────────────────────────────────────────────────────

let redisInstance: Redis | null = null;

function getRedisInstance(): Redis | null {
  if (!isRedisAvailable) return null;
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

/**
 * The Redis instance, exported for @upstash/ratelimit compatibility.
 * Returns the real Redis client or a dummy that will cause ratelimit
 * to fail gracefully (handled by rate-limit.ts fallback).
 */
export const redis: Redis = isRedisAvailable
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : ({} as Redis);

// ─── In-Memory Fallback (Development) ────────────────────────────────────────

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Clean up expired entries periodically in development
if (typeof setInterval !== "undefined" && !isRedisAvailable) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(memoryStore.entries())) {
      if (now > entry.expiresAt) memoryStore.delete(key);
    }
  }, 30_000);
}

// ─── Cache Helpers ───────────────────────────────────────────────────────────

/**
 * Get a cached value by key. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisInstance();
    if (client) {
      const value = await client.get<T>(key);
      return value ?? null;
    }

    // In-memory fallback
    const entry = memoryStore.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) memoryStore.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  } catch (error) {
    console.error("[REDIS_CACHE_GET]", key, error);
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const client = getRedisInstance();
    if (client) {
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }

    // In-memory fallback
    memoryStore.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch (error) {
    console.error("[REDIS_CACHE_SET]", key, error);
  }
}

/**
 * Delete one or more cache keys.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const client = getRedisInstance();
    if (client) {
      await client.del(...keys);
      return;
    }

    // In-memory fallback
    for (const key of keys) memoryStore.delete(key);
  } catch (error) {
    console.error("[REDIS_CACHE_DEL]", keys, error);
  }
}

/**
 * Increment a counter and set TTL if the key is new.
 * Returns the new count. Used for brute force protection.
 */
export async function cacheIncr(
  key: string,
  ttlSeconds: number
): Promise<number> {
  try {
    const client = getRedisInstance();
    if (client) {
      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      return (results[0] as number) ?? 1;
    }

    // In-memory fallback
    const entry = memoryStore.get(key);
    const now = Date.now();
    if (!entry || now > entry.expiresAt) {
      memoryStore.set(key, {
        value: "1",
        expiresAt: now + ttlSeconds * 1000,
      });
      return 1;
    }
    const newCount = parseInt(entry.value, 10) + 1;
    entry.value = String(newCount);
    return newCount;
  } catch (error) {
    console.error("[REDIS_CACHE_INCR]", key, error);
    // Re-throw so security-critical callers (e.g. brute-force counters) fail closed.
    // Non-critical callers should wrap cacheIncr in their own try/catch if they prefer fail-open.
    throw error;
  }
}
