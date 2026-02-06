Run the Prisma migration workflow for database schema changes.

Follow the prisma-migration skill:

1. **Review** the current schema state: read `prisma/schema.prisma` and identify what needs to change
2. **Plan** the schema modification:
   - New model? Ensure `organizationId`, `createdAt`, `updatedAt`, `@@index([organizationId])`
   - New field? Consider `@default()` values for existing rows
   - Removing field? Check all code references first
3. **Edit** `prisma/schema.prisma` with the planned changes
4. **Generate** the Prisma client: `pnpm prisma generate`
5. **Push** to database: `pnpm prisma db push`
6. **Update** dependent code:
   - Zod validation schemas in `lib/validations/`
   - Server actions in `actions/`
   - API routes in `app/api/`
   - SWR hooks in `hooks/swr/`
   - Add to `TENANT_MODELS` in `lib/tenant.ts` if tenant-scoped
7. **Verify**: Recommend the user run `pnpm build` to catch type errors from schema changes (do not run it yourself)
8. Report what was changed and what dependent files were updated
