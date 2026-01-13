# Clerk Configuration After Account Portal Disabled

This document outlines all the Clerk configurations and API routes that are required after disabling Clerk's Account Portal.

## Required Environment Variables

Ensure these are set in your `.env` file:

```env
# Clerk API Keys
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Clerk Webhook Secret (for webhook verification)
CLERK_WEBHOOK_SECRET=whsec_...

# Application URLs (include /app basePath)
NEXT_PUBLIC_APP_URL=http://localhost:3000/app
NEXT_PUBLIC_APP_NAME=Your App Name
```

## Clerk Dashboard Configuration

### 1. Webhook Configuration
- **Path**: Settings → Webhooks
- **Endpoint URL**: `https://yourdomain.com/api/webhooks/clerk`
- **Events to Subscribe**:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.updated`
  - `organizationMembership.deleted`

### 2. Redirect URLs (if available in Dashboard)
- **After Sign Up URL**: `/{locale}/create-organization`
- **After Sign In URL**: `/{locale}`

### 3. Account Portal
- **Status**: Disabled ✅
- All authentication flows are handled by custom components

## API Routes Summary

### Webhook Handler
- **Route**: `/api/webhooks/clerk`
- **File**: `app/api/webhooks/clerk/route.ts`
- **Purpose**: Handles Clerk webhook events for user and organization sync
- **Status**: ✅ Configured

### User Management Routes
- **Profile Photo Update**: `/api/profile/updateProfilePhoto` ✅
- **User Invitation**: `/api/user/inviteuser` ✅
- **User Deletion**: `/api/user/[userId]/delete-account` ✅
- **Organization Check**: `/api/user/[userId]/check-orgs-before-delete` ✅

### Organization Management
- **Creation**: Handled via `CreateOrganizationForm` component using Clerk's `useOrganizationList` hook ✅
- **Profile Management**: `/app/[locale]/(routes)/organization/[[...rest]]/page.tsx` ✅
- **Organization Settings**: Managed through Clerk's `OrganizationProfile` component ✅

## Component Configuration

### Authentication Components
1. **Sign Up** (`app/[locale]/(auth)/register/components/RegisterComponent.tsx`)
   - Redirects to: `/{locale}/create-organization`
   - ✅ Configured

2. **Sign In** (`app/[locale]/(auth)/sign-in/components/LoginComponent.tsx`)
   - Redirects to: `/{locale}` (layout handles org check)
   - ✅ Configured

3. **SSO Callbacks**
   - Register SSO: `app/[locale]/(auth)/register/sso-callback/page.tsx` ✅
   - Sign In SSO: `app/[locale]/(auth)/sign-in/sso-callback/page.tsx` ✅

### Organization Components
1. **Create Organization Form** (`components/organization/CreateOrganizationForm.tsx`)
   - Uses Clerk's `useOrganizationList` hook
   - ✅ Configured

2. **Organization Profile** (`app/[locale]/(routes)/organization/[[...rest]]/page.tsx`)
   - Uses Clerk's `OrganizationProfile` component
   - ✅ Configured

### ClerkProvider Configuration
- **File**: `lib/clerk-theme-provider.tsx`
- **Settings**:
  - `signInFallbackRedirectUrl`: `/{locale}/app` (dashboard)
  - `signUpFallbackRedirectUrl`: `/{locale}/app/onboard` (onboarding)
  - `afterSignOutUrl`: `/{locale}` (landing page)
- ✅ Configured

## Authentication Flow

We use Clerk's Account Portal (`accounts.oikion.com`) for authentication:
- Sign-in: `https://accounts.oikion.com/sign-in`
- Sign-up: `https://accounts.oikion.com/sign-up`

### Sign Up Flow
1. User signs up via Clerk's Account Portal
2. After successful sign-up → Redirected to `/{locale}/app/onboard`
3. User completes onboarding (creates organization, sets preferences)
4. After onboarding → Redirected to `/{locale}/app` (dashboard)

### Sign In Flow
1. User signs in via `LoginComponent` or social auth
2. After successful sign-in → Redirected to `/{locale}`
3. Layout checks for organization:
   - If no organization → Redirected to `/{locale}/create-organization`
   - If organization exists → Shows dashboard

### Social Auth Flow
1. User clicks social auth button (e.g., Apple, Google)
2. Redirected to provider for authentication
3. Returns to SSO callback page (`/sso-callback`)
4. `AuthenticateWithRedirectCallback` processes the response
5. Redirects based on:
   - New user → `/{locale}/create-organization`
   - Existing user → `/{locale}` (layout handles org check)

## Webhook Events Handled

### User Events
- `user.created`: Syncs user to local database
- `user.updated`: Updates user in local database
- `user.deleted`: Removes Clerk user ID from local database

### Organization Events (Logged for Auditing)
- `organization.created`: Logs organization creation
- `organization.updated`: Logs organization updates
- `organization.deleted`: Logs organization deletion
- `organizationMembership.created`: Logs membership creation
- `organizationMembership.updated`: Logs membership updates
- `organizationMembership.deleted`: Logs membership deletion

## Important Notes

1. **Organization Management**: Organizations are managed entirely through Clerk's API. No local database table is needed for organizations.

2. **User Sync**: The `syncClerkUser` function ensures that Clerk users are synced to your local `Users` table with the correct `clerkUserId`.

3. **Organization Context**: The application uses Clerk's organization context (`orgId`) to filter data by organization in various API routes.

4. **Authentication**: All authentication is handled through Clerk. The application checks for authentication using `auth()` from `@clerk/nextjs/server`.

5. **Middleware**: No custom middleware is needed as Clerk handles authentication checks through the `auth()` function in layouts and API routes.

## Testing Checklist

- [ ] Sign up with email/password → Redirects to organization creation
- [ ] Sign up with social auth (Apple/Google) → Redirects to organization creation
- [ ] Sign in with existing account → Redirects to dashboard
- [ ] Sign in without organization → Redirects to organization creation
- [ ] Create organization → Successfully creates and redirects to dashboard
- [ ] Organization webhook events are logged correctly
- [ ] User webhook events sync correctly to database
- [ ] Organization profile page loads correctly
- [ ] User profile page loads correctly

## Troubleshooting

### Users being redirected to Clerk's hosted pages
- Check that `forceRedirectUrl` is set on SignIn/SignUp components
- Verify `afterSignUpUrl` and `afterSignInUrl` in ClerkProvider
- Ensure Clerk Dashboard Account Portal is disabled

### Webhook not receiving events
- Verify `CLERK_WEBHOOK_SECRET` is set correctly
- Check webhook endpoint URL in Clerk Dashboard
- Ensure webhook events are subscribed in Clerk Dashboard

### Organization creation failing
- Check that user is authenticated
- Verify Clerk API keys are correct
- Check browser console for errors

