# Security Audit Procedure

Comprehensive security audit workflow for Oikion's multi-tenant SaaS platform.

## When to Use

- Before major releases or deployments
- After implementing authentication or authorization changes
- When adding new API endpoints or external integrations
- During periodic security reviews
- After any data breach or security incident

## Audit Phases

### Phase 1: Secrets Scan

Check for hardcoded secrets in the codebase:

```bash
# Search for potential API keys, tokens, passwords
rg -i "(api.?key|secret|password|token|credential)" --type ts --type tsx -g "!node_modules" -g "!.env*" -g "!*.md"

# Check for oik_ prefixed keys in source (should only be in tests/mocks)
rg "oik_[a-zA-Z0-9]+" --type ts -g "!node_modules" -g "!.env*"

# Verify .env files are gitignored
git ls-files .env .env.local .env.production
```

Flag any secrets found in source code, test fixtures, or committed environment files.

### Phase 2: Tenant Isolation Audit

```bash
# Find all Prisma queries
rg "prismadb\." --type ts -g "actions/**" -g "app/api/**" -l

# For each file with Prisma queries, verify organizationId filtering
# Check for queries that access tenant models without org filter
```

For each file:
- Verify `organizationId` is in every `where` clause for tenant models
- Verify `organizationId` is in every `create` data object
- Check that org ID comes from `getCurrentOrgId()` or `auth()`, not from client input
- Verify `prismaForOrg()` usage is correct

### Phase 3: Authentication Audit

Check all API routes:
```bash
# List all API route files
find app/api -name "route.ts" | sort

# For each, verify auth check is present
# Internal: await auth() with userId/orgId check
# External: withExternalApi() wrapper
# Public: documented reason for no auth
```

Verify:
- [ ] Every internal route calls `await auth()` and checks `userId`
- [ ] Every external route uses `withExternalApi()` with required scopes
- [ ] Public routes (health, webhooks) are intentionally public
- [ ] Platform admin routes verify `isPlatformAdmin`
- [ ] Cron routes verify `CRON_SECRET`

### Phase 4: Input Validation Audit

```bash
# Find API routes that parse request bodies
rg "req\.json\(\)" --type ts -g "app/api/**" -l

# For each, verify Zod validation is applied
rg "safeParse|validateBody" --type ts -g "app/api/**" -l
```

Verify:
- [ ] All POST/PUT/PATCH routes validate request bodies with Zod
- [ ] Zod schemas use `.strict()` to prevent mass assignment
- [ ] File uploads validate type, size, and content
- [ ] URL parameters are validated (CUID format for IDs)
- [ ] Query strings are sanitized for search operations

### Phase 5: Rate Limiting Audit

Review `proxy.ts` middleware:
- [ ] All API routes have appropriate rate limiting tier
- [ ] Auth endpoints use `strict` tier (10 req/min)
- [ ] External API uses `api` tier (100 req/min)
- [ ] File uploads use `burst` tier (30 req/10s)
- [ ] New routes are covered by existing matchers

### Phase 6: Error Information Leakage

```bash
# Check for internal error exposure
rg "error\.(message|stack)" --type ts -g "app/api/**"

# Check for detailed error responses
rg "status: 500" --type ts -g "app/api/**" -B 2
```

Verify:
- [ ] No stack traces in API responses
- [ ] No SQL query details in error messages
- [ ] No file paths exposed to clients
- [ ] Internal errors logged server-side with `console.error`
- [ ] Generic error messages returned to clients

### Phase 7: Dependency Security

```bash
# Check for known vulnerabilities
pnpm audit

# Check for outdated packages with security patches
pnpm outdated
```

### Phase 8: XSS and Content Security

- [ ] CSP headers configured in `proxy.ts` for Clerk and Ably
- [ ] Rich text content (TipTap) is sanitized before rendering
- [ ] User-uploaded file names are not rendered directly
- [ ] User input in URLs is encoded

## Security Report

```
SECURITY AUDIT REPORT
=====================
Date: [DATE]
Scope: [FILES/FEATURES AUDITED]

Phase 1 - Secrets:      [PASS/FAIL] (X issues)
Phase 2 - Tenant:       [PASS/FAIL] (X queries checked)
Phase 3 - Auth:         [PASS/FAIL] (X routes checked)
Phase 4 - Validation:   [PASS/FAIL] (X endpoints checked)
Phase 5 - Rate Limit:   [PASS/FAIL]
Phase 6 - Error Leak:   [PASS/FAIL] (X issues)
Phase 7 - Dependencies: [PASS/FAIL] (X vulnerabilities)
Phase 8 - XSS/CSP:      [PASS/FAIL]

CRITICAL ISSUES:
- [List critical issues requiring immediate fix]

HIGH ISSUES:
- [List high-priority issues]

RECOMMENDATIONS:
- [List improvement suggestions]
```
