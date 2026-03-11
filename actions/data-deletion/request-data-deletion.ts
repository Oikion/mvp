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
import { checkAttempt, recordFailedAttempt, clearAttempts } from "@/lib/security/brute-force";

const GRACE_PERIOD_DAYS = 7;
const OTP_EXPIRY_MINUTES = 15;

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
    // Cancel any stale PENDING_VERIFICATION requests with expired OTP
    await prismadb.dataDeletionRequest.updateMany({
      where: {
        organizationId,
        requestedById: userId,
        status: "PENDING_VERIFICATION",
        verificationCodeExpiresAt: { lt: new Date() },
      },
      data: { status: "CANCELLED" },
    });

    // Check for existing active request
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
        gracePeriodEndsAt: null,
      },
    });

    // Send OTP email (fire and forget)
    sendOtpEmail(otpCode, OTP_EXPIRY_MINUTES).catch((err) =>
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
    // Brute force protection: limit OTP attempts per request
    const bruteCheck = await checkAttempt("otp", requestId);
    if (!bruteCheck.allowed) {
      return actionError(
        `Too many verification attempts. Please try again in ${Math.ceil((bruteCheck.retryAfter ?? 900) / 60)} minutes.`,
        "VALIDATION_ERROR"
      );
    }

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
      await recordFailedAttempt("otp", requestId);
      return actionError(
        "Invalid verification code. Please check your email and try again.",
        "VALIDATION_ERROR"
      );
    }

    // OTP valid — clear brute force counter
    await clearAttempts("otp", requestId);

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
    sendConfirmationEmails(
      requestId,
      organizationId,
      request.reason,
      gracePeriodEndsAt
    ).catch((err) =>
      console.error("[DATA_DELETION] Post-verify emails failed:", err)
    );

    return actionSuccess({ gracePeriodEndsAt: gracePeriodEndsAt.toISOString() });
  } catch (error) {
    console.error("[VERIFY_DELETION_OTP]", error);
    return actionError("Failed to verify code", error as Error);
  }
}

// =============================================================================
// Get status
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
// Cancel (also handles PENDING_VERIFICATION)
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
  otpCode: string,
  expiresInMinutes: number
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const dbUser = await prismadb.users.findUnique({
    where: { id: user.id },
    select: { userTheme: true },
  });

  const resend = await resendHelper();
  const html = await render(
    DeletionOtpEmail({
      userName: user.name || user.email,
      otpCode,
      expiresInMinutes,
      userTheme: dbUser?.userTheme ?? "estate",
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
