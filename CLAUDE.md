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
- **CSP `'unsafe-inline'` in `script-src`** — required by Clerk SDK inline event handlers. This weakens XSS protection. Long-term fix: nonce-based CSP via middleware nonce injection (see `next.config.js:195`). Do not add additional inline scripts without evaluating this constraint.

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

## Design System

Full design context lives in `.impeccable.md`. Summary for Claude sessions:

**Brand**: Calm, trustworthy, efficient. References: Linear, Vercel, Raycast.

**Fonts**:
- `gallery.otf` — logo only. Never use in UI components, headings, or body copy.
- **Manrope** (`--font-manrope`) — current primary UI font. Retained as baseline.
- **Inter** (`--font-sans`) — **scheduled for removal**. Do not use in new code; replace on sight.
- Replacements under evaluation: Geist, Bricolage Grotesque, Chivo, Hanken Grotesk.

**Theme**: Light and dark are equally first-class. Neither is a fallback. Design both simultaneously.

**Typography rules**: Fixed `rem` scale for app UI (no fluid/clamp in product UI). Cap line length at ~65–75ch. Validate spacing and type against Greek (`el`) strings — Greek text runs ~30% longer than English.

**Color**: Migrating from HSL → OKLCH tokens for perceptual uniformity. Do not introduce new HSL-based color tokens.

**Spacing**: Target vocabulary is `--space-xs` through `--space-2xl` (4pt base). Prefer named tokens over ad-hoc Tailwind spacing classes in new work.

**Absolute bans** (AI-template tells — never add these):
- `border-left` / `border-right` wider than 1px as a colored accent stripe
- Gradient text (`background-clip: text` with gradient fill)
- Glassmorphism used decoratively
- Identical card grids (icon + heading + text, repeated)

## Skill Invocation Rules

Invoke these skills automatically — do not wait to be asked:

- **UI components**: When writing or significantly modifying any React component (`.tsx`), invoke `impeccable:critique` before finishing.
- **New pages or layouts**: Invoke `impeccable:impeccable` at the start of any new page or full layout task.
- **TypeScript refactors**: After completing TypeScript changes, invoke `ecc:typescript-reviewer`.
- **Security-sensitive code**: Any code touching auth, input validation, API routes, or permissions — invoke `ecc:security-reviewer` after completing the work.

## Doc-Keeping Standards

- When modifying a feature, check if `docs/`, `docs/architecture/`, or any nested CLAUDE.md references the changed behavior. Update them in the same PR.
- Create an ADR (`docs/architecture/decisions/`) for: data model changes, new third-party integrations, auth/encryption/permission changes.
- See `docs/MAINTENANCE.md` for the quarterly review checklist.
