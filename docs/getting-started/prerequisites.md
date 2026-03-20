# Prerequisites

## System requirements

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 20.9.0 | LTS recommended; Prisma 6 requires 18.18+, 20.9+, or 22.11+ |
| pnpm | 9.0.0 | Project uses pnpm workspaces; do not use npm or yarn |
| PostgreSQL | 15 | Direct local install, or use [Prisma Postgres](https://create-db.prisma.io) (hosted) |
| Git | 2.x | Any recent version |

## Accounts required

| Service | Purpose | Required for |
|---------|---------|--------------|
| [Clerk](https://clerk.com) | Authentication and organizations | All environments |
| [Prisma Data Platform](https://console.prisma.io) | Hosted PostgreSQL (optional) | If not running PostgreSQL locally |
| [Upstash](https://console.upstash.com) | Redis for rate limiting and caching | Production; dev falls back to in-memory |
| [Vercel](https://vercel.com) | Blob storage + deployment | File uploads and production hosting |
| [Resend](https://resend.com) | Transactional email | Email notifications |

## Optional

- `mkcert` — for local HTTPS certificates (required if using Clerk bot protection with CAPTCHA)
- AWS / DigitalOcean Spaces credentials — alternative to Vercel Blob for file storage
- Ably account — for real-time WebSocket messaging
