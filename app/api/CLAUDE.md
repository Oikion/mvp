# API Route Conventions

Applies to all files under `app/api/`. Two distinct API types with different auth mechanisms.

## Internal API (`/api/*`) — Clerk Session Auth

```typescript
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiInternalError, validateBody } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    // 1. Auth is always first — auth() is async in Clerk v6
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    // 2. Always filter by organizationId for tenant isolation
    const data = await prismadb.resource.findMany({ where: { organizationId } });

    return apiSuccess(data);
  } catch (error) {
    console.error("[API_RESOURCE]", error);
    return apiInternalError("Internal error", error);
  }
}
```

## External API (`/api/v1/*`) — API Key Auth

Keys are prefixed `oik_`, sent as `Authorization: Bearer oik_xxx`.

```typescript
import { withExternalApi, API_SCOPES } from "@/lib/external-api-middleware";
import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withExternalApi(
  async (req, context) => {
    // context: { apiKeyId, organizationId, scopes, createdById }
    const data = await prismadb.resource.findMany({
      where: { organizationId: context.organizationId },
    });

    return NextResponse.json({
      data,
      meta: { cursor: null, hasMore: false },
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: [API_SCOPES.MLS_READ] }
);
```

Response format: `{ "data": {}, "meta": { "cursor": "...", "hasMore": true }, "timestamp": "ISO-8601" }`

### Available Scopes

`calendar:read` · `calendar:write` · `crm:read` · `crm:write` · `mls:read` · `mls:write` · `tasks:read` · `tasks:write`

## Response Helpers (`@/lib/api-response`)

| Helper | Status | Use Case |
|---|---|---|
| `apiSuccess(data)` | 200 | Successful GET / PUT |
| `apiCreated(data)` | 201 | Successful POST (new resource) |
| `apiNoContent()` | 204 | Successful DELETE |
| `apiBadRequest(msg?, details?)` | 400 | Invalid input |
| `apiUnauthorized(msg?)` | 401 | Not authenticated |
| `apiForbidden(msg?)` | 403 | Authenticated but lacks permission |
| `apiNotFound(resource?)` | 404 | Resource not found |
| `apiConflict(msg?)` | 409 | Duplicate / constraint violation |
| `apiRateLimited(msg?)` | 429 | Rate limit exceeded |
| `apiInternalError(msg?, error?)` | 500 | Unexpected server error |
| `handlePrismaError(error, ctx?)` | varies | Prisma-specific error mapping |
| `validateBody(body, zodSchema)` | — | Validate + type request body |
| `withErrorHandler(handler)` | — | Wrap route with try/catch |

## Input Validation

- Validate every request body with Zod: `const validation = validateBody(body, schema);`
- If invalid: `if (!validation.success) return validation.error;`
- Use `.strict()` on schemas to reject unexpected fields (prevents mass assignment)
- Validate path params and query strings before use
- Validate enum values against allowed options; IDs as cuid/uuid format

## Security Checklist

- [ ] Auth check is the **first** statement in every handler
- [ ] `organizationId` filtering on every tenant-scoped query
- [ ] Input validated with Zod before use (`.strict()` to block unexpected fields)
- [ ] Error responses never expose stack traces, SQL, or internal details
- [ ] Sensitive operations logged: `console.error("[API_ROUTE_NAME]", error)`
- [ ] Role check for write operations: `ORG_OWNER > ADMIN > AGENT > VIEWER` via `/lib/permissions/`
- [ ] External API: verify scopes match endpoint via `requiredScopes` in `withExternalApi()`
- [ ] CORS handled automatically by `withExternalApi()` for `/api/v1/*` routes

## Rate Limiting Tiers (configured in `proxy.ts`)

| Tier | Limit | Applies To |
|---|---|---|
| `strict` | 10 req/min | Auth endpoints, password reset |
| `default` | 60 req/min | General internal API routes |
| `lenient` | 120 req/min | Read-heavy endpoints |
| `burst` | 30 req/10s | File uploads |
| `api` | 100 req/min | External API (`/api/v1/*`) |

Rate limiting is middleware-enforced in `proxy.ts` — no per-route code required for standard tiers.

## Platform Admin Routes (`/api/platform-admin/*`)

Require an additional admin check after Clerk auth:

```typescript
const { userId } = await auth();
if (!userId) return apiUnauthorized();

// Check privateMetadata or env allowlist
const user = await clerkClient.users.getUser(userId);
const isAdmin =
  user.privateMetadata?.isPlatformAdmin === true ||
  (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").includes(user.emailAddresses[0]?.emailAddress ?? "");

if (!isAdmin) return apiForbidden();
```

See existing routes under `app/api/platform-admin/` for the canonical pattern.
