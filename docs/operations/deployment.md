# Deployment

## Standard Deployment (Vercel)

Oikion deploys on Vercel with Next.js 16 and Turbopack.

### Steps

1. Push to GitHub (`main` branch triggers production deploy)
2. Vercel auto-detects Next.js; build command: `pnpm build`; output directory: `.next`
3. Required environment variables (set in Vercel dashboard):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Postgres pooled URL |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL URL (for migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `RESEND_API_KEY` | Email sending |
| `NEXT_PUBLIC_ABLY_KEY` | Real-time features |
| `AWS_ACCESS_KEY_ID` | S3/Spaces file storage (optional) |
| `AWS_SECRET_ACCESS_KEY` | S3/Spaces file storage (optional) |

4. After deploy, run database migrations:
   ```bash
   pnpm db:deploy
   ```

### Environment Detection

`lib/prisma.ts` enables Prisma Accelerate only when `NODE_ENV=production` and `DATABASE_URL` uses a `prisma://` or `prisma+postgres://` scheme. Development uses the direct PostgreSQL URL without Accelerate.

### Middleware

Middleware is in `proxy.ts` (not `middleware.ts` — Next.js 16 requirement). It handles:
- Clerk authentication for app routes
- Platform admin route protection
- API key auth for `/api/v1/*`
- Rate limiting with tiered limits
- Locale routing (Greek default)

## Database Architecture

Oikion uses a single physical PostgreSQL database with row-level tenant isolation:

```
All orgs → shared PostgreSQL
               ↓
        organizationId filter
        on every query
```

For enterprise organizations, per-org database silos are planned (see below).

## K8s Database Silos (Planned / Enterprise)

Per-org dedicated databases for enterprise customers requiring complete data isolation.

### Architecture

```
Org A (Shared) → Shared Database
Org B (Silo)   → Dedicated Database B
Org C (Silo)   → Dedicated Database C
```

### Database Models

`OrganizationSettings` stores silo config:
- `databaseSiloEnabled` (boolean)
- `databaseHost`, `databasePort`, `databaseName`, `databaseUser`, `databasePassword` (encrypted)
- `k8sNamespace`, `k8sResourceQuota`, `k8sStorageClass`

`OrganizationDatabasePool` tracks active connections:
- `connectionString` (encrypted)
- `poolSize` (default 5)
- `healthStatus` (`healthy` | `degraded` | `down`)

### K8s Resources

Each silo org gets:
- A dedicated namespace (`oikion-org-{id}`)
- ResourceQuota: 2 CPU / 4Gi RAM (requests), 4 CPU / 8Gi (limits)
- NetworkPolicy isolating ingress/egress to the org's namespace
- PostgreSQL instance provisioned via K8s operator (`DatabaseSilo` CRD)

### Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Database schema & settings | Complete |
| 2 | Org settings API | In Progress |
| 3 | K8s operator development | Planned |
| 4 | Connection pool manager | Planned |
| 5 | Migration tools | Planned |
| 6 | Admin UI | Planned |

### Admin API (Platform Admin Only)

```
POST /api/platform-admin/org-settings/create-silo
PUT  /api/platform-admin/org-settings/[orgId]/database
GET  /api/platform-admin/org-settings/[orgId]/database/health
POST /api/platform-admin/org-settings/[orgId]/database/migrate
```

## Locale Routing

Greek (`el`) is the default locale. No URL prefix for Greek; English uses `/en/`. Translations in `/locales/{en,el}/`.
