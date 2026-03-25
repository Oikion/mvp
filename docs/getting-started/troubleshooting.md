# Troubleshooting

## Clerk / Authentication

### CORS errors with Google SSO

**Symptoms:** `Fetch API cannot load https://clerk.oikion.com/v1/...` in browser console.

**Cause:** Clerk custom domain (`clerk.oikion.com`) without proper CORS configuration.

**Fix (development):** Disable custom domain in Clerk Dashboard → Settings → Domains. Use Clerk's default domain (`your-app.clerk.accounts.dev`).

**Fix (production):** Clerk Dashboard → Settings → CORS → add allowed origins:
- `https://oikion.com`
- `https://localhost:3000`
- `http://localhost:3000`

Also verify `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://oikion.com/app  # production
# or for local: https://localhost:3000/app
```

### Users redirected to Clerk hosted pages unexpectedly

- Check `forceRedirectUrl` on `<SignIn>` / `<SignUp>` components
- Verify `afterSignUpUrl` and `afterSignInUrl` in `lib/clerk-theme-provider.tsx`
- Confirm Account Portal is enabled in Clerk Dashboard

### Webhook not receiving events

- Verify `CLERK_WEBHOOK_SECRET` matches the secret shown in Clerk Dashboard
- Confirm endpoint URL in Clerk Dashboard is `https://yourdomain.com/api/webhooks/clerk`
- Check that all nine event types are subscribed

### Roles not appearing in invite dropdown

- Role keys must match exactly: `org:owner`, `org:lead`, `org:member`, `org:viewer`
- Clear browser cache and refresh
- Verify roles exist in Clerk Dashboard → Organization Settings → Roles

---

## HTTPS / CAPTCHA

### "SSL certificates not found"

- Confirm `localhost.pem` and `localhost-key.pem` exist in the project root
- Re-run `mkcert localhost 127.0.0.1 ::1` if files are missing

### Browser security warning on localhost

Normal for self-signed certificates. Click Advanced → Proceed to localhost.

### CAPTCHA console errors but sign-up still works

Expected in development — errors are cosmetic. CAPTCHA is automatically disabled in development mode. Use `pnpm dev:http` to suppress entirely, or set:

```env
NEXT_PUBLIC_ENABLE_CAPTCHA_DEV=true
```

---

## Database

### "This request must be retried" / connection errors

- Ensure `DATABASE_URL` uses a pooled connection string in production
- In development, use direct PostgreSQL URL (no Accelerate)
- Check `lib/prisma.ts` — Accelerate is only enabled when `NODE_ENV=production` and URL starts with `prisma://` or `prisma+postgres://`

### Migration drift / "schema is not in sync"

```bash
pnpm db:validate   # checks migration status and git state
pnpm db:status     # shows which migrations are applied
```

Never use `prisma db push` in production.

---

## Dashboard / Build errors

### MapIterator / spread error on `Map.values()`

This was fixed by using `Array.from(map.values())` in `lib/dashboard/widget-registry.ts` and `lib/dashboard/dashboard-config-provider.tsx`. If it recurs, check those files.

### ESLint config errors (`@next/next/no-img-element` not found)

Ensure `eslint.config.mjs` includes both `next/core-web-vitals` and `react-hooks` plugins. Run `pnpm lint` to verify.

### `svgo` dynamic dependency warning

Non-blocking build warning from `lib/image-compression.ts` → `actions/upload`. It does not affect functionality but will appear in production build output.

---

## Vercel Blob

### `BLOB_READ_WRITE_TOKEN is not defined`

- Add to `.env.local` and restart the dev server
- Variable name must be exactly `BLOB_READ_WRITE_TOKEN`

### 403 Forbidden on upload

- Confirm you're using a read-write token (not read-only)
- Pull latest env vars: `vercel env pull .env.local`

---

## Rate limiting

### Unexpected 429 responses in development

Redis is not required in development — the system falls back to in-memory limiting. If hitting limits, verify you're not running against a production Redis instance locally.

Monitor cache state: Upstash console → Data Browser → keys matching `oik:*`.
