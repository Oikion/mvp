# Prisma Migration Workflow

Safe database schema migration workflow for Oikion's **Prisma 6 + PostgreSQL** (Prisma Postgres hosting, pooled connections) setup. See `.cursor/agents/db-agent.md` for stack and connection details.

## When to Use

- Adding new models or fields to the database
- Modifying existing schema (rename, change types, add relations)
- Adding indexes or constraints
- Changing enum values

## Pre-Migration Checklist

Before making changes:
1. Ensure no other migrations are in progress
2. Back up critical data if modifying existing production tables
3. Review the current schema: `prisma/schema.prisma`

## Migration Steps

### Step 1: Plan the Change

Document what's changing and why:
- New model? Ensure it has `organizationId`, `createdAt`, `updatedAt`, `@@index([organizationId])`
- New field? Consider default values for existing rows
- Removing field? Mark deprecated first, plan data migration
- Changing type? Check for data loss risks

### Step 2: Edit Schema

Edit `prisma/schema.prisma` following the conventions in the `prisma-schema.mdc` rule.

For new tenant-scoped models:
```prisma
model NewEntity {
  id             String   @id @default(cuid())
  organizationId String
  // ... fields ...
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("new_entities")
}
```

### Step 3: Generate Client

Recommend the user run:
```bash
pnpm prisma generate
```
(Do not run it yourself.) This regenerates the Prisma client TypeScript types. The user should check for compilation errors in files that use the modified models.

### Step 4: Push to Database

Recommend the user run:
```bash
pnpm prisma db push
```
(Do not run it yourself.) This applies the schema changes directly to the database. For Oikion's development workflow, `db push` is preferred over `prisma migrate` for faster iteration.

### Step 5: Update Dependent Code

After schema changes, update:

1. **Zod validation schemas** in `lib/validations/`
   - Add/remove/modify fields to match the new schema
   - Update `.strict()` schemas to include new fields

2. **Server actions** in `actions/{feature}/`
   - Update create/update operations for new fields
   - Add new actions if new model was created
   - Ensure `organizationId` is included

3. **API routes** in `app/api/`
   - Update response shapes
   - Update request validation

4. **SWR hooks** in `hooks/swr/`
   - Update TypeScript interfaces for new response shapes
   - Add new hooks for new models

5. **UI components**
   - Update forms for new fields
   - Update display components for new data

6. **Tenant isolation** (`lib/tenant.ts`)
   - If new model is tenant-scoped, add to `TENANT_MODELS` map

### Step 6: Verify

Recommend the user run the verification loop (do not run these yourself):
```bash
pnpm build       # Catches type errors from schema changes
pnpm lint        # Catches code quality issues
```

Recommend the user open Prisma Studio to visually verify the schema:
```bash
pnpm prisma studio
```

## Dangerous Operations (Production Safety)

### Renaming a Field
1. Add new field with `@default()`
2. Write a migration script to copy data
3. Update all code to use new field
4. Remove old field in a separate deployment

### Removing a Field
1. Remove all code references first
2. Deploy code changes
3. Remove field from schema
4. Push schema change

### Changing Field Type
1. Add new field with new type
2. Write migration script to convert data
3. Update code to use new field
4. Remove old field

### Adding Required Fields to Existing Tables
Always provide a `@default()` value, or make the field optional first:
```prisma
// Safe: has default
newField String @default("")

// Safe: optional
newField String?

// DANGEROUS: will fail if table has existing rows
newField String
```

## Rollback Plan

If something goes wrong, recommend the user:
1. Revert the schema change in `prisma/schema.prisma`
2. Run `pnpm prisma generate`
3. Run `pnpm prisma db push`
4. Verify the application works with the reverted schema
