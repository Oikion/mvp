# Rate Limiting & Redis Caching Setup

Rate limiting and Redis-backed caching protect against abuse and improve performance across all API routes.

## Features

- Rate limiting on all `/api/*` routes with tiered limits
- User-based limiting for authenticated users (Clerk user ID)
- IP-based limiting for unauthenticated requests
- Sliding window algorithm with 5 tiers (default, strict, lenient, burst, api)
- Standard rate limit headers (RFC 6585)
- Redis-backed caching for: API key validation, permissions, notifications, encryption keys
- Brute force protection for OTP and login attempts
- Fallback to in-memory rate limiting if Redis is not configured
- Graceful error handling (allows requests through if Redis fails)

## Configuration

### Upstash Redis (Required for Production)

1. Go to [console.upstash.com](https://console.upstash.com) and sign up
2. Create a new **Redis Database**:
   - Name: `oikion-production`
   - Region: **EU-West-1 (Frankfurt)** — closest to Greece
   - Type: **Regional**
   - Eviction: **No eviction**
3. Click on the database → **REST API** tab
4. Copy the two values and add them to your environment:

```env
UPSTASH_REDIS_REST_URL="https://eu1-xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxxYyy..."
```

**For Vercel:** Add these in Dashboard → Settings → Environment Variables.
**For local dev:** Add to `.env.local`.

### In-Memory Fallback (Development Default)

If Upstash Redis is not configured, the system automatically falls back to in-memory rate limiting and caching. This works for:
- Development environments
- Single-instance deployments

**Note:** In-memory state does not persist across serverless invocations or server restarts.

## Rate Limit Tiers

| Tier | Limit | Paths |
|------|-------|-------|
| **default** | 60 req/min | General API usage |
| **strict** | 10 req/min | Auth, password reset, org invites, webhooks |
| **lenient** | 120 req/min | Properties, clients, documents, search (reads) |
| **burst** | 30 req/10s | File uploads, messaging, typing indicators |
| **api** | 100 req/min | External API (`/api/v1/*`) per API key |

## Rate Limit Headers

All API responses include:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when limit resets
- `Retry-After`: Seconds until retry (only on 429 responses)

## Response on Limit Exceeded

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

Status code: `429 Too Many Requests`

## Redis Cache Keys

All cache keys follow the pattern `oik:{domain}:{identifier}`:

| Key | TTL | Purpose |
|-----|-----|---------|
| `oik:apikey:{hash}` | 5 min | Validated API key data |
| `oik:perm:{orgId}:{userId}` | 2 min | Permission context |
| `oik:perm:ver:{orgId}` | 1 hour | Permission version counter |
| `oik:admin:{userId}` | 60s | Platform admin status |
| `oik:notif:{orgId}:{userId}` | 15s | Notification unread counts |
| `oik:dek:{orgId}` | 10 min | Encrypted DEK |
| `oik:brute:otp:{id}` | 15 min | OTP attempt counter |
| `oik:brute:login:{ip}` | 15 min | Login attempt counter |

## Excluded Routes

These routes skip rate limiting:
- `/api/webhooks/*`
- `/api/health/*`
- `/api/cron/*`

## Customization

Edit `lib/rate-limit.ts` to adjust tiers:

```typescript
const RATE_LIMIT_CONFIGS = {
  default: { requests: 60, window: '1 m', windowMs: 60 * 1000 },
  strict: { requests: 10, window: '1 m', windowMs: 60 * 1000 },
  // ...
};
```

Edit `lib/redis.ts` for cache helpers used across the application.

## Monitoring

- Check Upstash console → **Analytics** tab for command usage
- Check Upstash console → **Data Browser** tab to inspect cache keys
- Monitor 429 responses in application logs
- Free tier: 10,000 commands/day; Pro ($10/mo): 500,000 commands/day
