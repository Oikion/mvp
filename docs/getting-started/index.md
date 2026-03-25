# Getting Started

Oikion is a unified SaaS platform for Greek real estate agencies combining MLS (Multiple Listing System), CRM, and team activity feed (Oikosync). Built on Next.js 16, React 19, TypeScript, Prisma ORM, and Clerk authentication.

## Five-minute start

1. Check [prerequisites](./prerequisites.md) — Node.js 20+, pnpm 9+, PostgreSQL 15+
2. Follow [local setup](./local-setup.md) — clone, install, configure `.env`, run `pnpm dev`
3. Configure [external services](./service-setup.md) — Clerk, HTTPS, Vercel Blob, Redis

## Contents

| Page | Description |
|------|-------------|
| [Prerequisites](./prerequisites.md) | System and account requirements |
| [Local Setup](./local-setup.md) | Clone → install → database → run |
| [Service Setup](./service-setup.md) | Clerk, HTTPS, Blob, Captcha, Rate Limiting |
| [Project Structure](./project-structure.md) | Directory layout and route groups |
| [First Contribution](./first-contribution.md) | PR workflow, commits, code standards |
| [Troubleshooting](./troubleshooting.md) | Common issues and fixes |

## Key commands

```bash
pnpm dev          # HTTPS dev server (default, Turbopack)
pnpm dev:http     # HTTP dev server (simpler local testing)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm db:migrate   # Create and apply Prisma migration (dev)
pnpm db:deploy    # Deploy migrations to production
```
