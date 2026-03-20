# Project Structure

## Top-level directories

```
mvp/
├── app/                    # Next.js 16 App Router
├── actions/                # Server actions (mutations + server-side data)
├── components/             # Shared React components
│   └── ui/                 # shadcn/ui primitives
├── hooks/
│   └── swr/                # SWR data-fetching hooks
├── lib/                    # Shared utilities and services
├── locales/
│   ├── el/                 # Greek translations (default locale)
│   └── en/                 # English translations
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration history (source of truth)
├── docs/                   # Project documentation
├── cypress/                # E2E tests
├── proxy.ts                # Next.js middleware (NOT middleware.ts)
└── .env.local              # Local secrets (never commit)
```

## App Router structure

```
app/
└── [locale]/               # next-intl locale routing (el, en)
    ├── (auth)/             # Public auth pages: sign-in, register
    ├── (onboarding)/       # New user onboarding flow
    ├── (landing)/          # Public marketing/landing pages
    ├── (platform_admin)/   # Internal platform admin (isPlatformAdmin required)
    └── (routes)/           # Main authenticated app
        ├── dashboard/
        ├── crm/            # CRM module: clients, deals
        ├── mls/            # MLS module: properties, mandates
        ├── calendar/
        ├── documents/
        ├── feed/           # Oikosync activity feed
        ├── messaging/
        ├── network/        # Agent network / Polis
        ├── admin/          # Org-level admin
        └── organization/   # Org profile and settings
```

## Route groups explained

| Group | Access | Purpose |
|-------|--------|---------|
| `(auth)` | Public | Sign-in and registration pages. Renders Clerk Account Portal via virtual routing. |
| `(onboarding)` | Authenticated, no org | Wizard for creating first organization and setting preferences. |
| `(landing)` | Public | Marketing pages, agent public profiles (`/agent/[slug]`). |
| `(platform_admin)` | `isPlatformAdmin` in Clerk metadata | Internal admin: user/org management, API key management, billing. |
| `(routes)` | Authenticated + org required | All application features. Layout enforces org context. |

## Actions organization

```
actions/
├── crm/                    # Client CRUD, search, matching
├── mls/                    # Property and mandate CRUD
├── calendar/               # Calendar event management
├── messaging/              # Direct messages and comments
├── feed/                   # Activity feed queries
├── dashboard/              # Dashboard widget data
├── organization/           # Org settings and team management
└── user/                   # User profile and preferences
```

## Key lib files

| File | Purpose |
|------|---------|
| `lib/prisma.ts` | Prisma client singleton (named export `{ prismadb }`) |
| `lib/permissions/` | Role-based permission checking |
| `lib/model-encryption.ts` | Field-level encryption per entity |
| `lib/encryption.ts` | Low-level AES-256-GCM |
| `lib/key-management.ts` | Per-org DEK lifecycle |
| `lib/rate-limit.ts` | Rate limiting tiers and logic |
| `lib/redis.ts` | Redis cache helpers |
| `lib/user-departure/` | Unified user departure service |
| `proxy.ts` | Middleware: Clerk auth, API key auth, rate limiting, locale routing |

## Middleware note

The middleware file is `proxy.ts` (not `middleware.ts`). This is a Next.js 16 requirement in this project. Do not create `middleware.ts`.
