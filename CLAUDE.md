# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oikion is a unified SaaS platform for Greek real estate agencies combining MLS (Multiple Listing System), CRM, and team activity feed (Oikosync). Built on Next.js 16 with React 19, TypeScript, Prisma ORM, and Clerk authentication.

## Development Commands

```bash
# Development (HTTPS with Turbopack - default)
pnpm dev

# Development (HTTP, for simpler local testing)
pnpm dev:http

# Development (Webpack instead of Turbopack)
pnpm dev:webpack

# Production build
pnpm build

# Linting
pnpm lint

# Database
pnpm prisma studio     # Open Prisma Studio UI
pnpm prisma db push    # Push schema changes to database
pnpm prisma generate   # Regenerate Prisma client
```

## Architecture

### Multi-Tenant Data Isolation

All tenant data is isolated using `organizationId`. Every database query involving tenant data must filter by organization:

```typescript
// Always filter by organizationId for tenant-scoped data
const properties = await prismadb.property.findMany({
  where: { organizationId }
});
```

### Middleware (proxy.ts)

The middleware file is `proxy.ts` (NOT `middleware.ts`). This is a Next.js 16 requirement. The middleware handles:
- Clerk authentication for app routes
- Platform admin route protection
- API key authentication for external API routes (`/api/v1/*`)
- Rate limiting with tiered limits
- Locale routing (Greek as default)

### Route Structure

```
/app/[locale]/           # Locale-aware routing (el, en)
  ├── (auth)/           # Public auth pages (sign-in, register)
  ├── (onboarding)/     # User onboarding flow
  ├── (landing)/        # Public landing pages
  ├── (platform_admin)/ # Platform admin routes (requires isPlatformAdmin)
  └── (routes)/         # Main app routes (dashboard, CRM, MLS)
```

### API Architecture

**Internal API** (`/api/*`): Uses Clerk session authentication

**External API** (`/api/v1/*`): Uses API key authentication with scopes
- Keys prefixed with `oik_`
- Bearer token: `Authorization: Bearer oik_xxx`
- Scopes: `calendar:read`, `crm:write`, `mls:read`, `tasks:write`, etc.
- Response format: `{ data, meta: { cursor, hasMore }, timestamp }`

### Server Actions

Server actions are organized by feature in `/actions/`:
- `actions/crm/` - Client management
- `actions/mls/` - Property management
- `actions/feed/` - Activity feed
- `actions/messaging/` - Real-time messaging
- `actions/organization/` - Org management

### Data Fetching Patterns

- **SWR hooks** in `/hooks/swr/` for client-side data with caching
- **Server actions** for mutations and server-side data access
- **Cursor-based pagination** for large datasets

### Permissions System

Role hierarchy: `ORG_OWNER` > `ADMIN` > `AGENT` > `VIEWER`

Permissions are checked using the system in `/lib/permissions/`. Platform admin access requires `isPlatformAdmin: true` in Clerk privateMetadata or email in `PLATFORM_ADMIN_EMAILS` env var.

### Internationalization

Uses `next-intl` with Greek (`el`) as default locale. Translation files in `/locales/{en,el}/`. Use `useTranslations()` hook with namespaces matching the JSON file names.

## Key Dependencies

- **Clerk**: Authentication, organizations, roles
- **Prisma**: ORM with PostgreSQL (Neon-compatible)
- **SWR**: Data fetching with caching
- **Ably**: Real-time WebSocket messaging
- **shadcn/ui**: UI component library (in `/components/ui/`)
- **TipTap**: Rich text editing
- **Tremor**: Dashboard charts

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection (pooled)

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `RESEND_API_KEY` (for emails)

Optional:
- `PLATFORM_ADMIN_EMAILS` - Comma-separated admin emails
- `NEXT_PUBLIC_ABLY_KEY` - Real-time features
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - S3 storage

## File Storage

Supports both Vercel Blob and AWS S3/DigitalOcean Spaces. Configuration determined by which env vars are present.

## Testing

Cypress for E2E tests in `/cypress/`. Run tests via GitHub Actions workflow.
