# Feature Scaffold Workflow

9-step end-to-end workflow for building a new feature — database model to UI.

## When to Use

- New entity with full CRUD (new DB model + actions + UI)
- Major new capability added to an existing module
- New app section/route

For smaller changes (single action, single API route), use `/new-action` or `/new-api-route` instead.

---

## Step 1 — Database Model

Add or modify model in `prisma/schema.prisma`:

```prisma
model FeatureEntity {
  id             String              @id @default(cuid())
  organizationId String
  name           String
  status         FeatureEntityStatus @default(DRAFT)
  createdBy      String
  assignedTo     String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

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

Then: `pnpm db:migrate` (dev) or `pnpm db:deploy` (production). Never use `prisma db push` in production.

---

## Step 2 — Validation Schema

Create `lib/validations/{feature}.ts`:

```typescript
import { z } from 'zod'

export const createFeatureEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  assignedTo: z.string().optional(),
}).strict()

export const updateFeatureEntitySchema = createFeatureEntitySchema.partial()

export type CreateFeatureEntityInput = z.infer<typeof createFeatureEntitySchema>
```

---

## Step 3 — Server Actions

Create `actions/{feature}/create-entity.ts`:

```typescript
'use server'
import { requireAction } from '@/lib/permissions/action-guards'
import { getCurrentOrgId, getCurrentUser } from '@/lib/get-current-user'
import { actionSuccess, actionError } from '@/lib/action-response'
import { prismadb } from '@/lib/prisma'
import { createFeatureEntitySchema } from '@/lib/validations/{feature}'

export async function createFeatureEntity(input: unknown) {
  const guard = await requireAction('feature:create')
  if (guard) return guard

  const organizationId = await getCurrentOrgId()
  const user = await getCurrentUser()

  const validation = createFeatureEntitySchema.safeParse(input)
  if (!validation.success) return actionError('Validation failed', 'VALIDATION_ERROR')

  try {
    const entity = await prismadb.featureEntity.create({
      data: { ...validation.data, organizationId, createdBy: user.id },
    })
    return actionSuccess(entity)
  } catch (error) {
    console.error('[CREATE_FEATURE_ENTITY]', error)
    return actionError('Failed to create entity', error)
  }
}
```

Also create: `get-entities.ts`, `get-entity.ts`, `update-entity.ts`, `delete-entity.ts`.

---

## Step 4 — API Route (for SWR)

Create `app/api/{feature}/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { prismadb } from '@/lib/prisma'
import { apiSuccess, apiUnauthorized, apiInternalError } from '@/lib/api-response'

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth()
    if (!userId || !organizationId) return apiUnauthorized()

    const entities = await prismadb.featureEntity.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(entities)
  } catch (error) {
    return apiInternalError('Failed to fetch entities', error)
  }
}
```

---

## Step 5 — SWR Hook

Create `hooks/swr/useFeatureEntities.ts` following the existing hook pattern.
Export from `hooks/swr/index.ts`.

Key pattern:

```typescript
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function useFeatureEntities() {
  return useSWR<FeatureEntity[]>('/api/{feature}', fetcher)
}
```

---

## Step 6 — Permissions

Add action keys to `lib/permissions/action-permissions.ts`:

```typescript
'feature:create' | 'feature:read' | 'feature:update' | 'feature:delete'
```

Add defaults to `lib/permissions/defaults.ts`:

| Role | Permissions |
|------|------------|
| ORG_OWNER / ADMIN | All CRUD |
| AGENT | create, read own, update own |
| VIEWER | read only |

---

## Step 7 — UI Components

Follow the design system and shadcn/ui patterns:

| Component | Path | Notes |
|-----------|------|-------|
| List page | `app/[locale]/app/(routes)/{feature}/page.tsx` | Server component, fetch data |
| List view | `components/{feature}/{feature}-list.tsx` | DataTable with columns |
| Create/Edit form | `components/{feature}/{feature}-form.tsx` | react-hook-form + Zod |
| Detail view | `components/{feature}/{feature}-detail.tsx` | Read-only display |

Use `useTransition` + server actions for mutations. See [Forms and Validation Guide](./forms-and-validation.md).

---

## Step 8 — Translations

Add keys to both locale files:

```json
// locales/en/{feature}.json
{
  "title": "Feature Entities",
  "create": "Create Entity",
  "createSuccess": "Entity created",
  "createFailed": "Failed to create entity",
  "deleteConfirm": "Are you sure you want to delete this entity?"
}
```

Mirror all keys in `locales/el/{feature}.json`.

---

## Step 9 — Verification

Run the verification loop before marking work complete:

```
/verify
```

This checks: build, lint, tenant isolation (every query filtered by `organizationId`), i18n completeness, permissions, and diff review.
