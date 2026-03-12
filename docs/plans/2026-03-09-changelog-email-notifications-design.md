# Changelog Email Notifications — Design Doc

**Date:** 2026-03-09
**Status:** Approved
**Feature:** Send changelog update emails from AdminPlatform to registered users via Resend

---

## Overview

When a platform admin publishes a changelog entry, all registered users who have `systemEmailEnabled = true` (or no `UserNotificationSettings` row, defaulting to opted-in) receive a branded email notification. Admins can also manually re-send notifications for already-published entries. Broadcast history is surfaced in the Newsletter dashboard.

---

## Approach

**Batch send via `resend.batch.send()` + DB tracking.**

Query opted-in users from Prisma, chunk into batches of 50, send with `resend.batch.send()` using the dynamically-loaded API key via `resendHelper()`. Store a `ChangelogBroadcast` record per send. Surface broadcast history in the Newsletter dashboard as a new tab.

---

## Data Model

### New model: `ChangelogBroadcast`

```prisma
model ChangelogBroadcast {
  id               String   @id @default(uuid())
  changelogEntryId String
  sentAt           DateTime @default(now())
  recipientCount   Int
  resendEmailIds   String[]
  sentById         String

  changelogEntry   ChangelogEntry @relation(fields: [changelogEntryId], references: [id])
  sentBy           Users          @relation(fields: [sentById], references: [id])

  @@index([changelogEntryId])
  @@index([sentAt])
}
```

### Additions to `ChangelogEntry`

```prisma
lastNotifiedAt  DateTime?
broadcastCount  Int                  @default(0)
broadcasts      ChangelogBroadcast[]
```

### Migration

Requires `pnpm db:migrate` with a descriptive name (e.g. `add_changelog_broadcasts`).

---

## Email Template

**File:** `emails/changelog/ChangelogNotification.tsx`

**Props:**
```ts
interface ChangelogNotificationEmailProps {
  username: string;
  email: string;
  version: string;
  title: string;
  description: string;       // HTML/markdown content
  category: { name: string; color: string; icon: string } | null;
  tags: { name: string; color: string }[];
  publishedAt: string;
  changelogUrl: string;      // ${baseUrl}/changelog
}
```

**Structure:**
- Dark header (Oikion branding, matches existing admin emails)
- Version badge (monospace `v1.2.3`) + category pill with color
- Title as `<Heading>`
- Tags row
- Description via `<Markdown>` in bordered content box
- CTA button → changelog page
- Footer with `buildUnsubscribeUrl(email)` + Privacy Policy link

---

## Server Actions

### `sendChangelogNotification(changelogEntryId: string)` (in `changelog-actions.ts`)

1. `requirePlatformAdmin()` — gate access
2. Fetch `ChangelogEntry` — must be `PUBLISHED`, else return error
3. Fetch admin's DB user via `clerkId`
4. Query opted-in users:
   ```ts
   prismadb.users.findMany({
     where: {
       OR: [
         { UserNotificationSettings: { systemEmailEnabled: true } },
         { UserNotificationSettings: null },
       ],
       email: { not: null },
     },
     select: { id, email, firstName, lastName },
   })
   ```
5. Render `ChangelogNotification` per user via `@react-email/render`
6. Chunk into batches of 50, `resend.batch.send()` per chunk
7. Collect all Resend email IDs from responses
8. Create `ChangelogBroadcast` record
9. Update `ChangelogEntry`: set `lastNotifiedAt = now()`, increment `broadcastCount`
10. `logAdminAction(admin.clerkId, "SEND_CHANGELOG_NOTIFICATION", entryId, { recipientCount })`
11. Return `{ success, recipientCount, broadcastId }`

### `getChangelogBroadcasts(options?: { changelogEntryId?: string })` (in `changelog-actions.ts`)

- Returns broadcast history, optionally filtered by entry
- Includes `sentBy` (name), `recipientCount`, `sentAt`, email ID count
- Used by Newsletter dashboard Changelog Broadcasts tab

---

## UI Changes

### `ChangelogClient.tsx`

1. **Auto-notify on publish** — `handlePublish()` calls `sendChangelogNotification()` after `publishChangelogEntry()` succeeds:
   - Toast: `"Published! Notifying users..."` (loading)
   - Follow-up: `"Notified X users"` or error toast

2. **Manual "Notify Users" button** — `<Bell>` icon in the actions column for `PUBLISHED` entries:
   - `AlertDialog` confirmation: *"Send changelog notification for vX.X.X to all opted-in users? This entry has been sent N time(s) before."*
   - Per-row loading state (`isNotifying: string | null`)
   - Disabled during send

### `NewsletterClient.tsx` + `newsletter/page.tsx`

New **"Changelog Broadcasts"** third tab:

| Column | Source |
|--------|--------|
| Version | `changelogEntry.version` |
| Title | `changelogEntry.title` |
| Recipients | `broadcastCount` |
| Sent By | `sentBy.firstName + lastName` |
| Sent At | `sentAt` formatted |

- No live Resend analytics fetched on page load (avoids N API calls)
- Each row badge shows email count (`resendEmailIds.length`)
- "View in Resend" external link to `https://resend.com/emails` for detailed open/click stats

---

## Files to Create

| File | Purpose |
|------|---------|
| `emails/changelog/ChangelogNotification.tsx` | New email template |
| `prisma/migrations/[timestamp]_add_changelog_broadcasts/` | DB migration |

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ChangelogBroadcast` model + fields to `ChangelogEntry` |
| `actions/platform-admin/changelog-actions.ts` | Add `sendChangelogNotification` + `getChangelogBroadcasts` |
| `app/.../changelog/components/ChangelogClient.tsx` | Auto-notify on publish + Bell button |
| `app/.../newsletter/components/NewsletterClient.tsx` | Add Changelog Broadcasts tab |
| `app/.../newsletter/page.tsx` | Fetch broadcast data for new tab |

---

## Non-Goals

- No Resend contact sync / audience management
- No live open/click analytics fetched server-side (use Resend dashboard)
- No scheduled/delayed sends
- No per-user unsubscribe tracking in our DB (Resend handles this via `buildUnsubscribeUrl`)
