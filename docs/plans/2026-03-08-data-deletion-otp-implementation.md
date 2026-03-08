# Data Deletion OTP Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the manual deletion request form with an OTP-verified, auto-scheduled deletion that notifies platform admins via email and sidebar badge counts.

**Architecture:** 8-digit OTP confirms intent → 7-day grace period with daily cron execution → admin can veto at any point → platform admin layout fetches live badge counts for sidebar; no new notification model needed.

**Tech Stack:** Next.js 16, Prisma + PostgreSQL, bcryptjs (already installed), Resend/react-email, Vercel cron (existing `/api/cron/reminders`), shadcn/ui.

**Design doc:** `docs/plans/2026-03-08-data-deletion-otp-flow-design.md`

---

## Pre-Flight: Read These First

- `prisma/schema.prisma` lines 2936–2962 — `DataDeletionStatus` enum + `DataDeletionRequest` model
- `actions/data-deletion/request-data-deletion.ts` — current flow being replaced
- `actions/platform-admin/manage-data-requests.ts` — `executeDataDeletion()` (core logic to extract)
- `app/api/cron/reminders/route.ts` — cron pattern to follow
- `app/[locale]/app/(platform_admin)/layout.tsx` — where to add `getPlatformAdminCounts()`
- `emails/data-control/DeletionRequestConfirmation.tsx` — email template pattern to copy

---

## Task 1: Database Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/` (auto-generated)

### Step 1: Edit the schema

In `prisma/schema.prisma`, make these changes:

**a) Add `PENDING_VERIFICATION` to the enum (line ~2936):**
```prisma
enum DataDeletionStatus {
  PENDING_VERIFICATION  // ← ADD this as first value
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}
```

**b) Update `DataDeletionRequest` model — make `gracePeriodEndsAt` optional and add 4 new fields (line ~2945):**
```prisma
model DataDeletionRequest {
  id                        String              @id @default(cuid())
  organizationId            String
  requestedById             String
  reason                    String?
  status                    DataDeletionStatus  @default(PENDING_VERIFICATION)
  reviewedById              String?
  reviewedAt                DateTime?
  reviewNote                String?
  gracePeriodEndsAt         DateTime?           // ← was required, now optional
  executedAt                DateTime?
  // NEW FIELDS:
  verificationCode          String?             // bcrypt hash of 8-digit OTP
  verificationCodeExpiresAt DateTime?           // 15 min TTL
  verifiedAt                DateTime?           // when OTP was confirmed
  reminderSentAt            DateTime?           // when 3-day reminder was sent
  createdAt                 DateTime            @default(now())
  updatedAt                 DateTime            @updatedAt

  @@index([organizationId])
  @@index([requestedById])
  @@index([status])
}
```

### Step 2: Generate and apply migration

```bash
pnpm db:migrate
# When prompted for migration name, enter: deletion_otp_fields
```

Expected output: `Your database is now in sync with your schema.`

### Step 3: Regenerate Prisma client

```bash
pnpm prisma generate
```

### Step 4: Verify

```bash
pnpm prisma studio
# Open DataDeletionRequest table — confirm new columns exist
```

### Step 5: Commit

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add OTP fields and PENDING_VERIFICATION status to DataDeletionRequest"
```

---

## Task 2: Create `lib/admin-notify.ts`

Extract admin email notification into a shared utility (currently duplicated in `request-data-deletion.ts`).

**Files:**
- Create: `lib/admin-notify.ts`

### Step 1: Create the file

```typescript
/**
 * lib/admin-notify.ts
 *
 * Shared utility for notifying platform admins by email.
 * Called from: data deletion OTP verification, feedback submissions.
 *
 * To add in-app notifications in the future:
 * query `users` by PLATFORM_ADMIN_EMAILS, find their org IDs, call createNotification().
 */

import resendHelper from "@/lib/resend";

/**
 * Send an email to all addresses listed in PLATFORM_ADMIN_EMAILS.
 * Silently no-ops if the env var is not set.
 */
export async function notifyAdminsByEmail(params: {
  subject: string;
  html: string;
}): Promise<void> {
  const rawEmails = process.env.PLATFORM_ADMIN_EMAILS;
  if (!rawEmails) return;

  const adminEmails = rawEmails
    .replace(/"/g, "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  try {
    const resend = await resendHelper();
    await Promise.all(
      adminEmails.map((to) =>
        resend.emails.send({
          from: "Oikion <noreply@oikion.app>",
          to,
          subject: params.subject,
          html: params.html,
        })
      )
    );
  } catch (error) {
    // Log but never throw — admin notification failure must not block user actions
    console.error("[ADMIN_NOTIFY] Failed to send admin email:", error);
  }
}
```

### Step 2: Verify TypeScript compiles

```bash
pnpm tsc --noEmit 2>&1 | grep admin-notify
# Expected: no output (no errors)
```

### Step 3: Commit

```bash
git add lib/admin-notify.ts
git commit -m "feat: add shared notifyAdminsByEmail utility"
```

---

## Task 3: Create OTP email template

**Files:**
- Create: `emails/data-control/DeletionOtpEmail.tsx`

Model after the existing `DeletionRequestConfirmation.tsx` template. Use the same `BaseLayout`, `EmailHeader`, etc. imports.

### Step 1: Create the file

```tsx
// emails/data-control/DeletionOtpEmail.tsx
import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailGreeting,
  EmailText,
  EmailHighlightBox,
} from "../components/BaseLayout";

interface DeletionOtpEmailProps {
  userName: string;
  otpCode: string;
  expiresInMinutes: number;
}

export const DeletionOtpEmail = ({
  userName = "User",
  otpCode,
  expiresInMinutes = 15,
}: DeletionOtpEmailProps) => {
  return (
    <BaseLayout
      previewText={`Your data deletion confirmation code: ${otpCode}`}
      footerText="This is an automated security notification from Oikion."
      footerNote="If you didn't request this, you can safely ignore this email. No action will be taken without this code."
    >
      <EmailHeader
        title="Confirm Data Deletion"
        subtitle="Enter this code to confirm your request"
        iconType="warning"
      />
      <EmailGreeting name={userName} />
      <EmailText>
        You requested to delete your organization&apos;s data. Enter the code
        below in the app to confirm. This code expires in {expiresInMinutes}{" "}
        minutes.
      </EmailText>
      <EmailHighlightBox>
        <div
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            letterSpacing: "8px",
            textAlign: "center",
            fontFamily: "monospace",
            color: "#dc2626",
          }}
        >
          {otpCode}
        </div>
      </EmailHighlightBox>
      <EmailText>
        If you did not request this, please contact support immediately. Your
        data will not be deleted unless you enter this code.
      </EmailText>
    </BaseLayout>
  );
};

export default DeletionOtpEmail;
```

> **Note:** Check `emails/components/BaseLayout.tsx` to confirm `EmailHighlightBox` is exported. If not, use a `<Section>` with inline styles matching the pattern in `DeletionRequestConfirmation.tsx`.

### Step 2: Commit

```bash
git add emails/data-control/DeletionOtpEmail.tsx
git commit -m "feat(email): add DeletionOtpEmail template"
```

---

## Task 4: Create 3-day reminder email template

**Files:**
- Create: `emails/data-control/DeletionReminderEmail.tsx`

### Step 1: Create the file

```tsx
// emails/data-control/DeletionReminderEmail.tsx
import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailGreeting,
  EmailText,
  EmailDetailsCard,
  EmailDetailRow,
  EmailCTAButton,
  baseUrl,
} from "../components/BaseLayout";

interface DeletionReminderEmailProps {
  userName: string;
  deletionDate: string; // ISO string
  requestId: string;
  canCancel: boolean;
}

export const DeletionReminderEmail = ({
  userName = "User",
  deletionDate,
  requestId,
  canCancel,
}: DeletionReminderEmailProps) => {
  const formattedDate = new Date(deletionDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <BaseLayout
      previewText="Reminder: Your data will be deleted in 3 days"
      footerText="This is an automated reminder from Oikion."
      footerNote={`Request ID: ${requestId}`}
    >
      <EmailHeader
        title="Data Deletion Reminder"
        subtitle="Your data deletion is scheduled"
        iconType="warning"
      />
      <EmailGreeting name={userName} />
      <EmailText>
        This is a reminder that your organization&apos;s data is scheduled to
        be permanently deleted in <strong>3 days</strong>.
      </EmailText>
      <EmailDetailsCard>
        <EmailDetailRow label="Scheduled deletion date" value={formattedDate} />
        <EmailDetailRow label="Request ID" value={requestId} />
      </EmailDetailsCard>
      {canCancel && (
        <>
          <EmailText>
            If you have changed your mind, you can cancel this request from your
            profile settings before the deletion date.
          </EmailText>
          <EmailCTAButton href={`${baseUrl}/app/profile?tab=data-control`}>
            Cancel Deletion Request
          </EmailCTAButton>
        </>
      )}
      {!canCancel && (
        <EmailText>
          This deletion has been approved and is scheduled to run automatically.
          Contact support if you believe this is an error.
        </EmailText>
      )}
    </BaseLayout>
  );
};

export default DeletionReminderEmail;
```

### Step 2: Commit

```bash
git add emails/data-control/DeletionReminderEmail.tsx
git commit -m "feat(email): add DeletionReminderEmail template"
```

---

## Task 5: Extract core deletion logic to a lib file

The existing `executeDataDeletion()` in `manage-data-requests.ts` requires admin auth (`requirePlatformAdmin()`). The cron can't call it. Extract the raw deletion logic to `lib/data-deletion/execute-deletion.ts` so both the admin action and cron can use it.

**Files:**
- Create: `lib/data-deletion/execute-deletion.ts`
- Modify: `actions/platform-admin/manage-data-requests.ts`

### Step 1: Create `lib/data-deletion/execute-deletion.ts`

Copy the transaction block and surrounding logic from `executeDataDeletion()` in `manage-data-requests.ts` (lines ~265–330). Remove the `requirePlatformAdmin()` call — this is the internal version.

```typescript
// lib/data-deletion/execute-deletion.ts
/**
 * Core data deletion logic — no auth check.
 * Called by:
 *   - executeDataDeletion() admin action (after admin auth)
 *   - Daily cron (after grace period + admin approval check)
 */

import { prismadb } from "@/lib/prisma";

export interface DeletionExecutionResult {
  success: boolean;
  error?: string;
}

export async function runDataDeletion(requestId: string): Promise<DeletionExecutionResult> {
  const request = await prismadb.dataDeletionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (!["APPROVED", "PENDING"].includes(request.status)) {
    return {
      success: false,
      error: `Cannot execute deletion with status ${request.status}`,
    };
  }

  if (!request.gracePeriodEndsAt || new Date() < request.gracePeriodEndsAt) {
    return {
      success: false,
      error: "Grace period has not ended yet",
    };
  }

  // Mark as processing
  await prismadb.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "PROCESSING" },
  });

  try {
    const orgId = request.organizationId;

    await prismadb.$transaction([
      prismadb.message.deleteMany({ where: { organizationId: orgId } }),
      prismadb.socialPost.deleteMany({ where: { organizationId: orgId } }),
      prismadb.calendarEvent.deleteMany({ where: { organizationId: orgId } }),
      prismadb.crm_Accounts_Tasks.deleteMany({ where: { organizationId: orgId } }),
      prismadb.documents.deleteMany({ where: { organizationId: orgId } }),
      prismadb.property_Contacts.deleteMany({
        where: { Properties: { organizationId: orgId } },
      }),
      prismadb.properties.deleteMany({ where: { organizationId: orgId } }),
      prismadb.client_Contacts.deleteMany({ where: { organizationId: orgId } }),
      prismadb.clients.deleteMany({ where: { organizationId: orgId } }),
      prismadb.mandate.deleteMany({ where: { organizationId: orgId } }),
      prismadb.notification.deleteMany({ where: { organizationId: orgId } }),
      prismadb.feedback.deleteMany({ where: { organizationId: orgId } }),
      prismadb.apiKey.deleteMany({ where: { organizationId: orgId } }),
      prismadb.webhookEndpoint.deleteMany({ where: { organizationId: orgId } }),
      prismadb.dataExportRequest.deleteMany({ where: { organizationId: orgId } }),
    ]);

    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        executedAt: new Date(),
      },
    });

    console.log("[DATA_DELETION] Deletion executed for org:", orgId);
    return { success: true };
  } catch (error) {
    console.error("[DATA_DELETION] Execution failed:", error);

    // Revert to previous status so admin can retry
    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });

    return {
      success: false,
      error: "Deletion failed. Please try again or contact engineering.",
    };
  }
}
```

### Step 2: Update `executeDataDeletion()` in `manage-data-requests.ts`

Replace the entire try/catch deletion block (keep admin auth and pre-checks) with a call to `runDataDeletion`:

```typescript
// At top of file, add:
import { runDataDeletion } from "@/lib/data-deletion/execute-deletion";

// Replace the executeDataDeletion function body after the status check with:
export async function executeDataDeletion(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  const request = await prismadb.dataDeletionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "APPROVED") {
    return {
      success: false,
      error: "Request must be approved before execution",
    };
  }

  if (!request.gracePeriodEndsAt || new Date() < request.gracePeriodEndsAt) {
    return {
      success: false,
      error: "Grace period has not ended yet",
    };
  }

  const result = await runDataDeletion(requestId);

  if (result.success) {
    await logAdminAction(admin.id, "EXECUTE_DATA_DELETION", requestId, {
      organizationId: request.organizationId,
    });
  }

  return result;
}
```

### Step 3: Verify TypeScript

```bash
pnpm tsc --noEmit 2>&1 | grep -E "execute-deletion|manage-data"
# Expected: no output
```

### Step 4: Commit

```bash
git add lib/data-deletion/execute-deletion.ts actions/platform-admin/manage-data-requests.ts
git commit -m "refactor: extract core deletion logic to lib/data-deletion/execute-deletion.ts"
```

---

## Task 6: Refactor the deletion request server action

Replace `requestDataDeletion()` with `initiateDeletionRequest()` (step 1: generates OTP) and add `verifyDeletionOtp()` (step 2: confirms OTP, starts clock).

**Files:**
- Modify: `actions/data-deletion/request-data-deletion.ts`

### Step 1: Rewrite the file

Keep `getDataDeletionStatus()` and `cancelDataDeletion()` unchanged. Replace `requestDataDeletion()` with two new functions. The full new file:

```typescript
"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId, getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { render } from "@react-email/render";
import bcrypt from "bcryptjs";
import { DeletionOtpEmail } from "@/emails/data-control/DeletionOtpEmail";
import { DeletionRequestConfirmationEmail } from "@/emails/data-control/DeletionRequestConfirmation";
import { DeletionRequestAdminNotificationEmail } from "@/emails/data-control/DeletionRequestAdminNotification";
import { notifyAdminsByEmail } from "@/lib/admin-notify";

const GRACE_PERIOD_DAYS = 7;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;

// =============================================================================
// Step 1: Initiate deletion — generates OTP, sends email, status = PENDING_VERIFICATION
// =============================================================================

interface InitiateResult {
  requestId: string;
}

export async function initiateDeletionRequest(
  reason?: string
): Promise<ActionResponse<InitiateResult>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Cancel any stale PENDING_VERIFICATION request first (expired OTP)
    await prismadb.dataDeletionRequest.updateMany({
      where: {
        organizationId,
        requestedById: userId,
        status: "PENDING_VERIFICATION",
        verificationCodeExpiresAt: { lt: new Date() },
      },
      data: { status: "CANCELLED" },
    });

    // Check for existing active request (exclude CANCELLED and expired PENDING_VERIFICATION)
    const existingRequest = await prismadb.dataDeletionRequest.findFirst({
      where: {
        organizationId,
        requestedById: userId,
        status: { in: ["PENDING_VERIFICATION", "PENDING", "APPROVED", "PROCESSING"] },
      },
    });

    if (existingRequest) {
      return actionError(
        "You already have an active data deletion request.",
        "VALIDATION_ERROR"
      );
    }

    // Generate 8-digit numeric OTP
    const otpCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const request = await prismadb.dataDeletionRequest.create({
      data: {
        organizationId,
        requestedById: userId,
        reason: reason || null,
        status: "PENDING_VERIFICATION",
        verificationCode: hashedOtp,
        verificationCodeExpiresAt: expiresAt,
        gracePeriodEndsAt: null, // set after OTP confirmed
      },
    });

    // Send OTP email (fire and forget)
    sendOtpEmail(userId, otpCode, OTP_EXPIRY_MINUTES).catch((err) =>
      console.error("[DATA_DELETION] OTP email failed:", err)
    );

    console.log("[DATA_DELETION] Initiation created:", request.id);
    return actionSuccess({ requestId: request.id });
  } catch (error) {
    console.error("[INITIATE_DELETION]", error);
    return actionError("Failed to initiate deletion request", error as Error);
  }
}

// =============================================================================
// Step 2: Verify OTP — transitions to PENDING, starts the 7-day clock
// =============================================================================

interface VerifyResult {
  gracePeriodEndsAt: string;
}

export async function verifyDeletionOtp(
  requestId: string,
  otp: string
): Promise<ActionResponse<VerifyResult>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    const request = await prismadb.dataDeletionRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
        requestedById: userId,
        status: "PENDING_VERIFICATION",
      },
    });

    if (!request) {
      return actionError("Deletion request not found", "NOT_FOUND");
    }

    // Check OTP expiry
    if (
      !request.verificationCodeExpiresAt ||
      new Date() > request.verificationCodeExpiresAt
    ) {
      await prismadb.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
      });
      return actionError(
        "Verification code has expired. Please start a new request.",
        "VALIDATION_ERROR"
      );
    }

    if (!request.verificationCode) {
      return actionError("No verification code found", "VALIDATION_ERROR");
    }

    // Timing-safe OTP comparison via bcrypt
    const isValid = await bcrypt.compare(otp, request.verificationCode);

    if (!isValid) {
      return actionError(
        "Invalid verification code. Please check your email and try again.",
        "VALIDATION_ERROR"
      );
    }

    // OTP confirmed — start the 7-day clock
    const now = new Date();
    const gracePeriodEndsAt = new Date(
      now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "PENDING",
        verifiedAt: now,
        gracePeriodEndsAt,
        // Clear OTP so it can't be reused
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });

    console.log("[DATA_DELETION] OTP verified, request pending:", requestId);

    // Send confirmation email to user + admin notification (fire and forget)
    sendConfirmationEmails(requestId, organizationId, userId, request.reason, gracePeriodEndsAt).catch(
      (err) => console.error("[DATA_DELETION] Post-verify emails failed:", err)
    );

    return actionSuccess({ gracePeriodEndsAt: gracePeriodEndsAt.toISOString() });
  } catch (error) {
    console.error("[VERIFY_DELETION_OTP]", error);
    return actionError("Failed to verify code", error as Error);
  }
}

// =============================================================================
// Get status (unchanged)
// =============================================================================

export async function getDataDeletionStatus(): Promise<
  ActionResponse<{
    request: {
      id: string;
      status: string;
      reason: string | null;
      reviewNote: string | null;
      gracePeriodEndsAt: Date | null;
      createdAt: Date;
    } | null;
  }>
> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    const request = await prismadb.dataDeletionRequest.findFirst({
      where: {
        organizationId,
        requestedById: userId,
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        reviewNote: true,
        gracePeriodEndsAt: true,
        createdAt: true,
      },
    });

    return actionSuccess({ request });
  } catch (error) {
    console.error("[GET_DELETION_STATUS]", error);
    return actionError("Failed to get deletion status", error as Error);
  }
}

// =============================================================================
// Cancel (unchanged logic, updated to also cancel PENDING_VERIFICATION)
// =============================================================================

export async function cancelDataDeletion(
  requestId: string
): Promise<ActionResponse<void>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    const request = await prismadb.dataDeletionRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
        requestedById: userId,
        status: { in: ["PENDING_VERIFICATION", "PENDING"] },
      },
    });

    if (!request) {
      return actionError(
        "Deletion request not found or cannot be cancelled",
        "NOT_FOUND"
      );
    }

    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });

    console.log("[DATA_DELETION] Request cancelled:", requestId);
    return actionSuccess();
  } catch (error) {
    console.error("[CANCEL_DELETION]", error);
    return actionError("Failed to cancel deletion request", error as Error);
  }
}

// =============================================================================
// Email helpers
// =============================================================================

async function sendOtpEmail(
  userId: string,
  otpCode: string,
  expiresInMinutes: number
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const resend = await resendHelper();
  const html = await render(
    DeletionOtpEmail({
      userName: user.name || user.email,
      otpCode,
      expiresInMinutes,
    })
  );

  await resend.emails.send({
    from: "Oikion <noreply@oikion.app>",
    to: user.email,
    subject: "Your data deletion confirmation code",
    html,
  });
}

async function sendConfirmationEmails(
  requestId: string,
  organizationId: string,
  userId: string,
  reason: string | null,
  gracePeriodEndsAt: Date
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const resend = await resendHelper();

  // 1. Confirmation to user
  try {
    const confirmHtml = await render(
      DeletionRequestConfirmationEmail({
        userName: user.name || user.email,
        requestId,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      })
    );
    await resend.emails.send({
      from: "Oikion <noreply@oikion.app>",
      to: user.email,
      subject: "Data Deletion Request Confirmed",
      html: confirmHtml,
    });
  } catch (err) {
    console.error("[DATA_DELETION] User confirmation email failed:", err);
  }

  // 2. Admin notification via shared utility
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    let orgName = organizationId;
    try {
      const org = await clerk.organizations.getOrganization({ organizationId });
      orgName = org.name;
    } catch {
      // fall back to org ID
    }

    const adminHtml = await render(
      DeletionRequestAdminNotificationEmail({
        userEmail: user.email,
        userName: user.name || undefined,
        organizationName: orgName,
        reason: reason || undefined,
        requestId,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      })
    );

    await notifyAdminsByEmail({
      subject: `[Action Required] Data Deletion Request from ${user.email}`,
      html: adminHtml,
    });
  } catch (err) {
    console.error("[DATA_DELETION] Admin notification failed:", err);
  }
}
```

### Step 2: Verify TypeScript

```bash
pnpm tsc --noEmit 2>&1 | grep request-data-deletion
# Expected: no output
```

### Step 3: Commit

```bash
git add actions/data-deletion/request-data-deletion.ts
git commit -m "feat(actions): add initiateDeletionRequest + verifyDeletionOtp with OTP flow"
```

---

## Task 7: Update `DataControlTab.tsx` — 2-step deletion UI

Replace the single `AlertDialog` form with a 2-step flow: initiate (warnings + reason) → OTP entry.

**Files:**
- Modify: `app/[locale]/app/(routes)/profile/components/DataControlTab.tsx`

### Step 1: Update imports at the top of the file

Replace:
```typescript
import {
  requestDataDeletion,
  getDataDeletionStatus,
  cancelDataDeletion,
} from "@/actions/data-deletion/request-data-deletion";
```

With:
```typescript
import {
  initiateDeletionRequest,
  verifyDeletionOtp,
  getDataDeletionStatus,
  cancelDataDeletion,
} from "@/actions/data-deletion/request-data-deletion";
```

### Step 2: Replace `DataDeletionSection` state and handlers

In `DataDeletionSection()`, replace the state block and handlers:

```typescript
// State
const [deletionRequest, setDeletionRequest] = useState<{...} | null>(null);
const [loadingDeletion, setLoadingDeletion] = useState(true);
const [deletionReason, setDeletionReason] = useState("");
const [understood, setUnderstood] = useState(false);
const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
const [isCancelling, setIsCancelling] = useState(false);

// NEW state
const [step, setStep] = useState<"idle" | "otp">("idle");
const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
const [otpValue, setOtpValue] = useState("");
const [isVerifying, setIsVerifying] = useState(false);
```

Replace `handleRequestDeletion` with two handlers:

```typescript
const handleInitiate = async () => {
  setIsSubmittingDeletion(true);
  try {
    const result = await initiateDeletionRequest(deletionReason || undefined);
    if (result.success && result.data) {
      setPendingRequestId(result.data.requestId);
      setStep("otp");
      toast.success("Check your email", {
        description: "Enter the 8-digit code we sent you.",
        isTranslationKey: false,
      });
    } else {
      toast.error(tCommon("toast.error"), {
        description: result.error,
        isTranslationKey: false,
      });
    }
  } catch {
    toast.error(tCommon("toast.error"));
  } finally {
    setIsSubmittingDeletion(false);
  }
};

const handleVerifyOtp = async () => {
  if (!pendingRequestId || otpValue.length !== 8) return;
  setIsVerifying(true);
  try {
    const result = await verifyDeletionOtp(pendingRequestId, otpValue);
    if (result.success) {
      toast.success("Deletion request confirmed", {
        description: "Your data will be deleted in 7 days. You can cancel until then.",
        isTranslationKey: false,
      });
      setStep("idle");
      setOtpValue("");
      setPendingRequestId(null);
      setDeletionReason("");
      setUnderstood(false);
      await loadDeletionStatus();
    } else {
      toast.error("Invalid code", {
        description: result.error,
        isTranslationKey: false,
      });
    }
  } catch {
    toast.error(tCommon("toast.error"));
  } finally {
    setIsVerifying(false);
  }
};
```

### Step 3: Replace the JSX in the "no active request" branch

Find the `AlertDialog` block (the one with `AlertDialogTrigger`) and replace it with:

```tsx
{/* === STEP: idle === */}
{step === "idle" && (
  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
    <div className="space-y-1">
      <p className="font-medium">{t("deletion.title")}</p>
      <p className="text-sm text-muted-foreground">{t("deletion.description")}</p>
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          {t("deletion.requestDeletion")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deletion.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("deletion.confirmDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deletion-reason">{t("deletion.reasonLabel")}</Label>
            <Textarea
              id="deletion-reason"
              placeholder={t("deletion.reasonPlaceholder")}
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="understand"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
            />
            <Label htmlFor="understand" className="text-sm leading-5 cursor-pointer">
              {t("deletion.understand")}
            </Label>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("buttons.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleInitiate}
            disabled={!understood || isSubmittingDeletion}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmittingDeletion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Confirmation Code
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)}

{/* === STEP: OTP entry === */}
{step === "otp" && (
  <div className="space-y-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="space-y-2 flex-1">
        <p className="font-medium">Enter your confirmation code</p>
        <p className="text-sm text-muted-foreground">
          We sent an 8-digit code to your email. Enter it below to confirm your deletion request.
          The code expires in 15 minutes.
        </p>
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="12345678"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
            maxLength={8}
            className="font-mono text-lg tracking-widest max-w-[160px]"
          />
          <Button
            onClick={handleVerifyOtp}
            disabled={otpValue.length !== 8 || isVerifying}
            variant="destructive"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Confirm Deletion
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1"
          onClick={() => {
            setStep("idle");
            setOtpValue("");
            setPendingRequestId(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}
```

### Step 4: Update status type — `gracePeriodEndsAt` is now nullable

Find the `deletionRequest` state type and update:
```typescript
// Change: gracePeriodEndsAt: Date;
// To:
gracePeriodEndsAt: Date | null;
```

Also update the `daysRemaining` calculation to guard against null:
```typescript
const daysRemaining = deletionRequest?.gracePeriodEndsAt
  ? Math.max(
      0,
      Math.ceil(
        (new Date(deletionRequest.gracePeriodEndsAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    )
  : null;
```

And in the pending display, add a null guard:
```tsx
{/* Replace the gracePeriodEndsAt display: */}
{deletionRequest.gracePeriodEndsAt && (
  <div className="flex items-center gap-2 text-sm">
    <Clock className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium">
      {t("deletion.gracePeriodEnds")}:{" "}
      {new Date(deletionRequest.gracePeriodEndsAt).toLocaleDateString()}
    </span>
    {daysRemaining !== null && (
      <span className="text-muted-foreground">
        ({daysRemaining} {t("deletion.daysRemaining")})
      </span>
    )}
  </div>
)}
```

Also update the `PENDING_VERIFICATION` status to show in the status badge:

In `getDeletionStatusBadge()`, add before the `PENDING` case:
```tsx
case "PENDING_VERIFICATION":
  return (
    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-700">
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      Awaiting Confirmation
    </Badge>
  );
```

### Step 5: Build to check for errors

```bash
pnpm build 2>&1 | grep -E "Error|error" | grep -v "node_modules" | head -20
# Fix any type errors before proceeding
```

### Step 6: Commit

```bash
git add app/[locale]/app/\(routes\)/profile/components/DataControlTab.tsx
git commit -m "feat(ui): replace deletion form with OTP 2-step flow"
```

---

## Task 8: Create `actions/platform-admin/get-admin-counts.ts`

**Files:**
- Create: `actions/platform-admin/get-admin-counts.ts`

### Step 1: Create the file

```typescript
"use server";

import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prismadb } from "@/lib/prisma";

export interface AdminCounts {
  pendingDeletions: number;
  pendingFeedback: number;
}

/**
 * Returns counts for platform admin sidebar badges.
 * pendingDeletions: PENDING status (awaiting admin approval)
 * pendingFeedback: OPEN status feedback items
 */
export async function getPlatformAdminCounts(): Promise<AdminCounts> {
  try {
    await requirePlatformAdmin();

    const [pendingDeletions, pendingFeedback] = await Promise.all([
      prismadb.dataDeletionRequest.count({
        where: { status: "PENDING" },
      }),
      prismadb.feedback.count({
        where: { status: "OPEN" },
      }),
    ]);

    return { pendingDeletions, pendingFeedback };
  } catch {
    // Return zero counts on error — never break the layout
    return { pendingDeletions: 0, pendingFeedback: 0 };
  }
}
```

> **Note:** Check the `Feedback` model in `prisma/schema.prisma` to confirm the `status` field and `"OPEN"` value name. Adjust if different.

### Step 2: Verify

```bash
pnpm tsc --noEmit 2>&1 | grep get-admin-counts
# Expected: no output
```

### Step 3: Commit

```bash
git add actions/platform-admin/get-admin-counts.ts
git commit -m "feat(actions): add getPlatformAdminCounts for sidebar badges"
```

---

## Task 9: Wire badge counts into layout and sidebar

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/layout.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx`

### Step 1: Update the layout to fetch counts

In `layout.tsx`, add import and fetch:

```typescript
// Add import:
import { getPlatformAdminCounts } from "@/actions/platform-admin/get-admin-counts";

// In the component body, after adminUser is built:
const adminCounts = adminUserRaw
  ? await getPlatformAdminCounts()
  : { pendingDeletions: 0, pendingFeedback: 0 };
```

Pass to sidebar:
```tsx
<PlatformAdminSidebar adminUser={adminUser} locale={locale} counts={adminCounts} />
```

### Step 2: Update `PlatformAdminSidebar` props and nav items

In `PlatformAdminSidebar.tsx`:

**a) Update the props interface:**
```typescript
interface PlatformAdminSidebarProps {
  adminUser: PlatformAdminUser | null;
  locale: string;
  counts: { pendingDeletions: number; pendingFeedback: number };
}

export function PlatformAdminSidebar({ adminUser, locale, counts }: PlatformAdminSidebarProps) {
```

**b) Add `Badge` import** (if not already present — check imports at top of file):
```typescript
import { Badge } from "@/components/ui/badge";
```

**c) Update the two nav items to include a badge label:**

Find the feedback nav item (around line ~123) and add a `badge` property:
```typescript
{
  href: `/${locale}/app/platform-admin/feedback`,
  label: t("nav.feedback"),
  icon: MessageSquare,
  active: pathname.includes("/platform-admin/feedback"),
  badge: counts.pendingFeedback > 0 ? counts.pendingFeedback : null,
},
{
  href: `/${locale}/app/platform-admin/data-requests`,
  label: t("nav.dataRequests"),
  icon: Database,
  active: pathname.includes("/platform-admin/data-requests"),
  badge: counts.pendingDeletions > 0 ? counts.pendingDeletions : null,
},
```

**d) Update the nav item render to show the badge:**

Find where nav items are rendered (look for `SidebarMenuButton` in the JSX). Update each rendered item to show a badge. The pattern depends on the current render, but it will look roughly like:

```tsx
{mainNavItems.map((item) => (
  <SidebarMenuItem key={item.href}>
    <SidebarMenuButton asChild isActive={item.active}>
      <Link href={item.href} className="flex items-center gap-2">
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <Badge
            variant="destructive"
            className="h-4 min-w-4 px-1 text-[10px] rounded-full"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
))}
```

> **Note:** Read the full sidebar JSX first to understand the exact render pattern before editing. Match the existing style.

### Step 3: Build check

```bash
pnpm build 2>&1 | grep -E "Error|error" | grep -v "node_modules" | head -20
```

### Step 4: Commit

```bash
git add "app/[locale]/app/(platform_admin)/layout.tsx" \
        "app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx"
git commit -m "feat(ui): add pending-count badges to platform admin sidebar"
```

---

## Task 10: Extend the daily cron for deletion reminders + auto-execution

**Files:**
- Modify: `app/api/cron/reminders/route.ts`

### Step 1: Add imports at top of file

```typescript
import { runDataDeletion } from "@/lib/data-deletion/execute-deletion";
import resendHelper from "@/lib/resend";
import { render } from "@react-email/render";
import { DeletionReminderEmail } from "@/emails/data-control/DeletionReminderEmail";
```

### Step 2: Add the deletion processing function

Add this function before the `GET` handler:

```typescript
async function processPendingDeletions(): Promise<{
  reminders: number;
  executed: number;
  failed: number;
}> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Admin gate: check env var (default: require approval)
  const requireApproval = process.env.DELETION_REQUIRE_ADMIN_APPROVAL !== "false";
  const eligibleStatuses = requireApproval
    ? (["APPROVED"] as const)
    : (["APPROVED", "PENDING"] as const);

  let reminders = 0;
  let executed = 0;
  let failed = 0;

  // --- 3-day reminders ---
  const dueForReminder = await prismadb.dataDeletionRequest.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      gracePeriodEndsAt: {
        gt: now,           // not yet elapsed
        lte: threeDaysFromNow, // within next 3 days
      },
      reminderSentAt: null, // not yet sent
    },
    include: {
      // We need user email; join via requestedById
    },
  });

  for (const request of dueForReminder) {
    try {
      const user = await prismadb.users.findUnique({
        where: { id: request.requestedById },
        select: { email: true, name: true },
      });

      if (user?.email && request.gracePeriodEndsAt) {
        const resend = await resendHelper();
        const html = await render(
          DeletionReminderEmail({
            userName: user.name || user.email,
            deletionDate: request.gracePeriodEndsAt.toISOString(),
            requestId: request.id,
            canCancel: request.status === "PENDING",
          })
        );

        await resend.emails.send({
          from: "Oikion <noreply@oikion.app>",
          to: user.email,
          subject: "Your data will be deleted in 3 days",
          html,
        });
      }

      await prismadb.dataDeletionRequest.update({
        where: { id: request.id },
        data: { reminderSentAt: now },
      });

      reminders++;
    } catch (err) {
      console.error("[CRON_DELETION] Reminder failed for:", request.id, err);
      failed++;
    }
  }

  // --- Auto-execution ---
  const dueForExecution = await prismadb.dataDeletionRequest.findMany({
    where: {
      status: { in: eligibleStatuses },
      gracePeriodEndsAt: { lte: now },
    },
  });

  for (const request of dueForExecution) {
    try {
      const result = await runDataDeletion(request.id);
      if (result.success) {
        executed++;
        console.log("[CRON_DELETION] Executed deletion for request:", request.id);
      } else {
        failed++;
        console.error("[CRON_DELETION] Execution failed for:", request.id, result.error);
      }
    } catch (err) {
      failed++;
      console.error("[CRON_DELETION] Unhandled error for:", request.id, err);
    }
  }

  return { reminders, executed, failed };
}
```

### Step 3: Call it from the GET handler

Inside the `GET` handler, after the calendar reminders section and before the `return NextResponse.json(...)` line, add:

```typescript
// Process data deletion reminders and auto-execution
const deletionStats = await processPendingDeletions();

return NextResponse.json({
  success: true,
  processed: totalProcessed,
  sent: totalSent,
  failed: totalFailed,
  deletions: deletionStats,
  timestamp: new Date().toISOString(),
});
```

### Step 4: Verify TypeScript

```bash
pnpm tsc --noEmit 2>&1 | grep "cron/reminders"
# Expected: no output
```

### Step 5: Commit

```bash
git add app/api/cron/reminders/route.ts
git commit -m "feat(cron): add deletion reminder emails and auto-execution to daily cron"
```

---

## Task 11: Notify admins on feedback submission

**Files:**
- Modify: `app/api/feedback/route.ts`

### Step 1: Add import

```typescript
import { notifyAdminsByEmail } from "@/lib/admin-notify";
```

### Step 2: Find where feedback is saved and add notification

After `await resend.emails.send(emailOptions)` (around line 163), add:

```typescript
// Notify platform admins of new feedback
notifyAdminsByEmail({
  subject: `[New Feedback] ${feedbackType || "General"} from ${userEmail || "Anonymous"}`,
  html: `<p>New feedback received.</p><p><strong>Type:</strong> ${feedbackType || "General"}</p><p><strong>From:</strong> ${userEmail || "Anonymous"}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/app/platform-admin/feedback">View in platform admin</a></p>`,
}).catch((err) => console.error("[FEEDBACK] Admin notify failed:", err));
```

> Read `app/api/feedback/route.ts` fully before editing — confirm where the feedback is persisted and what variables are in scope (`feedbackType`, `userEmail`, etc. — adapt variable names to match the actual code).

### Step 3: Verify TypeScript

```bash
pnpm tsc --noEmit 2>&1 | grep "feedback/route"
# Expected: no output
```

### Step 4: Commit

```bash
git add app/api/feedback/route.ts
git commit -m "feat: notify platform admins by email on new feedback submission"
```

---

## Task 12: Cleanup — use `lib/admin-notify.ts` in `manage-data-requests.ts`

The inline admin email logic in `sendDecisionEmail` is not duplicated (it's a decision email, not a new-request notification), so it stays. However, the `sendDeletionEmails` helper was removed from `request-data-deletion.ts` and the logic now lives in `sendConfirmationEmails`. Verify the old file no longer has an inline loop over `PLATFORM_ADMIN_EMAILS`.

**Files:**
- Verify: `actions/data-deletion/request-data-deletion.ts` (already rewritten in Task 6)
- Verify: `actions/platform-admin/manage-data-requests.ts` (no change needed)

### Step 1: Verify no duplication

```bash
grep -n "PLATFORM_ADMIN_EMAILS" actions/data-deletion/request-data-deletion.ts
# Expected: 0 matches (we replaced with notifyAdminsByEmail)

grep -n "PLATFORM_ADMIN_EMAILS" lib/admin-notify.ts
# Expected: 1 match (the utility itself)
```

### Step 2: Final build

```bash
pnpm build
# Expected: no errors
```

### Step 3: Final commit

```bash
git add -A
git commit -m "chore: final cleanup and build verification for OTP deletion flow"
```

---

## Manual Testing Checklist

Run through this in the dev environment (`pnpm dev`):

**Happy path:**
1. Go to Profile → Data Control → click "Request Data Deletion"
2. Check the checkbox, optionally add reason, click "Send Confirmation Code"
3. Check email — confirm 8-digit code received (check spam if needed)
4. Enter code in the OTP step → confirm toast shows "Deletion confirmed, 7 days"
5. Verify status badge shows in the "Data Deletion" section
6. Log in as platform admin → check sidebar shows badge on "Data Requests"
7. Go to `/platform-admin/data-requests` → approve the request
8. Manually trigger cron: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`
9. Confirm execution runs after setting `gracePeriodEndsAt` to a past date in Prisma Studio

**OTP expiry path:**
1. Initiate deletion
2. Wait 15 min (or manually set `verificationCodeExpiresAt` to past in Prisma Studio)
3. Enter any code → confirm "code expired" error
4. Confirm request status is now CANCELLED

**Cancel path:**
1. Initiate + verify OTP (status = PENDING)
2. Click "Cancel Request" in the UI
3. Confirm status → CANCELLED

**Admin rejection:**
1. Status = PENDING, admin rejects in platform admin
2. Confirm user receives rejection email
3. Confirm deletion does NOT execute in cron

---

## Key Env Vars

| Var | Purpose | Default |
|-----|---------|---------|
| `PLATFORM_ADMIN_EMAILS` | Comma-separated admin emails for notifications | — |
| `CRON_SECRET` | Bearer token for cron auth | — |
| `DELETION_REQUIRE_ADMIN_APPROVAL` | Set to `"false"` to skip admin gate | `"true"` |
