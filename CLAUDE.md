# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oikion is a unified SaaS platform for Greek real estate agencies combining MLS (Multiple Listing System), CRM, and team activity feed (Oikosync). Built on Next.js 16 with React 19, TypeScript, Prisma ORM, and Clerk authentication.

## Development Commands

```bash
pnpm dev             # HTTPS + Turbopack (default)
pnpm dev:http        # HTTP, simpler local testing
pnpm build           # Production build
pnpm lint            # Run ESLint

pnpm prisma studio   # Open Prisma Studio UI
pnpm db:migrate      # Create and apply migration in dev
pnpm db:deploy       # Deploy migrations to production
pnpm db:status       # Check migration status
pnpm db:validate     # Validate migration status and git state
pnpm prisma generate # Regenerate Prisma client
```

Use `pnpm` — never npm/yarn/bun.

## Multi-Tenant Data Isolation

**Critical security boundary.** Every database query involving tenant data MUST filter by `organizationId`.

```typescript
// Get org from server auth context — never from client
const organizationId = await getCurrentOrgId(); // from @/lib/get-current-user

// Always filter:
const properties = await prismadb.property.findMany({ where: { organizationId } });

// Or use auto-filtering wrapper:
const db = prismaForOrg(organizationId); // from @/lib/tenant
```

Never accept `organizationId` as a client parameter. Always verify a resource belongs to the org before update/delete. See `lib/permissions/CLAUDE.md` for full rules.

## Database Connections

- Development: direct PostgreSQL URL (no Accelerate)
- Production: Prisma Accelerate URL for runtime, direct URL for migrations

`lib/prisma.ts` (named export `{ prismadb }`) enables Accelerate only when `NODE_ENV=production` and `DATABASE_URL` uses a `prisma://` or `prisma+postgres://` URL. Never use `prisma db push` in production; migrations are required.

## Middleware

The middleware file is `proxy.ts` (NOT `middleware.ts`). Handles Clerk auth, platform admin protection, API key auth for `/api/v1/*`, rate limiting, and locale routing.

## Route Structure

```
/app/[locale]/           # Locale-aware routing (el, en)
  ├── (auth)/           # Public auth pages
  ├── (onboarding)/     # User onboarding flow
  ├── (landing)/        # Public landing pages
  ├── (platform_admin)/ # Platform admin routes
  └── (routes)/         # Main app routes (dashboard, CRM, MLS)
```

## Frontend Conventions

- **Default to Server Components (RSC)** — add `"use client"` only for hooks, event handlers, or browser APIs.
- Push `"use client"` as far down the tree as possible.
- All Next.js 16 request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`.
- **Never hardcode user-facing strings** — use `useTranslations("namespace")` in components, `await getTranslations("namespace")` in server actions/route handlers. See `locales/CLAUDE.md`.
- Use `next/image` for all images, `next/font` for fonts.
- **Accessibility (WCAG AA):** semantic HTML5 elements, visible focus indicators, 4.5:1 color contrast, 44×44 px touch targets, respect `prefers-reduced-motion`.

## Security Conventions

- **No hardcoded secrets** — store in `.env` / `.env.local`, never commit credential files.
- **Validate all user input with Zod** — use `.strict()` to reject unexpected fields.
- **Error messages must not expose internals** — return generic messages to clients, log details server-side with context tags: `console.error("[FEATURE_CONTEXT]", error)`.
- Never use `$executeRawUnsafe()` or `$queryRawUnsafe()` — SQL injection risk.
- `auth()` is async in Clerk v6 — always `await auth()`.

## Permissions

Role hierarchy: `ORG_OWNER` > `ADMIN` > `AGENT` > `VIEWER`. Platform admin requires `isPlatformAdmin: true` in Clerk `privateMetadata` or email in `PLATFORM_ADMIN_EMAILS`. See `lib/permissions/CLAUDE.md` for details.

## Key Dependencies

- **Clerk** — Authentication, organizations, roles
- **Prisma** — ORM with PostgreSQL (Prisma Postgres hosting)
- **SWR** — Client-side data fetching with caching
- **Ably** — Real-time WebSocket messaging
- **shadcn/ui** — UI component library (`/components/ui/`)
- **TipTap** — Rich text editing
- **Tremor** — Dashboard charts
- **next-intl** — Internationalization (Greek `el` as default locale)

## Environment Variables

Required in `.env`: `DATABASE_URL` (PostgreSQL, pooled)

Required in `.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`

Optional: `PLATFORM_ADMIN_EMAILS`, `NEXT_PUBLIC_ABLY_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## File Storage

Supports Vercel Blob and AWS S3/DigitalOcean Spaces. Configuration determined by which env vars are present.

## Testing

- Unit tests: Vitest in `/tests/`. See `tests/CLAUDE.md`.
- E2E tests: Cypress in `/cypress/`. Run via GitHub Actions. See `cypress/CLAUDE.md`.

## Domain-Specific Conventions

See nested CLAUDE.md files for domain-specific conventions:

- `app/api/CLAUDE.md` — API route patterns (internal + external)
- `components/CLAUDE.md` — UI components, design system, accessibility
- `actions/CLAUDE.md` — Server action patterns, permission guards
- `hooks/swr/CLAUDE.md` — SWR data fetching hooks
- `lib/permissions/CLAUDE.md` — Permission system, role hierarchy
- `prisma/CLAUDE.md` — Database schema conventions
- `locales/CLAUDE.md` — Internationalization (next-intl)
- `tests/CLAUDE.md` — Vitest unit testing
- `cypress/CLAUDE.md` — Cypress E2E testing

## Doc-Keeping Standards

- When modifying a feature, check if `docs/`, `docs/architecture/`, or any nested CLAUDE.md references the changed behavior. Update them in the same PR.
- Create an ADR (`docs/architecture/decisions/`) for: data model changes, new third-party integrations, auth/encryption/permission changes.
- See `docs/MAINTENANCE.md` for the quarterly review checklist.
