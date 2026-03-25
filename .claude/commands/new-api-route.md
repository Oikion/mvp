Scaffold a new API route at path: $ARGUMENTS.

Parse $ARGUMENTS as the API path (e.g., `crm/clients`, `mls/properties/[id]`).

## Steps

1. Determine if this is an internal (`/api/`) or external (`/api/v1/`) route
2. Check existing routes at similar paths for patterns
3. Create the route file at `app/api/{path}/route.ts`

### Internal Route Template

```typescript
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess, apiCreated, apiUnauthorized, apiBadRequest,
  apiNotFound, apiInternalError, validateBody, withErrorHandler,
} from "@/lib/api-response";

export const GET = withErrorHandler(async (req: Request) => {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return apiUnauthorized();

  const data = await prismadb.entity.findMany({
    where: { organizationId },
  });

  return apiSuccess(data);
});

export const POST = withErrorHandler(async (req: Request) => {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return apiUnauthorized();

  const body = await req.json();
  // TODO: Add Zod schema validation
  // const validation = validateBody(body, schema);
  // if (!validation.success) return validation.error;

  // TODO: Implement creation with organizationId
  return apiBadRequest("Not implemented");
});
```

### External Route Template

```typescript
import { withExternalApi, API_SCOPES } from "@/lib/external-api-middleware";
import { NextResponse } from "next/server";

export const GET = withExternalApi(
  async (req, context) => {
    const data = await prismadb.entity.findMany({
      where: { organizationId: context.organizationId },
    });
    return NextResponse.json({
      data,
      meta: { cursor: null, hasMore: false },
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: [API_SCOPES.SCOPE_READ] }
);
```

4. If dynamic route (e.g., `[id]`), add GET/PUT/DELETE handlers with ID validation
5. Point out TODOs that need to be filled in
6. Remind about rate limiting tier and auth requirements
