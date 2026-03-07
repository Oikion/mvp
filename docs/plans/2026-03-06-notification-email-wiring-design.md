# Notification Email Wiring via Resend

**Date:** 2026-03-06
**Status:** Approved

## Problem

The notification system has a wiring gap: `notifyOrganization()` in `lib/notifications/notification-service.ts` creates in-app notifications but never triggers email delivery via Resend. This means org-wide notifications (client created, property created) never reach users' inboxes.

Additionally, `notifyOrganization()` queries ALL active users across the entire platform instead of filtering by `organizationId`, which is a tenant isolation bug.

## Scope

- Fix the email wiring gap so all notification paths trigger Resend emails
- Fix the tenant isolation bug in `notifyOrganization()`
- Add missing `categoryToPreference` entries for messaging categories
- Do NOT add new email templates for messaging categories (future work)

## Design

### 1. Fix `notifyOrganization()` — tenant isolation + email

**File:** `lib/notifications/notification-service.ts`

**Current behavior:**
- Queries `prismadb.users.findMany({ where: { userStatus: "ACTIVE" } })` — returns ALL platform users
- Creates DB notification records only
- No email sending

**New behavior:**
- Use `getOrgMembersFromDb({ organizationId })` from `lib/org-members.ts` to get only actual org members via Clerk
- Filter out `excludeUserId` (the actor)
- Create DB notification records (unchanged)
- Call `sendNotificationEmailToUsers()` from `lib/notifications/email-service.ts` with the same user list
- Email is fire-and-forget — failures are logged but don't affect in-app notifications

**Function signature is unchanged** — all callers work without modification.

### 2. Add missing `categoryToPreference` entries

**File:** `lib/notifications/email-service.ts`

Add mappings for messaging categories that exist in the Prisma enum but are missing from the preference map:

```typescript
MESSAGE_RECEIVED: "social",
MESSAGE_MENTION: "social",
CHANNEL_INVITE: "social",
CHANNEL_MESSAGE: "social",
```

This prevents runtime errors if email is ever triggered for these categories. No email templates are created (they'll return `null` from `getEmailComponent()` and be gracefully skipped).

### 3. Files changed

| File | Change |
|------|--------|
| `lib/notifications/notification-service.ts` | Fix `notifyOrganization()` — proper org member query + email trigger |
| `lib/notifications/email-service.ts` | Add missing messaging categories to `categoryToPreference` |

### 4. What stays unchanged

- **helpers.ts** — already has per-user email calls; org-wide helpers get email via the centralized fix
- **Email templates** — all existing categories already have templates
- **UI components** — no changes
- **API routes** — no changes
- **Prisma schema** — no changes

## Architecture Note

The notification system follows a dual-channel pattern:
- **Per-user helpers** (e.g., `notifyPostLiked`) → call `createNotification()` + `sendNotificationEmail()` directly
- **Org-wide helpers** (e.g., `notifyClientCreated`) → call `notifyOrganization()` which now handles both channels

Both paths respect `UserNotificationSettings` — email is only sent if the user has the category enabled.
