/**
 * lib/data-deletion/execute-deletion.ts
 *
 * Core data deletion logic — no auth check.
 * Called by:
 *   - executeDataDeletion() admin action (after admin auth)
 *   - Daily cron (after grace period + admin approval check)
 *
 * Uses the unified departure service to handle per-org cleanup,
 * then deletes the Users row and Clerk account.
 */

import { createHash } from "crypto";
import { prismadb } from "@/lib/prisma";
import { handleUserDeparture } from "@/lib/user-departure";
import { clerkClient } from "@clerk/nextjs/server";

export interface DeletionExecutionResult {
  success: boolean;
  error?: string;
}

export async function runDataDeletion(
  requestId: string
): Promise<DeletionExecutionResult> {
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
    // Find the user who requested deletion
    const user = await prismadb.users.findUnique({
      where: { id: request.requestedById },
    });

    if (!user) {
      // User row already gone — mark completed
      await prismadb.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: "COMPLETED", executedAt: new Date() },
      });
      console.log(
        "[DATA_DELETION] User already deleted, marking request completed:",
        requestId
      );
      return { success: true };
    }

    // Gather org memberships from Clerk (if user has a Clerk account)
    const orgIds: string[] = [];
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();
        const memberships =
          await clerk.users.getOrganizationMembershipList({
            userId: user.clerkUserId,
          });
        for (const m of memberships.data) {
          if (m.organization?.id) {
            orgIds.push(m.organization.id);
          }
        }
      } catch (clerkErr) {
        console.warn(
          "[DATA_DELETION] Could not fetch Clerk memberships, " +
            "falling back to request orgId only:",
          clerkErr
        );
      }
    }

    // Ensure the request's org is included
    if (!orgIds.includes(request.organizationId)) {
      orgIds.push(request.organizationId);
    }

    // Depart from each organization via the unified service
    for (const orgId of orgIds) {
      const departureResult = await handleUserDeparture(
        user.id,
        orgId,
        "ACCOUNT_DELETED"
      );
      if (departureResult.errors.length > 0) {
        console.warn(
          `[DATA_DELETION] Departure warnings for org ${orgId}:`,
          departureResult.errors
        );
      }
    }

    // Pseudonymize PiiAccessLog entries — GDPR Article 17 compliance.
    // PiiAccessLog.userId stores the Clerk userId of the accessor.
    // Replace it with a one-way hash so audit rows remain structurally
    // valid (audit trail preserved) but are no longer personally identifiable.
    if (user.clerkUserId) {
      const userIdHash =
        "deleted:" +
        createHash("sha256")
          .update(user.clerkUserId + (process.env.ADMIN_LOG_SALT ?? "oikion-audit-v1"))
          .digest("hex")
          .slice(0, 16);

      await prismadb.piiAccessLog
        .updateMany({
          where: { userId: user.clerkUserId },
          data: { userId: userIdHash },
        })
        .catch((e) =>
          console.error(
            "[GDPR_ERASURE]",
            "PiiAccessLog pseudonymization failed",
            e
          )
        );
    }

    // Delete the Users row
    await prismadb.users.delete({ where: { id: user.id } });

    // Delete from Clerk
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(user.clerkUserId);
      } catch (clerkErr) {
        // Non-fatal: user may already be deleted in Clerk
        console.warn(
          "[DATA_DELETION] Could not delete Clerk user (may already be gone):",
          clerkErr
        );
      }
    }

    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        executedAt: new Date(),
      },
    });

    console.log(
      "[DATA_DELETION] Deletion executed for user:",
      user.id,
      "across",
      orgIds.length,
      "org(s)"
    );
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
