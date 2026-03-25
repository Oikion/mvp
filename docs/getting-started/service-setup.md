# Service Setup

One section per external service. All env vars go in `.env.local` unless noted.

## Clerk Authentication

Oikion uses Clerk's Account Portal (hosted pages) with virtual routing.

### Environment variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Clerk Dashboard configuration

1. **Custom roles** — Organization Settings → Roles. Create four roles with exact keys:
   - `org:owner` — Full access, primary administrator
   - `org:lead` — Full CRUD, cannot manage org settings
   - `org:member` — Standard CRUD, cannot reassign agents
   - `org:viewer` — Read-only access
   Set default new-member role to `org:member`.

2. **Account Portal** — Settings → Account Portal → Enable. Set redirect URLs:
   - After Sign Up: `/{locale}/app/onboard`
   - After Sign In: `/{locale}/app`

3. **Social providers** — User & Authentication → Social Connections → Enable Google (and others). OAuth callback URL is provided by Clerk automatically.

4. **Webhooks** — Settings → Webhooks. Endpoint: `https://yourdomain.com/api/webhooks/clerk`.
   Subscribe to: `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organization.updated`, `organization.deleted`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`.

5. **CORS** (custom domain only) — Settings → CORS → add `https://oikion.com` and `https://localhost:3000`.

### ClerkProvider configuration

`lib/clerk-theme-provider.tsx` is pre-configured:
- `signInFallbackRedirectUrl`: `/{locale}/app`
- `signUpFallbackRedirectUrl`: `/{locale}/app/onboard`
- `afterSignOutUrl`: `/{locale}`

---

## HTTPS Certificates

Clerk bot protection (Cloudflare Turnstile) requires HTTPS. Use `pnpm dev:http` to skip HTTPS, but CAPTCHA will not work on HTTP.

### macOS

```bash
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### Linux (Ubuntu/Debian)

```bash
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
chmod +x mkcert && sudo mv mkcert /usr/local/bin/
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### Windows

Download from [mkcert releases](https://github.com/FiloSottile/mkcert/releases). In PowerShell (as Administrator):

```powershell
.\mkcert.exe -install
.\mkcert.exe localhost 127.0.0.1 ::1
```

Generates `localhost.pem` and `localhost-key.pem` in the project root (gitignored). The dev server auto-detects them.

---

## Vercel Blob Storage

Used for document and file uploads.

1. Vercel Dashboard → your project → Storage → Create Database → Blob
2. After creation, `BLOB_READ_WRITE_TOKEN` is auto-added to Vercel env vars.
3. For local dev, pull via CLI or add manually:

```bash
vercel env pull .env.local
```

Or manually:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Restart the dev server after adding the variable.

---

## CAPTCHA (Development)

CAPTCHA is hidden by default in development to avoid cross-origin console errors. Clerk's `<SignIn />` and `<SignUp />` components handle CAPTCHA automatically in production via Account Portal.

To enable CAPTCHA element in SSO callbacks for testing:

```env
NEXT_PUBLIC_ENABLE_CAPTCHA_DEV=true
```

For full CAPTCHA testing in development, use a tunnel service:

```bash
# ngrok example
pnpm dev
ngrok http 3000
# Add the ngrok URL to Clerk Dashboard allowed origins
```

---

## Rate Limiting (Upstash Redis)

In-memory fallback is used automatically if Redis is not configured — suitable for development and single-instance deployments. In-memory state does not persist across serverless invocations.

### Upstash setup (production)

1. [console.upstash.com](https://console.upstash.com) → Create Redis Database
   - Region: EU-West-1 (Frankfurt) — closest to Greece
   - Eviction: No eviction
2. Database → REST API tab → copy both values:

```env
UPSTASH_REDIS_REST_URL="https://eu1-xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AX..."
```

Add to Vercel: Dashboard → Settings → Environment Variables.

### Rate limit tiers

| Tier | Limit | Applies to |
|------|-------|-----------|
| default | 60 req/min | General API |
| strict | 10 req/min | Auth, password reset, org invites, webhooks |
| lenient | 120 req/min | Properties, clients, documents, search reads |
| burst | 30 req/10s | File uploads, messaging, typing indicators |
| api | 100 req/min | External API `/api/v1/*` per API key |

Excluded: `/api/webhooks/*`, `/api/health/*`, `/api/cron/*`.

Customize tiers in `lib/rate-limit.ts`. Cache helpers are in `lib/redis.ts`.
