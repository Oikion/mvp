"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId, getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { render } from "@react-email/render";
import { DeletionRequestConfirmationEmail } from "@/emails/data-control/DeletionRequestConfirmation";
import { DeletionRequestAdminNotificationEmail } from "@/emails/data-control/DeletionRequestAdminNotification";

const GRACE_PERIOD_DAYS = 30;

interface DataDeletionResult {
  requestId: string;
  gracePeriodEndsAt: string;
}

/**
 * Request data deletion for the organization.
 * Creates a request with a 30-day grace period.
 * Sends confirmation email to user and notification to platform admins.
 */
export async function requestDataDeletion(
  reason?: string
): Promise<ActionResponse<DataDeletionResult>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Check for existing active request
    const existingRequest = await prismadb.dataDeletionRequest.findFirst({
      where: {
        organizationId,
        requestedById: userId,
        status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
      },
    });

    if (existingRequest) {
      return actionError(
        "You already have an active data deletion request.",
        "VALIDATION_ERROR"
      );
    }

    const gracePeriodEndsAt = new Date(
      Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    const request = await prismadb.dataDeletionRequest.create({
      data: {
        organizationId,
        requestedById: userId,
        reason: reason || null,
        status: "PENDING",
        gracePeriodEndsAt,
      },
    });

    console.log("[DATA_DELETION] Request created:", request.id);

    // Send emails in background (don't block the response)
    sendDeletionEmails(request.id, organizationId, userId, reason || null, gracePeriodEndsAt).catch(
      (err) => console.error("[DATA_DELETION] Email sending failed:", err)
    );

    return actionSuccess({
      requestId: request.id,
      gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("[REQUEST_DATA_DELETION]", error);
    return actionError("Failed to create data deletion request", error as Error);
  }
}

/**
 * Get the status of the user's data deletion request
 */
export async function getDataDeletionStatus(): Promise<
  ActionResponse<{
    request: {
      id: string;
      status: string;
      reason: string | null;
      reviewNote: string | null;
      gracePeriodEndsAt: Date;
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

/**
 * Cancel a pending data deletion request
 */
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
        status: "PENDING",
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
// Email Helpers
// =============================================================================

async function sendDeletionEmails(
  requestId: string,
  organizationId: string,
  userId: string,
  reason: string | null,
  gracePeriodEndsAt: Date
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const resend = await resendHelper();

  // 1. Send confirmation to user
  try {
    const confirmationHtml = await render(
      DeletionRequestConfirmationEmail({
        userName: user.name || user.email,
        requestId,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      })
    );

    await resend.emails.send({
      from: "Oikion <noreply@oikion.app>",
      to: user.email,
      subject: "Data Deletion Request Received",
      html: confirmationHtml,
    });
  } catch (err) {
    console.error("[DATA_DELETION] User email failed:", err);
  }

  // 2. Notify platform admins
  try {
    const adminEmails = process.env.PLATFORM_ADMIN_EMAILS;
    if (!adminEmails) return;

    const adminEmailList = adminEmails
      .replace(/"/g, "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (adminEmailList.length === 0) return;

    // Get org name from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    let orgName = organizationId;
    try {
      const org = await clerk.organizations.getOrganization({ organizationId });
      orgName = org.name;
    } catch {
      // Fall back to org ID
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

    for (const adminEmail of adminEmailList) {
      await resend.emails.send({
        from: "Oikion <noreply@oikion.app>",
        to: adminEmail,
        subject: `[Action Required] Data Deletion Request from ${user.email}`,
        html: adminHtml,
      });
    }
  } catch (err) {
    console.error("[DATA_DELETION] Admin notification failed:", err);
  }
}
