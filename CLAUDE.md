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
- **Prisma**: ORM with PostgreSQL (Prisma Postgres hosting)
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

## Cursor Workflows & Commands

This project uses Cursor with a comprehensive set of rules, skills, commands, and hooks. When working in Cursor, use these workflows for consistency and quality.

### Available Slash Commands

Type these commands in Cursor chat to trigger specific workflows:

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/verify` | Run 6-phase verification loop (build, lint, tenant check, i18n, permissions, diff) | Before marking work complete or creating a PR |
| `/review` | Comprehensive code quality, security, and convention audit | Before committing significant changes |
| `/plan` | Create detailed implementation plan with approval gate | Before starting multi-file features or complex changes |
| `/pr` | Create pull request with conventional commit message | When ready to open a PR |
| `/fix-issue [number]` | Fetch GitHub issue, implement fix, and create PR | When fixing a tracked GitHub issue |
| `/new-action [feature/name]` | Scaffold a new server action with boilerplate | When adding a new server action |
| `/new-api-route [path]` | Scaffold a new API route with auth and validation | When adding a new API endpoint |
| `/db-migrate` | Guided Prisma schema migration workflow | When modifying the database schema |

### Available Skills (Workflows)

Skills are invoked by asking for them naturally or via commands. Available skills:

- **verification-loop** — 6-phase pre-commit quality gate (used by `/verify`)
- **tdd-workflow** — Red-Green-Refactor cycle adapted for Cypress + Prisma
- **prisma-migration** — Safe database schema changes with rollback plan (used by `/db-migrate`)
- **feature-scaffold** — End-to-end feature development (DB → UI in 9 steps)
- **security-audit** — 8-phase comprehensive security audit
- **import-export** — CSV/XML/Excel import and portal publishing workflows

### When to Use What

**Before starting work:**
- Complex feature spanning 3+ files → Use `/plan` to create an implementation plan
- Bug fix for a GitHub issue → Use `/fix-issue [number]`

**During development:**
- Adding a server action → Use `/new-action [feature/name]`
- Adding an API route → Use `/new-api-route [path]`
- Modifying database schema → Use `/db-migrate`
- Implementing a new feature from scratch → Ask to "follow the feature-scaffold workflow"
- Using TDD → Ask to "follow the TDD workflow"

**Before completing:**
- Always recommend the user run `/verify` to check build, lint, tenant isolation, i18n, and permissions (do not run checks yourself)
- For significant changes, recommend the user run `/review` for quality audit
- Security-sensitive changes → Ask to "run the security audit"

**Creating a PR:**
- Use `/pr` to follow the standard PR workflow with conventional commits

### Automatic Quality Checks

The following happen automatically without invocation:

- **Rules**: Context-aware guidance loads based on files being edited (frontend, server actions, API routes, Prisma, navigation, etc.)
- **Stop hook**: When the agent marks work "done", a lightweight check runs (lint + tenant isolation scan) and may ask for fixes

### Specialized Agents

For specific audits, you can invoke these agents:

- **accessibility-auditor** — WCAG 2.2/2.3 compliance checks for UI components
- **security-auditor** — Security vulnerability analysis
- **api-expert** — API endpoint security and pattern validation
- **design-consistency** — Design system and UI consistency enforcement

Invoke by asking: "Run the accessibility audit on [component]" or similar.
