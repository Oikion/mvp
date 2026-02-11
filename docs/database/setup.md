# Database Setup

This project uses separate development and production databases with two
connection strings per environment:

- Direct PostgreSQL connection (used in development and for migrations)
- Prisma Accelerate connection (used in production runtime)

## Environment Variables

### Development (local)

Use a direct connection to avoid consuming Accelerate usage:

```
NODE_ENV="development"
DATABASE_URL="postgresql://user:pass@dev.db.prisma.io:5432/oikion_dev?sslmode=require&connection_limit=10&pool_timeout=10"
DIRECT_DATABASE_URL="postgresql://user:pass@dev.db.prisma.io:5432/oikion_dev?sslmode=require"
```

### Production (Vercel)

Use Accelerate for runtime queries but keep a direct URL for migrations:

```
NODE_ENV="production"
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_ACCELERATE_KEY"
DIRECT_DATABASE_URL="postgresql://user:pass@prod.db.prisma.io:5432/oikion_prod?sslmode=require"
```

## Prisma Client Behavior

`lib/prisma.ts` enables Accelerate only when:

- `NODE_ENV=production`
- `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`

This guarantees development never uses Accelerate, even if the URL format is
mistakenly set to a Prisma Accelerate URL.

## Migrations and Schema Synchronization

Migration files in `prisma/migrations/` are the single source of truth.

### Create a migration (development)

```
pnpm db:migrate --name descriptive_name
```

This will:

1. Create a migration file in `prisma/migrations/`
2. Apply it to the database using `DIRECT_DATABASE_URL`
3. Regenerate the Prisma client

### Deploy migrations (production)

```
pnpm db:deploy
```

## Validation

Use the migration validation script before deploying:

```
pnpm db:validate
```

This checks:

- `DATABASE_URL` (and `DIRECT_DATABASE_URL` in production)
- Migration folder existence
- No uncommitted changes in `prisma/schema.prisma` or `prisma/migrations`
- Prisma migration status

## Vercel Build Command

Ensure Vercel runs migrations before the build:

```
prisma migrate deploy && pnpm build
```

## Development vs Production Databases

Use separate databases for development and production to avoid schema drift and
unintended production changes.

- **Development**: direct PostgreSQL URL only (no Accelerate)
- **Production runtime**: Prisma Accelerate URL (`DATABASE_URL`)
- **Production migrations**: direct PostgreSQL URL (`DIRECT_DATABASE_URL`)

Never use `prisma db push` in production. Migrations are the only supported
schema change workflow.
