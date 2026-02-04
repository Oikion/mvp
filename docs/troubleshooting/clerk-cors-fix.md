# Clerk CORS Error Fix

## Problem

When using Google SSO, you may encounter CORS errors like:

```
Fetch API cannot load https://clerk.oikion.com/v1/environment?__clerk_api_version=... due to access control checks.
Fetch API cannot load https://clerk.oikion.com/v1/client?__clerk_api_version=... due to access control checks.
```

This happens when Clerk is configured with a custom domain (`clerk.oikion.com`) but CORS isn't properly configured.

## Solution

### Option 1: Use Clerk's Default Domain (Recommended for Development)

1. Go to **Clerk Dashboard** → **Settings** → **Domains**
2. **Disable** custom domain if enabled
3. Use Clerk's default domain (e.g., `your-app.clerk.accounts.dev`)
4. Update your environment variables if needed

### Option 2: Configure CORS for Custom Domain (Required for Production)

If you're using a custom domain (`clerk.oikion.com`), you need to configure CORS:

1. Go to **Clerk Dashboard** → **Settings** → **Domains**
2. Ensure your custom domain is properly configured
3. Go to **Settings** → **CORS**
4. Add your application URLs to the allowed origins:
   - `https://oikion.com` (the app is served at oikion.com/app)
   - `https://localhost:3000` (for local development)
   - `http://localhost:3000` (for local development)
5. Save the changes

### Option 3: Check Environment Variables

Ensure your `.env.local` has the correct Clerk configuration:

```env
# Clerk API Keys
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Application URL (must match your actual domain including /app basePath)
NEXT_PUBLIC_APP_URL=https://oikion.com/app
# For local dev: http://localhost:3000/app
```

## Additional Checks

1. **Verify Clerk Domain**: Check that your Clerk publishable key matches the domain you're using
2. **Check Browser Console**: Look for specific CORS error messages to identify which domain is causing issues
3. **Test in Incognito**: Sometimes browser extensions or cached data can cause issues

## After Fixing CORS

1. Clear your browser cache
2. Restart your development server
3. Try Google SSO authentication again
4. The callback should now redirect properly to:
   - Sign-up: `/{locale}/app/onboard`
   - Sign-in: `/{locale}/app`

## Authentication with Account Portal

The application now uses Clerk's Account Portal for authentication:
- Sign-in: `https://accounts.oikion.com/sign-in`
- Sign-up: `https://accounts.oikion.com/sign-up`

These are Clerk-hosted pages that handle all OAuth flows automatically.

