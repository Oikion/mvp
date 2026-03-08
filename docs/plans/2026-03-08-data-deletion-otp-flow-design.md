# Data Deletion OTP Flow — Design Document

**Date:** 2026-03-08
**Status:** Approved

---

## Overview

Replace the current manual admin-gated deletion request form with an OTP-verified, automatically scheduled deletion flow. Admins retain a veto window. Platform admins receive both email and in-sidebar badge notifications for new deletion requests and new feedback submissions.

---

## Goals

1. OTP verification prevents accidental/malicious deletion requests
2. 1-week grace period with automated execution via daily cron
3. 3-day reminder email sent automatically
4. Admin approval gate retained but modular (toggleable via env var)
5. Platform admins notified in-app (sidebar badge counts) and by email for both deletion requests and feedback

---

## User Flow

```
User: "Request Data Deletion"
  → Server generates 8-digit numeric OTP (random, hashed with bcrypt)
  → Creates DataDeletionRequest { status: PENDING_VERIFICATION, gracePeriodEndsAt: null }
  → Email: "Enter this code to confirm your deletion request" (15-min TTL)

User enters OTP in app:
  → Validate OTP (timing-safe, hash comparison)
  → status → PENDING
  → gracePeriodEndsAt = verifiedAt + 7 days
  → Email to user: "Deletion confirmed. Executes on {date}. You can cancel until then."
  → Email to PLATFORM_ADMIN_EMAILS: "New deletion request from {user}"
  → Platform admin sidebar badge count refreshes

Admin reviews in /platform-admin/data-requests:
  → Approves: status → APPROVED (deletion will execute at gracePeriodEndsAt)
  → Rejects: status → REJECTED, email to user, flow ends

Daily cron (08:00 UTC) — /api/cron/reminders extended:
  → 3-day reminder: gracePeriodEndsAt - 3 days ≤ today AND reminderSentAt IS NULL
      → Send reminder email, set reminderSentAt = now
  → Execution: status = APPROVED AND gracePeriodEndsAt ≤ now
      → Call existing executeDataDeletion() logic inline (no admin auth needed in cron)

User can cancel anytime while status = PENDING (before admin approval):
  → status → CANCELLED
  → Confirmation email to user
```

---

## Admin Gate (Modular)

The cron checks `DELETION_REQUIRE_ADMIN_APPROVAL` env var:

```ts
const requireApproval = process.env.DELETION_REQUIRE_ADMIN_APPROVAL !== "false";
const eligibleStatuses = requireApproval ? ["APPROVED"] : ["APPROVED", "PENDING"];
```

Default: `true` (gate enabled). Set to `"false"` to make deletion fully automatic after OTP confirmation.

---

## In-App Admin Notifications (Sidebar Badge Counts)

The existing `Notification` model is org-scoped and not suitable for platform-level alerts. Instead:

- New server action `getPlatformAdminCounts()` returns `{ pendingDeletions: number, pendingFeedback: number }`
- Platform admin layout fetches this count and passes it to `PlatformAdminSidebar`
- Sidebar renders badge numbers next to "Data Requests" and "Feedback" nav items
- No schema change required

---

## Email Notifications to Platform Admins

Existing pattern from `request-data-deletion.ts` (email to `PLATFORM_ADMIN_EMAILS`) is extracted into a shared `lib/admin-notify.ts` utility and called from:

- Data deletion OTP verification (existing: confirmation step)
- Feedback submission (`app/api/feedback/route.ts` — currently missing)

---

## Schema Changes

### `DataDeletionStatus` enum (additive)
```prisma
enum DataDeletionStatus {
  PENDING_VERIFICATION  // NEW: before OTP confirmed
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}
```

### `DataDeletionRequest` model additions
```prisma
verificationCode          String?    // bcrypt hash of 8-digit OTP
verificationCodeExpiresAt DateTime?  // 15 minutes from request creation
verifiedAt                DateTime?  // timestamp when OTP confirmed
reminderSentAt            DateTime?  // set when 3-day reminder email is sent
```

`gracePeriodEndsAt` changes from required to optional (`DateTime?`) — it is `null` until OTP is confirmed, then set to `verifiedAt + 7 days`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `lib/admin-notify.ts` | Shared utility: email platform admins by env list |
| `actions/platform-admin/get-admin-counts.ts` | Server action: `{ pendingDeletions, pendingFeedback }` |
| `emails/data-control/DeletionOtpEmail.tsx` | OTP email template |
| `emails/data-control/DeletionReminderEmail.tsx` | 3-day reminder email template |
| `prisma/migrations/YYYYMMDD_deletion_otp_fields/` | Migration for new fields + enum value |

---

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 4 fields to `DataDeletionRequest`, add `PENDING_VERIFICATION` to enum |
| `actions/data-deletion/request-data-deletion.ts` | Refactor: `initiateDeletionRequest` (→ PENDING_VERIFICATION + OTP email), `verifyDeletionOtp` (→ PENDING), keep `cancelDataDeletion`, keep `getDataDeletionStatus` |
| `app/api/cron/reminders/route.ts` | Add deletion reminder + execution processing block |
| `app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx` | Accept `counts` prop, render badges on Feedback and Data Requests items |
| `app/[locale]/app/(routes)/profile/components/DataControlTab.tsx` | Replace deletion form with 2-step: initiate → OTP entry |
| `app/api/feedback/route.ts` | Call `notifyAdminsByEmail` after feedback saved |
| `actions/platform-admin/manage-data-requests.ts` | Remove `sendDecisionEmail` inline, use `lib/admin-notify.ts` |

---

## What Is NOT Changed

- `executeDataDeletion()` — core deletion logic is untouched; cron calls it directly
- `reviewDataDeletion()` — admin approve/reject action unchanged
- Platform admin data-requests UI components (`DataRequestActionDialog`, `DataRequestsDataTable`, `DataRequestsMetrics`) — unchanged
- All existing email templates (`DeletionRequestConfirmation`, `DeletionRequestDecision`, `DeletionRequestAdminNotification`)
- The 30-day grace period is replaced by 7 days only for the new OTP-verified path

---

## Security Notes

- OTP stored as bcrypt hash (cost 10) — not plaintext
- OTP comparison uses timing-safe hash comparison (`bcrypt.compare`)
- OTP expires in 15 minutes
- Max 3 OTP attempts before request is invalidated (prevents brute force on 8-digit code)
- Cron endpoint uses existing `CRON_SECRET` bearer token auth (timing-safe)

---

## Out of Scope

- SMS/TOTP OTP delivery (email only for now)
- Automatic org deletion for multi-org owners (UI warns; user must transfer ownership first)
- Blob file cleanup from Vercel Blob on deletion (file URLs are already nulled in DB on expiry)
