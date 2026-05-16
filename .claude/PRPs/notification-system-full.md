# PRP: Full Notification System — Email + In-App + Real-Time

**Date:** 2026-05-16  
**Branch target:** `feature/notification-system-complete`  
**Estimated scope:** 6 phases, ~20 tasks  
**Status:** Ready to implement

---

## Executive Summary

The notification infrastructure is ~60% complete. The database schema, service layer (`lib/notifications/`), email templates (42 React Email components), frontend bell/popover components, and Ably real-time backbone all exist. The critical gaps are:

1. **Wiring**: Most server actions never call the notification service
2. **Real-time delivery**: Ably only delivers messaging-specific events — the bell polls every 30s instead of receiving instant push
3. **Missing enum values**: REQUEST_*, SHOWING_*, DEAL_STAGE_CHANGED, COMMENT_ADDED_* are absent from `NotificationCategory`
4. **No delivery log**: Email sends have no deduplication or retry tracking
5. **No unsubscribe**: Email notifications lack a compliant unsubscribe mechanism

The goal of this implementation: every meaningful state change in the system triggers a notification, delivered instantly to in-app (via Ably push + SWR invalidation) and optionally via email (per user preferences), with full Greek/English localization.

---

## Current State Map

### ✅ Already Exists (do not rebuild)

| Component | Location | Notes |
|---|---|---|
| `Notification` DB model | `prisma/schema.prisma:506` | userId, orgId, type, read, entityType, entityId, actorId, metadata |
| `UserNotificationSettings` | `prisma/schema.prisma:818` | 14 boolean toggles (7 categories × email+in-app) |
| `NotificationCategory` enum | `prisma/schema.prisma:1390` | 41 types — but missing REQUEST_*, SHOWING_* |
| `NotificationEntityType` enum | `prisma/schema.prisma:1443` | 16 entity types |
| Core notification service | `lib/notifications/notification-service.ts` | createNotification, createBulkNotifications, notifyOrganization |
| Email service | `lib/notifications/email-service.ts` | 774 lines, preference-checking, multi-language |
| Notification helpers | `lib/notifications/helpers.ts` | 755 lines, per-domain convenience functions |
| 42 email templates | `emails/notifications/*.tsx` | React Email components |
| NotificationBell | `components/notifications/NotificationBell.tsx` | Badge, 30s polling |
| NotificationPopover | `components/notifications/NotificationPopover.tsx` | List, mark-as-read, navigation |
| SWR hooks | `hooks/swr/useNotifications.ts` | Full pagination, optimistic updates |
| Ably personal channel | `hooks/useAbly.ts:704` — `useAblyNotifications` | Only handles messaging mentions currently |
| Notification API | `app/api/notifications/route.ts` | GET/POST/PUT |
| Settings API | `app/api/user/notification-settings/route.ts` | GET/PUT |
| Notification preferences UI | Profile → NotificationsTab | 7 categories |
| Resend integration | `lib/resend.ts` | v6.9.4, from: noreply@mail.oikion.com |
| Ably channel structure | `lib/ably.ts` | `user:{userId}`, `org:{orgId}:*` patterns |

### ❌ Missing (must implement)

| Gap | Impact |
|---|---|
| Missing NotificationCategory enum values: REQUEST_*, SHOWING_*, DEAL_STAGE_CHANGED, COMMENT_ADDED_* | Cannot type-safely notify on these events |
| Missing NotificationDeliveryLog model | Cannot deduplicate emails, no retry, no bounce tracking |
| Missing unsubscribeToken on UserNotificationSettings | Non-compliant with CAN-SPAM/GDPR email rules |
| Ably not wired for general notification push | Bell updates only via 30s poll — not real-time |
| Deal actions not wired to notifications | No notification when deal stage changes |
| Request actions not wired | No notification on request create/assign/status change |
| Showing actions not wired | No notification on showing scheduled/confirmed/cancelled |
| Contact comment actions not wired | No notification on new comment |
| Property comment actions not wired | No notification on new comment |
| Archive bulk action not wired | No notification on bulk archive |
| Email unsubscribe endpoint | No way for users to unsubscribe from email link |
| org-level notification defaults | Cannot set org-wide quiet hours or defaults |

---

## Architecture Decision: Ably Push for Notifications

**Current state**: When a notification is created in DB, nothing happens in real-time. The bell polls `/api/notifications/counts` every 30 seconds.

**Target state**: When `createNotification()` is called, it ALSO publishes a slim Ably event to `user:{userId}` channel with event name `notification:new`. The `useAblyNotifications` hook on the client receives this and calls `mutate()` on the SWR notification keys — instant update, zero polling overhead.

**Why this approach**: Ably's `user:{userId}` personal channel already exists and is subscribed on every authenticated page. This is a 10-line change to `notification-service.ts` + a 5-line addition to `useAblyNotifications`. No new infrastructure needed.

**Slim payload on Ably** (no PII):
```typescript
{
  type: "notification:new",
  data: {
    notificationId: string,
    category: NotificationCategory,  // for client-side routing/badge color
    entityType: NotificationEntityType | null,
    entityId: string | null,
  }
}
```
The client receives this, increments the badge optimistically, then calls `mutate("/api/notifications")` to fetch full content.

---

## Phase 1: Schema Additions & Migration

**Goal**: Extend the schema with missing enum values, delivery log model, and unsubscribe support.

**Files to modify**:
- `prisma/schema.prisma`
- Create migration: `pnpm prisma migrate dev --name notification_system_complete`

### 1a. Add Missing NotificationCategory Enum Values

Add to the `NotificationCategory` enum (after existing values):

```prisma
// Requests (currently missing)
REQUEST_CREATED
REQUEST_ASSIGNED
REQUEST_STATUS_CHANGED

// Showings (currently missing)
SHOWING_SCHEDULED
SHOWING_CONFIRMED
SHOWING_CANCELLED
SHOWING_COMPLETED
SHOWING_NO_SHOW

// Deal stage (explicit, currently only DEAL_UPDATED exists)
DEAL_STAGE_CHANGED

// Comments (currently missing — no per-entity comment notifications)
COMMENT_ADDED_PROPERTY
COMMENT_ADDED_CONTACT
COMMENT_ADDED_REQUEST
COMMENT_ADDED_DEAL

// Bulk operations
BULK_ARCHIVE_COMPLETED
```

**Migration note**: Adding values to a PostgreSQL enum requires a non-transactional migration (same pattern used for ItemVisibility). Use `ADD VALUE` statements outside of a transaction block.

### 1b. Add NotificationDeliveryLog Model

```prisma
model NotificationDeliveryLog {
  id             String         @id @default(cuid())
  notificationId String?        // FK to Notification (nullable — emails can be sent without in-app notification)
  channel        DeliveryChannel
  recipient      String         // email address or userId
  status         DeliveryStatus @default(PENDING)
  attempts       Int            @default(0)
  lastAttemptAt  DateTime?
  nextRetryAt    DateTime?
  externalId     String?        // Resend message ID for deduplication
  error          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  Notification   Notification?  @relation(fields: [notificationId], references: [id], onDelete: SetNull)

  @@index([notificationId])
  @@index([channel, status])
  @@index([recipient, channel, createdAt])
}

enum DeliveryChannel {
  EMAIL
  IN_APP
  ABLY_PUSH
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
  BOUNCED
  DELIVERED
}
```

Also add back-relation on `Notification`:
```prisma
deliveryLogs NotificationDeliveryLog[]
```

### 1c. Add Fields to UserNotificationSettings

```prisma
// Add to UserNotificationSettings model:
unsubscribeToken  String?   @unique  // for email unsubscribe links
quietHoursStart   Int?      // 0-23, hour to start DND (null = no DND)
quietHoursEnd     Int?      // 0-23, hour to end DND
notificationDigest DigestFrequency @default(INSTANT)

enum DigestFrequency {
  INSTANT
  DAILY_DIGEST
  WEEKLY_DIGEST
}
```

---

## Phase 2: Real-Time Ably Notification Push

**Goal**: Every `createNotification()` call also publishes to `user:{userId}` Ably channel for instant bell update.

**Files to modify**:
- `lib/notifications/notification-service.ts`
- `hooks/useAbly.ts` (extend `useAblyNotifications`)
- `hooks/swr/useNotifications.ts` (adjust to invalidate on Ably push)

### 2a. Extend `notification-service.ts` — Auto Ably Publish

After successfully inserting the notification into the DB, call `publishToChannel()`:

```typescript
// At the end of createNotification(), after prismadb.notification.create():
import { publishToChannel } from "@/lib/ably";

await publishToChannel(`user:${input.userId}`, "notification:new", {
  notificationId: notification.id,
  category: notification.type,
  entityType: notification.entityType ?? null,
  entityId: notification.entityId ?? null,
});
```

**Important**: This must be fire-and-forget (do not throw if Ably fails — the in-app notification is still persisted). Wrap in try/catch that only logs.

For `createBulkNotifications()`, iterate and publish to each recipient's channel.

### 2b. Extend `useAblyNotifications` in `hooks/useAbly.ts`

The hook currently handles `mention`, `conversation:created`, `message:new`. Add:

```typescript
channel.subscribe("notification:new", (msg) => {
  const { notificationId, category } = msg.data;
  // Immediately invalidate notification SWR keys
  mutate((key) => typeof key === "string" && key.startsWith("/api/notifications"), undefined, { revalidate: true });
  // Optional: show a toast for high-priority categories
  if (P0_CATEGORIES.includes(category)) {
    toast.info("You have a new notification"); // translate via useAppToast
  }
});
```

The `P0_CATEGORIES` constant (defined in `lib/notifications/constants.ts`):
```typescript
export const P0_CATEGORIES: NotificationCategory[] = [
  "DEAL_STAGE_CHANGED",
  "SHOWING_SCHEDULED",
  "SHOWING_CANCELLED",
  "REQUEST_ASSIGNED",
  "CALENDAR_EVENT_INVITED",
];
```

### 2c. Reduce SWR Polling Interval

Now that Ably handles instant updates, reduce polling from 30s to 120s as a safety fallback only:

- `hooks/swr/useNotifications.ts`: change `refreshInterval: 30000` → `120000`
- `hooks/swr/useNotificationCounts.ts`: same change

---

## Phase 3: Deal Action Wiring

**Goal**: All deal stage changes, creations, and party assignments trigger notifications.

**Files to modify**:
- `actions/deals/index.ts`
- `lib/notifications/helpers.ts` (add `notifyDealStageChanged`)

### 3a. Add `notifyDealStageChanged` to helpers.ts

```typescript
export async function notifyDealStageChanged(payload: {
  dealId: string;
  dealTitle: string;
  fromStage: DealStage;
  toStage: DealStage;
  organizationId: string;
  actorId: string;
  actorName: string;
  listingAgentId?: string | null;
  buyerAgentId?: string | null;
  dealPartyUserIds?: string[]; // all user IDs connected to this deal
}): Promise<void>
```

Recipients: `listingAgentId`, `buyerAgentId`, any `dealPartyUserIds` — excluding `actorId` (the person who made the change).

Preference category: `deals`.

Email template: `emails/notifications/DealStatusChanged.tsx` (already exists, adapt for stage change).

### 3b. Wire `advanceDealStage()` and `setDealStage()` in `actions/deals/index.ts`

After the DB update and `DealStageLog` creation:

```typescript
await notifyDealStageChanged({
  dealId: deal.id,
  dealTitle: deal.title ?? deal.friendlyId,
  fromStage: previousStage,
  toStage: newStage,
  organizationId,
  actorId: currentUserId,
  actorName: currentUserName,
  listingAgentId: deal.listingAgentId,
  buyerAgentId: deal.buyerAgentId,
});
```

### 3c. Wire `createDeal()` in `actions/deals/index.ts`

Use the existing `notifyDealProposed()` helper (already in helpers.ts). Just call it after the deal is created.

### 3d. Wire `addDealParty()` in `actions/deals/index.ts`

Notify the newly added party that they've been linked to a deal. Use `DEAL_UPDATED` category (or add a new `DEAL_PARTY_ADDED` if desired).

---

## Phase 4: Request, Showing, and Comment Wiring

**Goal**: Requests and showings emit notifications; comments on entities notify the entity owner and assignee.

**Files to modify**:
- `actions/requests/create-request.ts`
- `actions/requests/update-request.ts`
- `actions/showings/*` (whichever actions manage showing state)
- `app/api/crm/contacts/[contactId]/comments/route.ts` (or equivalent)
- `app/api/mls/properties/[propertyId]/comments/route.ts` (or equivalent)
- `lib/notifications/helpers.ts` (add new helpers for requests, showings, comments)

### 4a. Add Helpers for Requests

```typescript
// lib/notifications/helpers.ts

export async function notifyRequestCreated(payload: {
  requestId: string;
  requestFriendlyId: string;
  requestType: "BUY" | "RENT";
  organizationId: string;
  actorId: string;
  actorName: string;
  assignedAgentId?: string | null;
}): Promise<void>
// → Notify org (via notifyOrganization, exclude actor)
// → If assignedAgentId != actorId, send REQUEST_ASSIGNED to assignee
// Category: crm

export async function notifyRequestStatusChanged(payload: {
  requestId: string;
  requestFriendlyId: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  organizationId: string;
  actorId: string;
  actorName: string;
  assignedAgentId?: string | null;
}): Promise<void>
// → Notify assignedAgentId (if != actorId) and org admins
// Category: crm

export async function notifyRequestAssigned(payload: {
  requestId: string;
  requestFriendlyId: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  newAssigneeId: string;
  previousAssigneeId?: string | null;
}): Promise<void>
// → Notify newAssigneeId (REQUEST_ASSIGNED)
// → Notify previousAssigneeId (REQUEST_STATUS_CHANGED) if reassignment
// Category: crm
```

### 4b. Add Helpers for Showings

```typescript
export async function notifyShowingScheduled(payload: {
  showingId: string;
  propertyName: string;
  scheduledAt: Date;
  contactName: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  agentId?: string | null; // the showing agent
}): Promise<void>

export async function notifyShowingStatusChanged(payload: {
  showingId: string;
  propertyName: string;
  toStatus: ShowingStatus;
  scheduledAt: Date;
  organizationId: string;
  actorId: string;
  actorName: string;
  agentId?: string | null;
  primaryContactId?: string | null;
}): Promise<void>
// Category: calendar
```

### 4c. Add Helper for Entity Comments

```typescript
export async function notifyCommentAdded(payload: {
  entityType: "PROPERTY" | "CONTACT" | "REQUEST" | "DEAL";
  entityId: string;
  entityName: string;
  commentId: string;
  commentContent: string; // truncated to 100 chars for preview
  organizationId: string;
  actorId: string;
  actorName: string;
  entityAssigneeId?: string | null; // the assigned agent
  entityOwnerId?: string | null; // the creator of the entity
  watcherIds?: string[]; // watchers array
}): Promise<void>
// → Notify assignee, owner, and watchers (excluding actor)
// → Use COMMENT_ADDED_PROPERTY / COMMENT_ADDED_CONTACT / etc. based on entityType
// Category: crm (for entity comments) or social (if applicable)
```

### 4d. Wire Actions

In `actions/requests/create-request.ts`:
```typescript
await notifyRequestCreated({ ... });
```

In `actions/requests/update-request.ts`:
- If status changed: `await notifyRequestStatusChanged({ ... })`
- If assignedAgentId changed: `await notifyRequestAssigned({ ... })`

In showing create/update actions:
- On create: `await notifyShowingScheduled({ ... })`
- On status change: `await notifyShowingStatusChanged({ ... })`

In comment POST handlers (API routes or server actions):
```typescript
await notifyCommentAdded({ ... });
```

---

## Phase 5: Email Unsubscribe & Delivery Log

**Goal**: CAN-SPAM/GDPR compliant email unsubscribe, deduplication, and delivery tracking.

**Files to create/modify**:
- `app/api/notifications/unsubscribe/route.ts` (new)
- `lib/notifications/email-service.ts` (add delivery log writes)
- `actions/notifications/unsubscribe.ts` (new)

### 5a. Unsubscribe Token Generation

When `UserNotificationSettings` is first created (upserted), generate and store a cryptographically random `unsubscribeToken`:

```typescript
import { randomBytes } from "crypto";

const unsubscribeToken = randomBytes(32).toString("hex");
```

### 5b. Unsubscribe Endpoint

`GET /api/notifications/unsubscribe?token={token}&category={category}`

- Validates token against `UserNotificationSettings.unsubscribeToken`
- If `category` is provided, disables only that email category
- If no `category`, shows a simple page with toggles to manage all email preferences
- Returns a static confirmation page (no auth required — token-based)

```typescript
// app/api/notifications/unsubscribe/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const category = searchParams.get("category");

  const settings = await prismadb.userNotificationSettings.findUnique({
    where: { unsubscribeToken: token },
  });

  if (!settings) return redirect("/unsubscribe/invalid");

  if (category) {
    // Disable specific category email
    const field = categoryToEmailField(category);
    if (field) {
      await prismadb.userNotificationSettings.update({
        where: { id: settings.id },
        data: { [field]: false },
      });
    }
    return redirect("/unsubscribe/success");
  }

  return redirect(`/app/profile/notifications?token=${token}`);
}
```

### 5c. Add Unsubscribe Link to Emails

In `lib/notifications/email-service.ts`, when building email data, always include:

```typescript
const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/unsubscribe?token=${settings.unsubscribeToken}&category=${categoryKey}`;
```

Pass to all React Email templates as a prop. The `BaseLayout.tsx` component should render the unsubscribe link in the footer.

### 5d. Delivery Log Integration

In `lib/notifications/email-service.ts`, wrap each `resend.emails.send()` call:

```typescript
const log = await prismadb.notificationDeliveryLog.create({
  data: {
    notificationId: notificationId ?? null,
    channel: "EMAIL",
    recipient: userEmail,
    status: "PENDING",
  },
});

try {
  const result = await resend.emails.send({ ... });
  await prismadb.notificationDeliveryLog.update({
    where: { id: log.id },
    data: { status: "SENT", externalId: result.data?.id, lastAttemptAt: new Date(), attempts: 1 },
  });
} catch (err) {
  await prismadb.notificationDeliveryLog.update({
    where: { id: log.id },
    data: { status: "FAILED", error: String(err), attempts: 1 },
  });
  console.error("[EMAIL_SERVICE]", err);
}
```

**Deduplication check** (before sending): Query `NotificationDeliveryLog` for a recent successful send to the same recipient for the same `notificationId`. Skip if found within 5 minutes.

---

## Phase 6: Localization & Email Template Gaps

**Goal**: Fill translation gaps and ensure all notification types have proper Greek/English copy.

**Files to modify**:
- `locales/en/notifications.json`
- `locales/el/notifications.json`
- `lib/notifications/email-service.ts` (subject lines for new categories)
- `emails/notifications/*.tsx` (new templates where missing)

### 6a. Add Missing Translation Keys

The current `notifications.json` has only 11 keys (UI strings). Add:

```json
{
  "types": {
    "REQUEST_CREATED": "New request created",
    "REQUEST_ASSIGNED": "Request assigned to you",
    "REQUEST_STATUS_CHANGED": "Request status changed",
    "SHOWING_SCHEDULED": "New showing scheduled",
    "SHOWING_CONFIRMED": "Showing confirmed",
    "SHOWING_CANCELLED": "Showing cancelled",
    "SHOWING_COMPLETED": "Showing completed",
    "DEAL_STAGE_CHANGED": "Deal stage updated",
    "COMMENT_ADDED_PROPERTY": "New comment on property",
    "COMMENT_ADDED_CONTACT": "New comment on contact",
    "COMMENT_ADDED_REQUEST": "New comment on request",
    "BULK_ARCHIVE_COMPLETED": "Bulk archive completed"
  },
  "descriptions": {
    "REQUEST_CREATED": "{actorName} created a new {requestType} request",
    "REQUEST_STATUS_CHANGED": "Request status changed from {fromStatus} to {toStatus}",
    "DEAL_STAGE_CHANGED": "Deal moved to {toStage}",
    "SHOWING_SCHEDULED": "Showing scheduled for {propertyName} on {date}"
  }
}
```

Mirror all keys in `locales/el/notifications.json` with Greek translations.

### 6b. Add Missing Email Subject Lines

In `lib/notifications/email-service.ts`, add subject line cases for all new categories to the existing subject line switch statement (covering en + el).

### 6c. Create Missing Email Templates

Required new templates (in `emails/notifications/`):
- `RequestCreated.tsx`
- `RequestStatusChanged.tsx`
- `ShowingScheduled.tsx`
- `ShowingStatusChanged.tsx`
- `CommentAdded.tsx` (generic, adaptable for property/contact/request)
- `DealStageChanged.tsx` (the existing `DealStatusChanged.tsx` covers deals but may need a dedicated stage-change variant)

All templates must follow the existing pattern: import `BaseLayout.tsx`, accept `recipientName`, `actorName`, `entityId`, `metadata`, `unsubscribeUrl` props.

---

## Phase 7: Org-Level Notification Defaults (Optional / Phase 2)

**Goal**: Org admins can set org-wide defaults that pre-populate `UserNotificationSettings` for new members.

**Files to create**:
- Add `notificationDefaults` (JSON) field to `OrganizationSettings` model
- `app/[locale]/app/(routes)/settings/notifications/page.tsx` (new org settings page)
- `actions/settings/update-org-notification-defaults.ts` (new)

**Behavior**: When a new `UserNotificationSettings` row is upserted (first time), check if org has defaults and apply them. If the org default for `dealsEmailEnabled` is `false`, the new user starts with email off for deals.

This is a lower priority than Phases 1–6. Defer unless specifically requested.

---

## Testing Checklist

For each phase, verify:

### Phase 1 (Schema)
- [ ] Migration applies cleanly in dev (`pnpm db:migrate`)
- [ ] Migration applies cleanly in prod dry-run (`pnpm db:deploy --dry-run`)
- [ ] New enum values appear in Prisma client after `pnpm prisma generate`
- [ ] `NotificationDeliveryLog` table created with correct FK constraints
- [ ] `unsubscribeToken` field exists and has `@unique` index

### Phase 2 (Ably Push)
- [ ] Create a notification in dev and verify Ably event fires (can check with Ably dashboard)
- [ ] NotificationBell badge updates within 2s of notification creation (not after 30s poll)
- [ ] Ably failure does NOT break notification creation (fire-and-forget)
- [ ] P0 categories show a toast popup; others do not

### Phase 3 (Deals)
- [ ] Advancing a deal stage notifies both listingAgentId and buyerAgentId
- [ ] The actor (who advanced the stage) does NOT receive a self-notification
- [ ] Creating a deal sends DEAL_PROPOSED notification
- [ ] Email is only sent if `dealsEmailEnabled = true` in recipient's settings

### Phase 4 (Requests, Showings, Comments)
- [ ] Creating a request notifies org + assignee
- [ ] Changing request status notifies assignee
- [ ] Scheduling a showing notifies the showing agent and the property's assigned agent
- [ ] Adding a comment on a property notifies the assignee (not the commenter)
- [ ] Comment notification includes truncated preview text in metadata

### Phase 5 (Unsubscribe)
- [ ] Email footer contains unsubscribe link with valid token
- [ ] Clicking unsubscribe link disables the correct category's email toggle
- [ ] Invalid/expired token returns a non-200 page (not an error crash)
- [ ] Delivery log row created for every email attempt (sent AND failed)

### Phase 6 (Localization)
- [ ] Greek locale: all new notification types have Greek copy
- [ ] English locale: same
- [ ] New email templates render without missing prop errors
- [ ] Subject lines display correctly in Resend test sends

---

## Key Files Reference

### Existing (read before modifying)

| File | Purpose |
|---|---|
| `lib/notifications/notification-service.ts` | `createNotification()`, `createBulkNotifications()`, `notifyOrganization()` |
| `lib/notifications/email-service.ts` | `sendNotificationEmail()`, `isEmailEnabledForCategory()` |
| `lib/notifications/helpers.ts` | `notifyContactCreated()`, `notifyDealProposed()`, `notifyPostLiked()` etc. |
| `lib/notifications/types.ts` | All payload TypeScript interfaces |
| `lib/ably.ts` | `publishToChannel()`, `createAblyTokenRequest()` |
| `hooks/useAbly.ts:704` | `useAblyNotifications` — extend this |
| `hooks/swr/useNotifications.ts` | `useNotifications()`, `useMarkNotificationRead()` |
| `actions/deals/index.ts` | Deal stage transitions — wire notifications here |
| `actions/requests/create-request.ts` | Wire notifyRequestCreated here |
| `actions/requests/update-request.ts` | Wire notifyRequestStatusChanged here |
| `emails/notifications/BaseLayout.tsx` | Shared layout — add unsubscribeUrl prop |
| `prisma/schema.prisma` | Schema — must edit for Phase 1 |

### To Create

| File | Purpose |
|---|---|
| `app/api/notifications/unsubscribe/route.ts` | Token-based unsubscribe endpoint |
| `emails/notifications/RequestCreated.tsx` | Email template |
| `emails/notifications/RequestStatusChanged.tsx` | Email template |
| `emails/notifications/ShowingScheduled.tsx` | Email template |
| `emails/notifications/ShowingStatusChanged.tsx` | Email template |
| `emails/notifications/CommentAdded.tsx` | Email template |
| `emails/notifications/DealStageChanged.tsx` | Email template |
| `lib/notifications/constants.ts` | P0_CATEGORIES, categoryToEmailField(), etc. |

---

## Implementation Order

Execute in this exact order (each phase depends on the previous):

1. **Phase 1** — Schema + migration (foundation for everything)
2. **Phase 2** — Ably real-time push (enables instant bell updates)
3. **Phase 3** — Deal wiring (highest business value, P0)
4. **Phase 4** — Request + Showing + Comment wiring (P0/P1)
5. **Phase 5** — Email unsubscribe + delivery log (compliance + reliability)
6. **Phase 6** — Localization + missing templates (completeness)
7. **Phase 7** — Org-level defaults (optional enhancement)

---

## Technical Constraints & Notes

- **Multi-tenant isolation**: Every `createNotification()` call MUST include `organizationId`. Never send notifications across tenant boundaries.
- **No self-notifications**: All helpers should exclude `actorId` from recipients. Check before every `createNotification()` call.
- **Fire-and-forget Ably**: Wrap Ably `publishToChannel()` in try/catch — never let Ably failure prevent DB notification creation.
- **Preference checking**: Always call `isEmailEnabledForCategory()` from `email-service.ts` before sending email. Never bypass this check.
- **Greek text length**: All notification titles and messages must be tested in Greek (runs ~30% longer). Keep titles under 60 chars in English (leaves room for Greek expansion).
- **Prisma named export**: Always use `import { prismadb } from "@/lib/prisma"` — not default export.
- **Async auth**: `await auth()` in Clerk v6 — all auth calls in server actions must be awaited.
- **Enum migration**: Adding values to PostgreSQL enums requires non-transactional SQL (`ALTER TYPE ... ADD VALUE`). Use the pattern from the existing `ItemVisibility` migration (`20260313180050_add_hidden_to_item_visibility`).
- **Redis cache invalidation**: `notification-service.ts` uses Redis key `oik:notif:{orgId}:{userId}`. After creating a notification, invalidate this key. The existing service already does this — do not bypass it.

---

## Acceptance Criteria

The notification system is complete when:

1. A deal advancing from NEGOTIATION → PRELIMINARY_AGREEMENT sends an in-app notification to both agents within 2 seconds, with no page refresh
2. The notification bell badge increments instantly (Ably push), not after a 30s poll
3. Clicking the notification navigates to the correct entity (deal, request, showing, etc.)
4. The email notification for that deal stage change arrives in the recipient's inbox within 60 seconds IF their `dealsEmailEnabled = true`
5. A user receiving the email can click "Unsubscribe from deal notifications" and it immediately disables that category — without requiring login
6. All notification copy renders correctly in Greek (`el` locale)
7. No self-notifications (the person who advanced the deal does not get a notification about their own action)
8. A user with `dealsEmailEnabled = false` receives the in-app notification but NOT the email