Scaffold a new API route at path: $ARGUMENTS.

Parse $ARGUMENTS as the API path (e.g., `crm/clients`, `mls/properties/[id]`).

1. Determine if this is an internal (`/api/`) or external (`/api/v1/`) route
2. Check existing routes at similar paths for patterns
3. Create the route file at `app/api/{path}/route.ts` with:

**For internal routes:**

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

  // TODO: Implement query with organizationId
  const data = await prismadb.entity.findMany({
    where: { organizationId },
  });

  return apiSuccess(data);
});

export const POST = withErrorHandler(async (req: Request) => {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return apiUnauthorized();

  const body = await req.json();
  // TODO: Add Zod schema
  // const validation = validateBody(body, schema);
  // if (!validation.success) return validation.error;

  // TODO: Implement creation
  // const item = await prismadb.entity.create({
  //   data: { ...validation.data, organizationId },
  // });
  // return apiCreated(item);

  return apiBadRequest("Not implemented");
});
```

4. If dynamic route (e.g., `[id]`), add GET/PUT/DELETE handlers with ID validation
5. Point out TODOs that need to be filled in
6. Remind about rate limiting tier and auth requirements
