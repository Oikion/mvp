# CAPTCHA Development Guide

## Overview

This application uses Clerk's bot protection feature, which relies on Cloudflare Turnstile CAPTCHA. When developing locally, you may encounter cross-origin errors related to CAPTCHA.

## The Issue

Cloudflare Turnstile has strict domain validation requirements. Even when running on HTTPS locally (`https://localhost:3000`), you may see errors like:

```
Blocked a frame with origin "https://challenges.cloudflare.com" from accessing a frame with origin "https://localhost:3000". Protocols, domains, and ports must match.
```

## Solutions

### Option 1: CAPTCHA Hidden by Default (Current Implementation)

The CAPTCHA element in SSO callback pages is **hidden by default** to prevent console errors in development. This means:
- ✅ No console errors during development
- ✅ Social sign-up/sign-in works normally
- ✅ Clerk's pre-built components (`<SignUp />`, `<SignIn />`) handle CAPTCHA automatically
- ✅ CAPTCHA works in production through Clerk's components

**Current Behavior:**
- By default: CAPTCHA element is hidden (no errors)
- With env var: Can be enabled for testing if needed

**To enable CAPTCHA element in SSO callbacks** (for testing):
```bash
# Add to your .env.local file
NEXT_PUBLIC_ENABLE_CAPTCHA_DEV=true
```

**Note:** Clerk's `<SignUp />` and `<SignIn />` components handle CAPTCHA automatically, so the manual CAPTCHA element in SSO callback pages is typically not needed. It's included as a fallback for custom flows.

### Option 2: Configure Clerk Dashboard for Localhost

If you need CAPTCHA to work in development:

1. **Go to Clerk Dashboard** → Your Application → Settings → Security
2. **Navigate to Bot Protection settings**
3. **Add `localhost` or `localhost:3000`** to the allowed domains/origins
4. **Save the configuration**

**Note:** Cloudflare Turnstile may still have restrictions on localhost domains. This option may not fully resolve the issue.

### Option 3: Use a Tunnel Service (For Testing CAPTCHA)

For thorough CAPTCHA testing in development:

1. Use a tunnel service like [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
2. Configure Clerk dashboard to allow your tunnel domain
3. Access your app through the tunnel URL

Example with ngrok:
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your Next.js server
pnpm dev

# In another terminal, create tunnel
ngrok http 3000

# Use the ngrok URL (e.g., https://abc123.ngrok.io) to access your app
# Add this URL to Clerk dashboard allowed origins
```

## Production

In production environments:
- ✅ CAPTCHA works automatically
- ✅ No configuration needed (assuming your production domain is configured in Clerk)
- ✅ HTTPS is handled by your hosting provider

## Troubleshooting

### CAPTCHA errors in console but sign-up works

This is normal in development. The errors are cosmetic and don't affect functionality. CAPTCHA is automatically disabled in development mode.

### Need to test CAPTCHA locally

1. Set `NEXT_PUBLIC_ENABLE_CAPTCHA_DEV=true` in `.env.local`
2. Configure Clerk dashboard to allow localhost (see Option 2)
3. Or use a tunnel service (see Option 3)

### CAPTCHA not working in production

1. Verify your production domain is added to Clerk dashboard
2. Check that bot protection is enabled in Clerk dashboard
3. Ensure your production site uses HTTPS
4. Check browser console for specific error messages

## Files Modified

The following files handle CAPTCHA conditional rendering:
- `app/[locale]/(auth)/register/sso-callback/page.tsx`
- `app/[locale]/(auth)/sign-in/sso-callback/page.tsx`
- `app/[locale]/(auth)/sso-callback/page.tsx`

These files automatically hide the CAPTCHA element in development to prevent console errors.

