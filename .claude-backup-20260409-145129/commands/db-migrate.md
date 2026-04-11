Run the Prisma migration workflow for database schema changes.

## Pre-Migration Checklist

- [ ] No other migrations are in progress
- [ ] Current schema is valid: review `prisma/schema.prisma`
- [ ] Back up critical data if modifying existing production tables

## Steps

### 1. Plan the Change

Document what's changing and why:
- **New model?** Ensure it has `organizationId`, `createdAt`, `updatedAt`, `@@index([organizationId])`, `@@map("table_names")`
- **New field?** Consider `@default()` values for existing rows. Required fields on existing tables MUST have a default or be optional
- **Removing field?** Check all code references first. Mark deprecated, plan data migration
- **Changing type?** Check for data loss risks. Add new field → migrate data → remove old field
- **New enum value?** Add at the end to avoid migration issues

### 2. Edit Schema

Edit `prisma/schema.prisma` following conventions in `prisma/CLAUDE.md`.

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

### 3. Generate & Push

Recommend the user run (do not run these yourself):
```bash
pnpm prisma generate   # Regenerate TypeScript types
pnpm prisma db push    # Apply to database (dev workflow)
```

For production migrations, use `pnpm db:migrate` instead of `db push`.

### 4. Update Dependent Code

After schema changes, update:
1. **Zod schemas** in `lib/validations/` — add/remove fields, update `.strict()`
2. **Server actions** in `actions/{feature}/` — update create/update operations
3. **API routes** in `app/api/` — update response shapes and validation
4. **SWR hooks** in `hooks/swr/` — update TypeScript interfaces
5. **UI components** — update forms and display components
6. **Tenant isolation** in `lib/tenant.ts` — add new model to `TENANT_MODELS` if tenant-scoped

### 5. Verify

Recommend the user run:
```bash
pnpm build    # Catch type errors from schema changes
pnpm lint     # Catch code quality issues
```

## Dangerous Operations

| Operation | Safe Approach |
|-----------|--------------|
| Rename field | Add new → migrate data → update code → remove old |
| Remove field | Remove code refs → deploy → remove from schema |
| Change type | Add new field → convert data → update code → remove old |
| Required field on existing table | Use `@default()` or make optional first |

## Rollback

If something goes wrong: revert schema → `pnpm prisma generate` → `pnpm prisma db push`.
