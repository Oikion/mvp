# Clerk Account Portal Configuration

This document outlines the Clerk configuration for using Clerk's Account Portal (hosted pages) with social authentication support.

## Overview

The application now uses Clerk's Account Portal with virtual routing, which provides:
- ✅ Full social authentication support (Google, GitHub, etc.)
- ✅ Automatic CAPTCHA handling (no localhost issues)
- ✅ Clerk-hosted pages that work seamlessly in development and production
- ✅ No custom SSO callback pages needed

## Required Environment Variables

Ensure these are set in your `.env.local` file:

```env
# Clerk API Keys
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Clerk Webhook Secret (for webhook verification)
CLERK_WEBHOOK_SECRET=whsec_...

# Application URLs
NEXT_PUBLIC_APP_URL=https://localhost:3000  # Use HTTPS for local dev
NEXT_PUBLIC_APP_NAME=Your App Name
```

## Clerk Dashboard Configuration

### 1. Enable Account Portal

1. Go to **Clerk Dashboard** → Your Application → **Settings** → **Account Portal**
2. **Enable** the Account Portal
3. Configure redirect URLs:
   - **After Sign Up**: `/{locale}/create-organization` (or `/en/create-organization` for default)
   - **After Sign In**: `/{locale}` (or `/en` for default)

### 2. Configure Social Providers

1. Go to **Clerk Dashboard** → **User & Authentication** → **Social Connections**
2. Enable the providers you want (Google, GitHub, etc.)
3. Configure OAuth credentials for each provider
4. Set callback URLs if required by the provider

### 3. Configure Redirect URLs

In **Clerk Dashboard** → **Settings** → **Paths**:

- **Sign-in URL**: `/sign-in` (or `/{locale}/sign-in` if using locales)
- **Sign-up URL**: `/register` (or `/{locale}/register` if using locales)
- **After sign-in URL**: `/` (or `/{locale}` if using locales)
- **After sign-up URL**: `/create-organization` (or `/{locale}/create-organization` if using locales)

### 4. Webhook Configuration

1. Go to **Clerk Dashboard** → **Webhooks**
2. **Endpoint URL**: `https://yourdomain.com/api/webhooks/clerk` (or your local webhook URL for testing)
3. **Events to Subscribe**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`

### 5. Bot Protection (Optional)

1. Go to **Clerk Dashboard** → **Security** → **Attack Protection**
2. Enable **Bot sign-up protection** if desired
3. Select **Smart CAPTCHA** (recommended)
4. **Note**: CAPTCHA works automatically with Clerk's hosted pages, no localhost configuration needed

## How It Works

### Authentication Flow

1. **User visits** `/sign-in` or `/register`
2. **Clerk's hosted pages** handle the authentication (including social OAuth)
3. **After successful auth**, user is redirected to configured `afterSignInUrl` or `afterSignUpUrl`
4. **Social OAuth callbacks** are handled automatically by Clerk (no custom callback pages needed)

### Virtual Routing

The application uses Clerk's `virtual` routing mode:
- `<SignIn routing="virtual" />` - Uses Clerk's hosted sign-in page
- `<SignUp routing="virtual" />` - Uses Clerk's hosted sign-up page
- All OAuth callbacks are handled by Clerk automatically
- No need for custom SSO callback pages

## Files Structure

### Authentication Pages

- `app/[locale]/(auth)/sign-in/[[...rest]]/page.tsx` - Sign-in page using Clerk's hosted pages
- `app/[locale]/(auth)/register/[[...rest]]/page.tsx` - Sign-up page using Clerk's hosted pages

### Configuration

- `lib/clerk-theme-provider.tsx` - ClerkProvider configuration with redirect URLs
- `lib/clerk-theme.tsx` - Theme customization (if any)

## Social Authentication Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
4. Copy Client ID and Client Secret to Clerk Dashboard

### GitHub OAuth

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
4. Copy Client ID and Client Secret to Clerk Dashboard

### Other Providers

Follow similar steps for other OAuth providers. Clerk will provide the callback URL in the dashboard.

## Development vs Production

### Development

- Works seamlessly with `https://localhost:3000` (when using HTTPS)
- Social authentication works automatically
- No CAPTCHA errors (handled by Clerk's hosted pages)
- Redirect URLs configured in code via `afterSignInUrl` and `afterSignUpUrl`

### Production

- Configure production domain in Clerk Dashboard
- Update `NEXT_PUBLIC_APP_URL` to production URL
- Ensure HTTPS is enabled
- All features work automatically

## Troubleshooting

### Social Auth Not Working

1. Verify OAuth credentials in Clerk Dashboard
2. Check callback URLs match Clerk's provided URL
3. Ensure social providers are enabled in Clerk Dashboard
4. Check browser console for errors

### Redirect Not Working

1. Verify `afterSignInUrl` and `afterSignUpUrl` in `ClerkProvider`
2. Check Clerk Dashboard redirect URL settings
3. Ensure locale routing is correct if using internationalization

### Users Redirected to Wrong Page

1. Check `afterSignInUrl` and `afterSignUpUrl` in `lib/clerk-theme-provider.tsx`
2. Verify Clerk Dashboard settings match
3. Clear browser cache and cookies

## Benefits of Using Account Portal

1. **No CAPTCHA Issues**: Clerk handles CAPTCHA on their hosted pages
2. **Social Auth Works**: OAuth callbacks handled automatically
3. **Less Code**: No custom callback pages needed
4. **Better Security**: Clerk maintains and updates security features
5. **Easier Development**: Works the same in dev and production

## Migration Notes

If migrating from custom authentication:
- SSO callback pages are no longer needed (deleted)
- Custom `<SignIn />` and `<SignUp />` components replaced with virtual routing
- Ensure Account Portal is enabled in Clerk Dashboard
- Update redirect URLs in both code and Clerk Dashboard

