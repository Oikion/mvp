# Architecture Overview

Oikion is a multi-tenant SaaS platform for Greek real estate agencies. The stack:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM 6 |
| Auth | Clerk (orgs, roles, webhooks) |
| Real-time | Ably (WebSocket channels) |
| Client data | SWR (stale-while-revalidate) |
| Internationalization | next-intl (Greek default, English) |
| File storage | Vercel Blob or AWS S3/DigitalOcean Spaces |
| Rate limiting / cache | Upstash Redis (in-memory fallback) |
| Email | Resend |

## Architecture pages

| Page | Description |
|------|-------------|
| [Multi-Tenancy](./multi-tenancy.md) | organizationId isolation, query patterns |
| [Authentication](./authentication.md) | Clerk roles, permissions, webhooks |
| [Permissions](./permissions.md) | Role hierarchy, permission levels, platform admin |
| [Data Model](./data-model.md) | Key Prisma entities and relationships |
| [Encryption](./encryption.md) | Field-level encryption, DEK/KEK, encrypted models |
| [Real-Time](./real-time.md) | Ably integration, entity-as-channel |
| [Internationalization](./internationalization.md) | next-intl setup, locale routing, namespaces |
| [Logging](./logging.md) | Log levels, conventions, sensitive data rules |
| [Type Safety](./type-safety.md) | Current status, `@ts-nocheck` inventory, roadmap |

## Key architectural decisions

**Single database, multi-tenant via `organizationId`** — every tenant-scoped model has an `organizationId` field and index. There is no row-level security at the database level; isolation is enforced in application code.

**Server actions over API routes for internal mutations** — server actions in `actions/` are the primary mutation path. Internal REST routes in `app/api/` handle complex reads. External API routes in `app/api/v1/` use API key auth.

**Middleware in `proxy.ts`** — Next.js 16 requires the middleware file to be named `proxy.ts` in this project, not `middleware.ts`.

**Prisma Accelerate in production only** — `lib/prisma.ts` enables Accelerate only when `NODE_ENV=production` and `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`. Development always uses direct PostgreSQL.
