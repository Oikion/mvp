# Feature Scaffold Workflow

End-to-end workflow for building a new feature in Oikion — from database model to UI.

## When to Use

- Building a completely new feature (new entity, new CRUD operations)
- Adding a major new capability to an existing module
- Creating a new section of the application

## Step-by-Step Workflow

### Step 1: Database Model

Create or modify the Prisma model in `prisma/schema.prisma`:

```prisma
model FeatureEntity {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  status         FeatureEntityStatus @default(DRAFT)
  createdBy      String
  assignedTo     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([organizationId, status])
  @@map("feature_entities")
}

enum FeatureEntityStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
```

Then run:
```bash
pnpm prisma generate
pnpm prisma db push
```

### Step 2: Validation Schema

Create Zod schemas in `lib/validations/{feature}.ts`:

```typescript
import { z } from "zod";

export const createFeatureEntitySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  assignedTo: z.string().optional(),
}).strict();

export const updateFeatureEntitySchema = createFeatureEntitySchema.partial();

export type CreateFeatureEntityInput = z.infer<typeof createFeatureEntitySchema>;
export type UpdateFeatureEntityInput = z.infer<typeof updateFeatureEntitySchema>;
```

### Step 3: Server Actions

Create actions in `actions/{feature}/`:

**`actions/{feature}/create-entity.ts`**
```typescript
"use server";
import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { createFeatureEntitySchema } from "@/lib/validations/{feature}";

export async function createFeatureEntity(input: unknown) {
  const guard = await requireAction("feature:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();

  const validation = createFeatureEntitySchema.safeParse(input);
  if (!validation.success) {
    return actionError("Validation failed", "VALIDATION_ERROR");
  }

  try {
    const entity = await prismadb.featureEntity.create({
      data: { ...validation.data, organizationId, createdBy: user.id },
    });
    return actionSuccess(entity);
  } catch (error) {
    console.error("[CREATE_FEATURE_ENTITY]", error);
    return actionError("Failed to create entity", error);
  }
}
```

Create similar files for: `get-entities.ts`, `get-entity.ts`, `update-entity.ts`, `delete-entity.ts`

### Step 4: API Route (for SWR fetching)

Create `app/api/{feature}/route.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiInternalError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const entities = await prismadb.featureEntity.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(entities);
  } catch (error) {
    return apiInternalError("Failed to fetch entities", error);
  }
}
```

### Step 5: SWR Hook

Create `hooks/swr/useFeatureEntities.ts` following the pattern in `swr-hooks.mdc`.
Export from `hooks/swr/index.ts`.

### Step 6: Permissions

1. Add action permission in `lib/permissions/action-permissions.ts`:
   ```typescript
   "feature:create" | "feature:read" | "feature:update" | "feature:delete"
   ```

2. Add defaults in `lib/permissions/defaults.ts`:
   - OWNER: all CRUD
   - LEAD: all CRUD
   - MEMBER: create, read own, update own
   - VIEWER: read only

### Step 7: UI Components

Create components following the design system:
- List view: `components/{feature}/{feature}-list.tsx`
- Create/Edit form: `components/{feature}/{feature}-form.tsx`
- Detail view: `components/{feature}/{feature}-detail.tsx`
- Page: `app/[locale]/app/(routes)/{feature}/page.tsx`

Use shadcn/ui components, `react-hook-form` + Zod, loading/error/empty states.

### Step 8: Translations

Add keys to both locale files:
- `locales/el/{feature}.json`
- `locales/en/{feature}.json`

### Step 9: Verification

Run the verification loop skill to ensure everything passes.
