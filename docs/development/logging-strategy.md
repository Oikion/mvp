# Logging Strategy

## Overview

This document outlines the logging strategy for Oikion, including guidelines for when and how to use logging statements.

## Current Logging Approach (v1.0.0-pre-release)

The application uses `console.log`, `console.error`, and `console.warn` for logging. All logging statements are intentional and serve specific purposes.

## Logging Locations

### API Routes

All console statements in API routes are intentional for debugging and monitoring:

#### Error Logging
- **Purpose**: Track errors for debugging and monitoring
- **Format**: `console.error("[CONTEXT]", error)`
- **Examples**:
  - `console.error("[FEEDBACK_SCREENSHOT_UPLOAD]", uploadError)`
  - `console.error("[PROPERTIES_GET]", error)`
  - `console.error("[DEALS_POST]", error)`

#### Informational Logging
- **Purpose**: Track important events and state changes
- **Format**: `console.log("[CONTEXT]", data)`
- **Examples**:
  - `console.log("[ADMIN_ACCESS_LOG]", { userId, action })`
  - `console.log("User left personal workspace")`

### Webhook Handlers

Webhook errors are logged for debugging integration issues:

```typescript
// app/api/webhooks/clerk/route.ts
console.error("Error verifying webhook:", err);
console.error("[WEBHOOK] Failed to sync user to messaging:", err);
```

### Client-Side Components

Client-side errors are logged for debugging:

```typescript
// Market intelligence page
console.error("Failed to load market intel data:", error);

// Admin page
console.error("Error fetching organization info:", error);

// Matching components
console.error("Failed to fetch matches:", err);
```

### Background Operations

Asynchronous operations that shouldn't block the main flow:

```typescript
// Fire-and-forget webhook dispatch
dispatchPropertyWebhook(organizationId, "property.created", property)
  .catch(console.error);
```

## Logging Guidelines

### When to Log

✅ **DO log:**
- Errors that occur in API routes
- Failed external service calls
- Webhook processing errors
- Background job failures
- Security-related events (admin access, auth failures)
- Data integrity issues

❌ **DON'T log:**
- Sensitive data (passwords, tokens, API keys)
- Personally identifiable information (PII) without consent
- Full request/response bodies in production
- Excessive debug information in production

### Log Levels

#### `console.error()` - Errors
Use for actual errors that need attention:
- API route errors
- Database query failures
- External service failures
- Webhook processing errors
- File upload/download errors

#### `console.warn()` - Warnings
Use for concerning but non-critical situations:
- Deprecated feature usage
- Configuration issues
- Performance concerns
- Rate limit warnings

#### `console.log()` - Information
Use for important events:
- Admin actions (with context)
- Successful webhook processing
- Background job completion
- State transitions

### Log Format

Use a consistent format with context tags:

```typescript
// Error with context
console.error("[MODULE_OPERATION]", error);

// Info with structured data
console.log("[MODULE_ACTION]", {
  userId,
  action,
  timestamp: new Date().toISOString()
});

// Warning with message
console.warn("[MODULE] Deprecated feature used:", featureName);
```

### Context Tags

Use uppercase tags in square brackets to identify the source:

- `[FEEDBACK_*]` - Feedback system
- `[WEBHOOK]` - Webhook handlers
- `[ADMIN_*]` - Admin operations
- `[PROPERTIES_*]` - Property operations
- `[DEALS_*]` - Deal operations
- `[API]` - Generic API operations
- `[LOCALE_ERROR]` - Localization errors

## Production Considerations

### Current State (v1.0.0-pre-release)

All console statements are preserved for production debugging. Vercel automatically captures and displays console output in the deployment logs.

### Future Improvements (Post-v1.0.0-pre-release)

Consider implementing a structured logging solution:

1. **Structured Logging Library**
   - Use a library like `pino` or `winston`
   - Add log levels and filtering
   - Include request IDs for tracing

2. **Log Aggregation**
   - Send logs to a service (Datadog, LogRocket, Sentry)
   - Enable log searching and filtering
   - Set up alerts for critical errors

3. **Environment-Based Logging**
   - More verbose logging in development
   - Structured, minimal logging in production
   - Separate error tracking in production

## Sensitive Data Protection

### Never Log:

- Passwords or password hashes
- API keys or tokens
- Credit card information
- Social security numbers
- Private user data without consent
- Session tokens
- Webhook secrets

### Safe to Log:

- User IDs (UUIDs)
- Organization IDs
- Resource IDs
- Timestamps
- Operation types
- Error messages (sanitized)
- HTTP status codes

### Sanitization Example:

```typescript
// ❌ Bad: Logs sensitive data
console.log("User login:", { email, password });

// ✅ Good: Logs only necessary info
console.log("User login:", { userId, timestamp });

// ❌ Bad: Logs full error with potential sensitive data
console.error("Database error:", error);

// ✅ Good: Logs sanitized error
console.error("Database error:", {
  message: error.message,
  code: error.code,
  // Don't log error.query which might contain sensitive data
});
```

## Error Tracking

### Current Approach

Errors are logged to console and visible in Vercel deployment logs.

### Recommended Additions (Post-v1.0.0)

1. **Sentry Integration**
   - Automatic error tracking
   - Stack traces and context
   - User feedback collection
   - Performance monitoring

2. **Custom Error Boundaries**
   - Catch React errors
   - Display user-friendly messages
   - Log errors for debugging

3. **API Error Monitoring**
   - Track error rates
   - Monitor response times
   - Alert on anomalies

## Debugging in Development

### Development-Only Logging

For temporary debugging, use a development check:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}
```

### Remove Before Committing

Remove temporary debug logs before committing:

```typescript
// ❌ Remove these before committing
console.log('temp debug', variable);
console.log('testing', data);
console.log(data); // No context tag
```

## Monitoring and Alerts

### Current Monitoring (v1.0.0)

- Vercel deployment logs
- Manual log review
- Error tracking via console output

### Recommended Monitoring (Post-v1.0.0)

1. **Error Rate Monitoring**
   - Track error frequency
   - Alert on spikes
   - Categorize by severity

2. **Performance Monitoring**
   - API response times
   - Database query performance
   - Client-side performance

3. **Business Metrics**
   - User activity
   - Feature usage
   - Conversion tracking

## Log Retention

### Vercel Logs

- **Pro Plan**: 7 days of logs
- **Enterprise**: Custom retention
- **Recommendation**: Export important logs to long-term storage

### Future Log Storage

Consider implementing:
- 30-day retention for all logs
- 1-year retention for error logs
- Permanent retention for security events

## Compliance

### GDPR Considerations

- Don't log personal data without legal basis
- Implement log anonymization where needed
- Provide log access/deletion for users
- Document log retention policies

### Audit Logging

For compliance, maintain audit logs for:
- Admin actions (already implemented)
- Data access
- Permission changes
- Security events

## Code Review Checklist

When reviewing code with logging:

- [ ] No sensitive data in logs
- [ ] Appropriate log level used
- [ ] Context tag included
- [ ] Error objects properly logged
- [ ] No excessive logging
- [ ] Development-only logs removed
- [ ] Logs provide actionable information

## Migration Path

### v1.0.0 → v1.1.0
- Audit all console statements
- Add structured logging library
- Implement log levels

### v1.1.0 → v1.2.0
- Add error tracking service (Sentry)
- Implement log aggregation
- Set up monitoring dashboards

### v1.2.0+
- Advanced analytics
- Predictive error detection
- Automated alerting

---

**Last Updated**: 2026-02-03 (v1.0.0-pre-release)

**Status**: All current console statements are intentional and serve production debugging purposes.
