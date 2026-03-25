# Logging

## Current approach

The application uses `console.log`, `console.error`, and `console.warn`. All logging is intentional. Vercel captures console output in deployment logs automatically.

## Log levels

| Level | When to use |
|-------|------------|
| `console.error()` | API route errors, DB failures, external service failures, webhook errors, file upload errors |
| `console.warn()` | Deprecated feature usage, configuration issues, performance concerns, rate limit warnings |
| `console.log()` | Admin actions, successful webhook processing, background job completion, state transitions |

## Format convention

Use uppercase context tags in square brackets:

```typescript
// Error with context
console.error("[PROPERTIES_GET]", error);

// Info with structured data
console.log("[ADMIN_ACCESS_LOG]", {
  userId,
  action,
  timestamp: new Date().toISOString()
});

// Warning
console.warn("[MODULE] Deprecated feature used:", featureName);
```

### Context tag prefixes

| Tag | Module |
|-----|--------|
| `[FEEDBACK_*]` | Feedback system |
| `[WEBHOOK]` | Clerk webhook handler |
| `[ADMIN_*]` | Admin operations |
| `[PROPERTIES_*]` | Property operations |
| `[DEALS_*]` | Deal operations |
| `[API]` | Generic API |
| `[LOCALE_ERROR]` | i18n errors |

## What to log / not log

**Do log:**
- Errors in API routes and server actions
- Failed external service calls
- Security events (admin access, auth failures)
- Background job failures
- Data integrity issues

**Never log:**
- Passwords, tokens, API keys, webhook secrets
- Personally identifiable information (PII)
- Full request/response bodies in production
- Session tokens or DEKs

**Safe to log:** User IDs (UUIDs), org IDs, resource IDs, timestamps, operation types, sanitized error messages, HTTP status codes.

## Sensitive data sanitization

```typescript
// Bad
console.error("Database error:", error);  // may include query params with PII

// Good
console.error("Database error:", {
  message: error.message,
  code: error.code,
});
```

## Development-only logging

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}
```

Remove temporary debug logs before committing. Context-free logs (`console.log(data)`) will fail PR review.

## Fire-and-forget operations

```typescript
dispatchPropertyWebhook(organizationId, "property.created", property)
  .catch(console.error);
```

## Future improvements (post-v1.0)

1. Structured logging library (`pino` or `winston`) with log levels and request ID tracing
2. Log aggregation service (Datadog, Sentry, LogRocket)
3. Environment-based verbosity (verbose dev, structured prod)
4. 30-day general retention, 1-year error retention, permanent security events

## Vercel log retention

- Pro plan: 7 days
- Enterprise: custom retention
