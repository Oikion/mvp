# Notification Email Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire Resend email delivery into org-wide notifications and fix tenant isolation in `notifyOrganization()`.

**Architecture:** Centralize email sending inside `notifyOrganization()` so all callers (e.g., `notifyClientCreated`, `notifyPropertyCreated`) get email delivery for free. Fix the user query to use Clerk org membership instead of querying all platform users.

**Tech Stack:** Next.js, Prisma, Resend SDK, Clerk Backend SDK, React Email

---

### Task 1: Add missing messaging categories to `categoryToPreference`

**Files:**
- Modify: `lib/notifications/email-service.ts:88-104`

**Step 1: Add the missing entries**

In `lib/notifications/email-service.ts`, find the `categoryToPreference` map. After the `CONNECTION_ACCEPTED: "social",` line (line 94) and before the `// System notifications` comment (line 96), add:

```typescript
  // Messaging notifications
  MESSAGE_RECEIVED: "social",
  MESSAGE_MENTION: "social",
  CHANNEL_INVITE: "social",
  CHANNEL_MESSAGE: "social",
```

**Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No TypeScript errors related to `categoryToPreference`.

**Step 3: Commit**

```bash
git add lib/notifications/email-service.ts
git commit -m "fix: add missing messaging categories to email preference map"
```

---

### Task 2: Fix `notifyOrganization()` — tenant isolation + email wiring

**Files:**
- Modify: `lib/notifications/notification-service.ts:1-131`

**Step 1: Add imports**

At the top of `lib/notifications/notification-service.ts`, after the existing imports (line 13), add:

```typescript
import { getOrgMembersFromDb } from "@/lib/org-members";
import { sendNotificationEmailToUsers, type NotificationEmailData } from "./email-service";
```

**Step 2: Replace `notifyOrganization()` body**

Replace the entire `notifyOrganization` function (lines 84-131) with:

```typescript
/**
 * Create notification for all users in an organization (except actor)
 * Also sends email notifications via Resend based on user preferences
 */
export async function notifyOrganization(
  organizationId: string,
  excludeUserId: string | null,
  type: NotificationCategory,
  title: string,
  message: string,
  options?: {
    entityType?: NotificationEntityType;
    entityId?: string;
    actorId?: string;
    actorName?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    // Get actual org members via Clerk (proper tenant isolation)
    const { users } = await getOrgMembersFromDb({
      organizationId,
      select: { id: true },
    });

    // Filter out the actor
    const recipientIds = excludeUserId
      ? users.filter((u: { id: string }) => u.id !== excludeUserId).map((u: { id: string }) => u.id)
      : users.map((u: { id: string }) => u.id);

    if (recipientIds.length === 0) {
      return;
    }

    // Create in-app notifications
    await createBulkNotifications({
      userIds: recipientIds,
      organizationId,
      type,
      title,
      message,
      entityType: options?.entityType,
      entityId: options?.entityId,
      actorId: options?.actorId,
      actorName: options?.actorName,
      metadata: options?.metadata,
    });

    // Send email notifications (fire-and-forget, respects user preferences)
    const emailData: Omit<NotificationEmailData, "recipientName"> = {
      actorName: options?.actorName,
      actorId: options?.actorId,
      entityId: options?.entityId,
      entityName: options?.metadata?.entityName || options?.metadata?.clientName || options?.metadata?.propertyName,
      entityType: options?.entityType,
      metadata: options?.metadata,
    };

    sendNotificationEmailToUsers(recipientIds, type, emailData).catch((err) => {
      console.error("[NOTIFICATION_SERVICE] Email delivery failed (non-blocking):", err);
    });
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to notify organization:", error);
  }
}
```

Key decisions in this code:
- `getOrgMembersFromDb({ organizationId })` fetches members via Clerk API → proper tenant isolation
- `sendNotificationEmailToUsers` is called with `.catch()` (fire-and-forget) so email failures never block in-app notifications
- `entityName` is derived from metadata fields that callers already pass (`clientName`, `propertyName`, etc.)
- The function signature is unchanged — zero caller modifications needed

**Step 3: Verify the build compiles**

Run: `pnpm build`
Expected: No TypeScript errors. The `@ts-nocheck` in email-service.ts means we only need notification-service.ts to compile cleanly.

**Step 4: Commit**

```bash
git add lib/notifications/notification-service.ts
git commit -m "fix: wire Resend email into notifyOrganization and fix tenant isolation

notifyOrganization() now uses getOrgMembersFromDb() to query only actual
org members via Clerk instead of all platform users (tenant isolation fix).
After creating in-app notifications, it sends emails via Resend respecting
user preferences. Email is fire-and-forget to avoid blocking."
```

---

### Task 3: Verify end-to-end wiring

**Step 1: Trace the call paths**

Verify these helpers now trigger email via the centralized fix:

1. `notifyClientCreated()` in `lib/notifications/helpers.ts` → calls `notifyOrganization()` → now sends email ✓
2. `notifyPropertyCreated()` in `lib/notifications/helpers.ts` → calls `notifyOrganization()` → now sends email ✓

**Step 2: Verify helpers with direct email calls still work**

These already call `sendNotificationEmail()` directly and are unaffected:
- `notifyPostLiked`, `notifyPostCommented`, `notifyEntityShared`
- `notifyDealProposed`, `notifyDealStatusChanged`
- `notifyConnectionRequest`, `notifyConnectionAccepted`
- `notifyTaskAssigned`, `notifyTaskCommented`
- `notifyEventInvite`
- `notifyAccountWatchers`, `notifyPropertyWatchers`

**Step 3: Full build check**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 4: Final commit (if any linting fixes needed)**

```bash
git add -A
git commit -m "chore: lint fixes for notification email wiring"
```

---

## Summary of Changes

| File | What changed |
|------|-------------|
| `lib/notifications/email-service.ts` | Added 4 messaging category mappings to `categoryToPreference` |
| `lib/notifications/notification-service.ts` | Replaced user query with `getOrgMembersFromDb()` for tenant isolation; added `sendNotificationEmailToUsers()` call for email delivery |

## What NOT to change

- `lib/notifications/helpers.ts` — already wired correctly for per-user email
- `lib/notifications/index.ts` — exports are already correct
- Email templates in `emails/notifications/` — all exist already
- Prisma schema — no changes needed
- UI components — no changes needed
