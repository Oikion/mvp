# Local Setup

## 1. Clone and install

```bash
git clone https://github.com/Oikion/mvp.git
cd mvp
pnpm install
```

## 2. Environment variables

```bash
cp .env.example .env
cp .env.local.example .env.local
```

### `.env` (database — committed shape, never commit values)

```env
# Development: direct PostgreSQL connection
DATABASE_URL="postgresql://user:pass@host:5432/oikion_dev?sslmode=require&connection_limit=10&pool_timeout=10"
DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/oikion_dev?sslmode=require"
```

For Prisma Postgres (hosted): obtain both URLs from [console.prisma.io](https://console.prisma.io).

### `.env.local` (secrets — never commit)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...

NEXT_PUBLIC_APP_URL=https://localhost:3000/app
NEXT_PUBLIC_APP_NAME=Oikion
```

See [Service Setup](./service-setup.md) for optional vars (Blob, Redis, Ably, S3).

## 3. Database setup

```bash
# Apply all existing migrations
pnpm db:deploy

# Or in development (creates migration file if schema changed)
pnpm db:migrate --name initial_setup

# Regenerate Prisma client after schema changes
pnpm prisma generate
```

**Never use `prisma db push` in production.** Migrations in `prisma/migrations/` are the only supported schema change workflow.

The project uses separate dev and production databases:

| Environment | `DATABASE_URL` format | Purpose |
|-------------|----------------------|---------|
| Development | `postgresql://...` | Direct connection, no Accelerate |
| Production runtime | `prisma+postgres://accelerate...` | Prisma Accelerate (pooled) |
| Production migrations | `postgresql://...` via `DIRECT_DATABASE_URL` | Bypasses Accelerate |

`lib/prisma.ts` enables Accelerate only when `NODE_ENV=production` and `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`.

## 4. HTTPS certificates (recommended)

Clerk bot protection requires HTTPS. See [Service Setup → HTTPS](./service-setup.md#https-certificates).

Quick setup on macOS:

```bash
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
# Creates localhost.pem and localhost-key.pem in project root
```

## 5. Run the dev server

```bash
pnpm dev        # HTTPS on https://localhost:3000 (Turbopack)
pnpm dev:http   # HTTP on http://localhost:3000 (skip if mkcert set up)
```

## 6. Validate setup

```bash
pnpm db:validate   # checks DATABASE_URL, migration files, Prisma status
pnpm lint          # ESLint
pnpm build         # full production build check
```

## Vercel build command

Ensure Vercel runs migrations before build:

```
prisma migrate deploy && pnpm build
```
