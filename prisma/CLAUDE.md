# Prisma Schema Conventions

This file applies whenever you are working in `prisma/`.

## Database Stack

- **Database**: PostgreSQL (Prisma Postgres hosting, pooled connections)
- **ORM**: Prisma 6. Client singleton in `lib/prisma.ts` (named export `{ prismadb }`)
- **Schema file**: `prisma/schema.prisma`
- **Connection**: Use a pooled `DATABASE_URL` at runtime (Prisma Postgres or Prisma Accelerate from Prisma Data Platform) to reduce connection churn and "This request must be retried" warnings after idle. Prisma retries failed attempts automatically; pooled URLs minimize those failures.
- **Accelerate**: Enabled automatically in `lib/prisma.ts` when `NODE_ENV=production` and `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`. Dev uses direct PostgreSQL URL.

## Model Structure Template

Every tenant-scoped model MUST follow this exact pattern:

```prisma
model EntityName {
  id             String   @id @default(cuid())
  organizationId String
  // ... entity fields ...
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("entity_names")  // plural snake_case table name
}
```

## Required Fields for Tenant Models

| Field | Type | Directive | Purpose |
|-------|------|-----------|---------|
| `id` | `String` | `@id @default(cuid())` | Primary key — always CUID |
| `organizationId` | `String` | (required) | Tenant isolation — MANDATORY |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Auto-updated modification timestamp |

Always include `@@index([organizationId])` and `@@map("plural_snake_case")`.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Model name | PascalCase, singular | `Property`, `CalendarEvent` |
| Field name | camelCase | `clientName`, `assignedTo` |
| Enum name | PascalCase | `PropertyStatus`, `DealStatus` |
| Enum value | UPPER_SNAKE_CASE | `FOR_SALE`, `PENDING_REVIEW` |
| Table mapping | plural snake_case | `@@map("calendar_events")` |
| Column mapping | snake_case (when needed) | `@map("assigned_to")` |

## Relations

- Use descriptive relation names: `assignedToUser Users @relation("AssignedToUser")`
- Always define both sides of a relation (Prisma requires it)
- Use `onDelete: Cascade` for child entities that cannot exist without parent (e.g. a property image without its property)
- Use `onDelete: SetNull` when orphan records are acceptable (e.g. `assignedTo` agent departs — record stays, reference becomes null)
- Nullable relation fields (`String?`) pair with `onDelete: SetNull`

## Indexes

- Always index `organizationId` on every tenant-scoped model: `@@index([organizationId])`
- Add compound indexes for common query patterns: `@@index([organizationId, status])`
- Add unique constraints for business rules: `@@unique([organizationId, email])`
- Add indexes on foreign keys referenced in JOINs

## Enums

```prisma
enum PropertyStatus {
  DRAFT
  ACTIVE
  UNDER_OFFER
  SOLD
  ARCHIVED
}
```

- PascalCase for enum type names
- UPPER_SNAKE_CASE for enum values
- **Always add new values at the end** — inserting values mid-enum requires a non-transactional `ADD VALUE` migration and can break production

## Schema Change Workflow

1. Edit `prisma/schema.prisma`
2. Tell the user to run `pnpm prisma generate` to regenerate the Prisma client (do not run it yourself)
3. Tell the user to run `pnpm db:migrate` (dev) or `pnpm db:deploy` (prod) — never `prisma db push` in production
4. Update related Zod validation schemas in `lib/validations/`
5. Update affected server actions in `actions/` and API routes in `app/api/`
6. Update SWR hooks in `hooks/swr/` if API response shapes changed

For a guided workflow, use the `/db-migrate` command or ask to "follow the prisma-migration skill".

## Prisma 6 Specifics

- `auth()` from Clerk v6 is async — always `await auth()`
- Implicit many-to-many relations use a primary key (not a unique index) on the join table
- Use `relationLoadStrategy: "join"` for performance when fetching related records in a single query
- Nested creates are batched into a single `INSERT` roundtrip in Prisma 6
- Minimum Node.js: 18.18.0, 20.9.0, or 22.11.0
- Minimum TypeScript: 5.1.0

## Query Patterns

```typescript
// Always filter by organizationId for tenant-scoped data
const properties = await prismadb.property.findMany({
  where: { organizationId },
});

// Compound filter — never findUnique without organizationId
const client = await prismadb.client.findFirst({
  where: { id: clientId, organizationId },
});

// relationLoadStrategy for join-based loading
const property = await prismadb.property.findFirst({
  where: { id, organizationId },
  include: { mandates: true },
  // @ts-expect-error — Prisma 6 preview feature
  relationLoadStrategy: "join",
});
```

## Anti-Patterns

- NEVER use `$executeRawUnsafe()` or `$queryRawUnsafe()` — SQL injection risk
- NEVER run `prisma db push` in production — use migrations only
- NEVER create a tenant-scoped model without `organizationId`
- NEVER delete fields in production without a migration plan — mark deprecated first, remove in a later migration
- NEVER use `findUnique` without `organizationId` in the where clause — cross-tenant data leak risk
- NEVER commit `.env` or `.env.local` — document required vars in `.env.local.example`
