# Rate Limiting Setup

Rate limiting has been implemented for all API routes to protect against abuse and ensure fair usage.

## Features

- ✅ Rate limiting applied to all `/api/*` routes
- ✅ User-based rate limiting for authenticated users (uses Clerk user ID)
- ✅ IP-based rate limiting for unauthenticated requests
- ✅ Sliding window algorithm (10 requests per 10 seconds by default)
- ✅ Standard rate limit headers (RFC 6585)
- ✅ Fallback to in-memory rate limiting if Vercel KV is not configured
- ✅ Graceful error handling (allows requests through if rate limiting fails)

## Configuration

### Option 1: Vercel KV (Recommended for Production)

For production deployments on Vercel, configure Vercel KV for distributed rate limiting:

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database**
3. Select **KV** (Key-Value)
4. Create the KV store
5. Vercel automatically adds the required environment variables:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

**Note:** Environment variables are automatically available in your Vercel deployments. For local development, you can copy them from Vercel Dashboard → Your Project → Settings → Environment Variables.

### Option 2: In-Memory (Development Default)

If Vercel KV is not configured, the system automatically falls back to in-memory rate limiting. This works fine for:
- Development environments
- Single-instance deployments
- Low-traffic applications

**Note:** In-memory rate limiting does not work across multiple server instances.

## Rate Limit Details

- **Default Limit:** 10 requests per 10 seconds per identifier
- **Window Type:** Sliding window
- **Identifier:** 
  - Authenticated users: `user:{clerkUserId}`
  - Unauthenticated: `ip:{ipAddress}`

## Rate Limit Headers

All API responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when the rate limit resets
- `Retry-After`: Seconds until retry (only on 429 responses)

## Response Format

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

Status code: `429 Too Many Requests`

## Customization

To customize rate limits, edit `lib/rate-limit.ts`:

```typescript
// Change the sliding window limit
ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
  prefix: '@vercel/kv/ratelimit',
});
```

## Excluding Routes

To exclude specific routes from rate limiting, edit `middleware.ts` and add them to the public routes matcher or add a condition:

```typescript
// Example: Skip rate limiting for webhooks
if (pathname.startsWith('/api/webhooks/')) {
  return NextResponse.next();
}
```

## Testing

To test rate limiting:

1. Make 10 requests to any API endpoint within 10 seconds
2. The 11th request should return a 429 status code
3. Wait 10 seconds and try again - requests should succeed

Example:

```bash
# Make 11 rapid requests
for i in {1..11}; do
  curl -v http://localhost:3000/api/some-endpoint
done
```

## Monitoring

Rate limiting is logged to the console if errors occur. For production monitoring:

- Check Vercel KV usage in your Vercel Dashboard → Storage → KV
- Monitor 429 responses in your application logs
- Set up alerts for high rate limit violation rates
- Use Vercel Analytics to track API endpoint performance

