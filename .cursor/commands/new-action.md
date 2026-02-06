Scaffold a new server action for feature: $ARGUMENTS.

Parse the argument as `feature/action-name` (e.g., `crm/create-client`, `mls/update-property`).

1. Determine the feature directory and action name from $ARGUMENTS
2. Check existing actions in `actions/{feature}/` to understand patterns
3. Create the server action file at `actions/{feature}/{action-name}.ts` with:

```typescript
"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

// TODO: Create validation schema in lib/validations/{feature}.ts
// import { schema } from "@/lib/validations/{feature}";

export async function actionName(input: unknown): Promise<ActionResponse<ResultType>> {
  // Permission guard
  const guard = await requireAction("{feature}:{verb}");
  if (guard) return guard;

  // Tenant context
  const organizationId = await getCurrentOrgId();

  // TODO: Validate input
  // const validation = schema.safeParse(input);
  // if (!validation.success) return actionError("Validation failed", "VALIDATION_ERROR");

  try {
    // TODO: Implement database operation with organizationId
    // const result = await prismadb.entity.create({
    //   data: { ...validation.data, organizationId },
    // });
    // return actionSuccess(result);
    return actionSuccess();
  } catch (error) {
    console.error("[ACTION_NAME]", error);
    return actionError("Failed to perform action", error);
  }
}
```

4. Point out TODOs that need to be filled in
5. Suggest the Zod validation schema to create
6. Suggest the permission to add to `lib/permissions/action-permissions.ts`
