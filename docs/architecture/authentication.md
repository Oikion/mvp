# Authentication

Oikion uses [Clerk](https://clerk.com) for authentication, organization management, and role-based access.

## Custom roles

Four custom roles replace Clerk's defaults. Create these in Clerk Dashboard → Organization Settings → Roles:

| Role Key | Display Name | Clerk Permissions |
|----------|-------------|-------------------|
| `org:owner` | Owner | All permissions |
| `org:lead` | Lead | `org:sys_memberships:read`, `org:sys_memberships:manage` |
| `org:member` | Member | `org:sys_memberships:read` |
| `org:viewer` | Viewer | `org:sys_memberships:read` |

Set default new-member role to `org:member` in Organization Settings → General.

Role hierarchy is implemented in application code (`lib/permissions/`, `lib/org-admin.ts`):

```
org:owner > org:lead > org:member > org:viewer
```

## Account Portal (current setup)

Authentication uses Clerk's Account Portal (hosted pages) with virtual routing. This eliminates CAPTCHA localhost issues and OAuth callback complexity.

**Sign-in:** `https://accounts.oikion.com/sign-in`
**Sign-up:** `https://accounts.oikion.com/sign-up`

### ClerkProvider configuration (`lib/clerk-theme-provider.tsx`)

```typescript
signInFallbackRedirectUrl: "/{locale}/app"       // dashboard
signUpFallbackRedirectUrl: "/{locale}/app/onboard" // onboarding
afterSignOutUrl: "/{locale}"                       // landing page
```

### Auth pages

- `app/[locale]/(auth)/sign-in/[[...rest]]/page.tsx` — `<SignIn routing="virtual" />`
- `app/[locale]/(auth)/register/[[...rest]]/page.tsx` — `<SignUp routing="virtual" />`

SSO callback pages are not needed — Account Portal handles OAuth callbacks automatically.

## Webhooks

Endpoint: `app/api/webhooks/clerk/route.ts`

Subscribe in Clerk Dashboard → Webhooks to:

| Event | Action |
|-------|--------|
| `user.created` | Sync user to local `Users` table |
| `user.updated` | Update user in local `Users` table |
| `user.deleted` | Remove Clerk user ID from local database |
| `organization.*` | Logged for auditing |
| `organizationMembership.*` | Logged for auditing |

```env
CLERK_WEBHOOK_SECRET=whsec_...
```

## Auth in server code

```typescript
import { auth } from "@clerk/nextjs/server";

// In server actions and API routes
const { userId, orgId: organizationId } = await auth();
if (!userId || !organizationId) throw new Error("Unauthenticated");
```

## Authentication flow

### Sign up
1. User visits `/register` → Clerk Account Portal
2. After sign-up → `/{locale}/app/onboard`
3. User completes onboarding (profile setup, preferences, creates personal workspace)
4. After onboarding → `/{locale}/app` (personal workspace dashboard)

### Sign in
1. User visits `/sign-in` → Clerk Account Portal
2. After sign-in → `/{locale}`
3. Layout checks for organization:
   - No org → redirect to `/{locale}/app` (or personal workspace creation if needed)
   - Org exists → dashboard of active organization

### Create Organization
1. After onboarding, user can create agencies from the workspace switcher
2. Click "Create Organization" → `/{locale}/app/create-organization`
3. Complete 6-step wizard: org info → data policy → encryption → teammates → partnerships → review
4. On creation → dashboard of new agency org

## Troubleshooting

See [Getting Started → Troubleshooting](../getting-started/troubleshooting.md) for common Clerk issues.

**Roles not appearing:** Verify exact key values (`org:owner`, `org:lead`, `org:member`, `org:viewer`) in Clerk Dashboard.

**CORS errors:** See `docs/getting-started/troubleshooting.md#clerk--authentication`.

## Account Portal migration notes

The application was migrated from custom authentication forms to Clerk Account Portal. Changes made:

- Replaced custom `SignInForm` / `RegisterForm` with `<SignIn routing="virtual" />` / `<SignUp routing="virtual" />`
- Deleted SSO callback pages (`/sign-in/sso-callback`, `/register/sso-callback`) — Account Portal handles these automatically
- `ClerkThemeProvider` redirect URLs already configured correctly

**Deprecated components** (still in codebase, can be removed):
- `components/auth/GoogleAuthButton.tsx`
- `app/[locale]/app/(auth)/sign-in/components/SignInForm.tsx`
- `app/[locale]/app/(auth)/register/components/RegisterForm.tsx`
- `components/UserAuthForm.tsx`

## Related files

| File | Purpose |
|------|---------|
| `lib/clerk-theme-provider.tsx` | ClerkProvider with redirect config |
| `lib/permissions/` | Role-based permission checking |
| `lib/org-admin.ts` | Role utilities |
| `proxy.ts` | Middleware: auth enforcement, platform admin routes |
| `app/api/webhooks/clerk/route.ts` | Webhook handler |
