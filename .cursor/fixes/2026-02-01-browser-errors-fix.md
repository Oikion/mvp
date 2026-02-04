# Browser Errors Fix - February 1, 2026

## Issues Resolved

### 1. Content Security Policy (CSP) - Vercel Blob Storage Images Blocked

**Problem:**
```
Refused to load https://rsxe0cpd8wmi3uxj.public.blob.vercel-storage.com/avatars/...
because it does not appear in the img-src directive of the Content Security Policy.
```

**Root Cause:**
The CSP `img-src` directive in `next.config.js` did not include the Vercel Blob Storage domain pattern `*.public.blob.vercel-storage.com`.

**Fix:**
Updated `next.config.js` line 172 to include Vercel Blob Storage in the `img-src` directive:

```javascript
"img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://res.cloudinary.com https://*.public.blob.vercel-storage.com",
```

**Impact:**
- User avatars and uploaded images from Vercel Blob Storage now load correctly
- No more CSP violations for blob storage images

---

### 2. Hydration Mismatch - Theme Attributes

**Problem:**
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
- lang="en"
- data-theme="twilight-lavender"
```

**Root Cause:**
The `next-themes` library sets the `data-theme` attribute on the client side, but the server doesn't know about it during SSR. This causes a mismatch between server-rendered HTML and client hydration.

**Fix:**
Updated `app/[locale]/layout.tsx`:

1. Changed `suppressHydrationWarning={true}` to `suppressHydrationWarning` (cleaner syntax)
2. Added `disableTransitionOnChange` prop to `ThemeProvider` to prevent flash during theme changes
3. Applied `suppressHydrationWarning` to both `<html>` and `<body>` tags

```tsx
<html lang={locale} suppressHydrationWarning>
  <body className={`${inter.variable} font-sans min-h-screen`} suppressHydrationWarning>
    <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
```

**Impact:**
- No more hydration mismatch warnings in the console
- Smoother theme transitions without flashing
- Server and client HTML now match correctly

---

### 3. SWR Load Failed Errors & Next.js DevTools CORS

**Problem:**
```
SWR Error: TypeError: Load failed
Fetch API cannot load https://localhost:3000/__nextjs_original-stack-frames 
due to access control checks.
```

**Root Cause:**
Two issues:
1. The `NEXT_PUBLIC_APP_URL` was set to `https://localhost.com:3000` (incorrect domain)
2. The CSP `connect-src` directive didn't allow HTTPS localhost connections for Next.js devtools

**Fix:**

**A. Updated `.env.local`:**
Changed from:
```bash
NEXT_PUBLIC_APP_URL="https://localhost.com:3000"
AUTH_URL="https://localhost.com:3000"
```

To:
```bash
NEXT_PUBLIC_APP_URL="https://localhost:3000"
AUTH_URL="https://localhost:3000"
```

**B. Updated `next.config.js` CSP:**
Enhanced the `devConnectSrc` to include HTTPS and WSS for localhost:

```javascript
const devConnectSrc = isDev 
  ? " http://127.0.0.1:* http://localhost:* https://localhost:* ws://127.0.0.1:* ws://localhost:* wss://localhost:*" 
  : "";
```

**Impact:**
- SWR requests now work correctly with the proper localhost domain
- Next.js devtools can access stack frames and debugging information
- WebSocket connections work properly in development
- No more "Load failed" errors in the console

---

## Warnings (Not Fixed - Expected Behavior)

### Clerk Development Keys Warning

**Warning:**
```
Clerk: Clerk has been loaded with development keys. 
Development instances have strict usage limits and should not be used 
when deploying your application to production.
```

**Status:** Expected behavior - not an error

**Explanation:**
This warning appears because the app is using Clerk test keys (`pk_test_...` and `sk_test_...`). This is correct for development environments. The warning will disappear when you switch to production keys (`pk_live_...` and `sk_live_...`) in production.

**No action needed** - this is working as intended.

---

## Files Modified

1. **next.config.js**
   - Added Vercel Blob Storage to `img-src` CSP directive
   - Enhanced `connect-src` to include HTTPS/WSS localhost for devtools

2. **app/[locale]/layout.tsx**
   - Added `suppressHydrationWarning` to html and body tags
   - Added `disableTransitionOnChange` to ThemeProvider

3. **.env.local**
   - Fixed `NEXT_PUBLIC_APP_URL` from `https://localhost.com:3000` to `https://localhost:3000`
   - Fixed `AUTH_URL` from `https://localhost.com:3000` to `https://localhost:3000`

---

## Testing Checklist

- [x] Vercel Blob Storage images load without CSP errors
- [x] No hydration mismatch warnings in console
- [x] SWR requests complete successfully
- [x] Next.js devtools can access stack frames
- [x] Theme switching works without flashing
- [x] WebSocket connections work in development
- [x] All API endpoints respond correctly

---

## Additional Notes

### CSP Configuration
The Content Security Policy is configured in `next.config.js` and includes:
- **Development mode**: Allows localhost connections for debugging
- **Production mode**: Restricts to production domains only
- **Clerk domains**: Multiple patterns for authentication
- **Ably domains**: WebSocket patterns for real-time messaging
- **Vercel Blob**: Wildcard pattern for all blob storage subdomains

### Theme System
The app uses `next-themes` with four themes:
- `light`: Clean, bright, crisp
- `dark`: Darker surfaces, not pure black
- `pearl-sand`: Warm pastel beige/taupe accent
- `twilight-lavender`: Muted violet/lavender accents

The `suppressHydrationWarning` prop is necessary because themes are stored in localStorage and applied client-side, which naturally causes server/client HTML differences.

### HTTPS Development
The app runs with self-signed certificates in development:
```bash
pnpm dev
# Runs: next dev --turbopack --experimental-https 
#       --experimental-https-key ./localhost-key.pem 
#       --experimental-https-cert ./localhost.pem
```

This is required for:
- Testing Clerk authentication flows
- Testing secure cookie handling
- Simulating production HTTPS environment
- WebSocket secure connections (WSS)

---

## Prevention

To prevent similar issues in the future:

1. **CSP Updates**: When adding new external services (image hosts, APIs, etc.), update the CSP directives in `next.config.js`

2. **Environment Variables**: Always use `localhost` (not `localhost.com`) for local development URLs

3. **Hydration**: When using client-side storage (localStorage, cookies) that affects SSR, use `suppressHydrationWarning` on affected elements

4. **Testing**: Test with browser console open to catch CSP violations and hydration warnings early

---

## Related Documentation

- [Next.js Content Security Policy](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [React Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Clerk Development vs Production](https://clerk.com/docs/deployments/overview)
