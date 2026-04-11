"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentUserId, getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { isOrgOwner } from "@/lib/org-admin";
import { handleUserDeparture } from "@/lib/user-departure";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";

/**
 * Delete the current user's account and all associated data
 *
 * This is a destructive operation that:
 * 1. Runs handleUserDeparture for each org membership (SetNull on user refs)
 * 2. Deletes the Users row
 * 3. Deletes the Clerk user
 *
 * WARNING: This cannot be undone!
 */
export async function deleteAccount(
  confirmation: string
): Promise<ActionResponse<void>> {
  if (confirmation !== "DELETE MY DATA") {
    return actionError("Invalid confirmation", "VALIDATION_ERROR");
  }

  const guard = await requireAuth();
  if (guard) return guard;

  const userId = await getCurrentUserId();

  try {
    // Get user info
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        clerkUserId: true,
        name: true,
      },
    });

    if (!user) {
      return actionError("User not found", "NOT_FOUND");
    }

    // Get all org memberships from Clerk
    const clerk = await clerkClient();
    let orgMemberships: { organization: { id: string } }[] = [];

    if (user.clerkUserId) {
      try {
        const membershipList =
          await clerk.users.getOrganizationMembershipList({
            userId: user.clerkUserId,
          });
        orgMemberships = membershipList.data;
      } catch (err) {
        console.error(
          "[DELETE_ACCOUNT] Failed to fetch org memberships:",
          err
        );
      }
    }

    // Run departure service for each org
    for (const membership of orgMemberships) {
      await handleUserDeparture(
        user.id,
        membership.organization.id,
        "ACCOUNT_DELETED"
      );
    }

    // Delete personal workspace org from Clerk (must happen before Clerk user deletion)
    for (const membership of orgMemberships) {
      if (await isOrgPersonal(membership.organization.id)) {
        try {
          await clerk.organizations.deleteOrganization(membership.organization.id);
          console.log("[DELETE_ACCOUNT] Deleted personal workspace:", membership.organization.id);
        } catch (err) {
          console.error("[DELETE_ACCOUNT] Failed to delete personal workspace:", err);
        }
      }
    }

    // Delete the Users row
    await prismadb.users.delete({
      where: { id: userId },
    });

    // Delete Clerk user (after database deletion succeeds)
    if (user.clerkUserId) {
      try {
        await clerk.users.deleteUser(user.clerkUserId);
      } catch (clerkError) {
        // Log but don't fail - database deletion was successful
        console.error("[DELETE_ACCOUNT] Failed to delete Clerk user:", clerkError);
      }
    }

    console.log("[DELETE_ACCOUNT] Account deleted:", user.email);

    return actionSuccess();
  } catch (error) {
    console.error("[DELETE_ACCOUNT]", error);
    return actionError("Failed to delete account", error as Error);
  }
}

/**
 * Delete an organization and all its data
 * Only org owners can do this
 * 
 * WARNING: This is an extremely destructive operation that cannot be undone!
 */
export async function deleteOrganization(
  confirmation: string
): Promise<ActionResponse<void>> {
  if (confirmation !== "DELETE ORGANIZATION") {
    return actionError("Invalid confirmation", "VALIDATION_ERROR");
  }

  const guard = await requireAuth();
  if (guard) return guard;

  // Verify user is org owner
  const ownerCheck = await isOrgOwner();
  if (!ownerCheck) {
    return actionError(
      "Only organization owners can delete the organization",
      "FORBIDDEN" as const
    );
  }

  const organizationId = await getCurrentOrgId();

  try {
    // Get org info for logging
    const org = await prismadb.organizationSettings.findUnique({
      where: { organizationId },
      select: { organizationId: true },
    });

    // Delete all organization data in a transaction
    // Order matters due to foreign key constraints
    await prismadb.$transaction(async (tx) => {
      // =============================================================================
      // Step 1: Delete export data
      // =============================================================================
      await tx.dataExportRequest.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 2: Delete messaging data (has many foreign keys)
      // =============================================================================
      await tx.message.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 3: Delete calendar and notifications
      // =============================================================================
      await tx.calendarEvent.deleteMany({
        where: { organizationId },
      });

      await tx.notification.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 4: Delete CRM data (tasks, comments)
      // =============================================================================
      await tx.crm_Accounts_Tasks_Comments.deleteMany({
        where: { organizationId },
      });

      await tx.crm_Accounts_Tasks.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 5: Delete social feed data
      // =============================================================================
      await tx.socialPost.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 6: Delete property-related data
      // =============================================================================
      await tx.marketingSpend.deleteMany({
        where: { organizationId },
      });

      await tx.properties.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 7: Delete contact-related data
      // =============================================================================
      await tx.contact.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 8: Delete documents and uploads
      // =============================================================================
      await tx.documents.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 9: Delete feedback
      // =============================================================================
      await tx.feedback.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 10: Delete integrations and API data
      // =============================================================================
      await tx.webhookEndpoint.deleteMany({
        where: { organizationId },
      });

      await tx.apiKey.deleteMany({
        where: { organizationId },
      });

      await tx.backgroundJob.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 12: Delete permission data
      // =============================================================================
      await tx.organizationRolePermission.deleteMany({
        where: { organizationId },
      });

      // =============================================================================
      // Step 13: Delete settings and audit logs
      // =============================================================================
      await tx.organizationSettingsAudit.deleteMany({
        where: { organizationId },
      });

      await tx.organizationSettings.deleteMany({
        where: { organizationId },
      });
    });

    // Delete Clerk organization
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      await clerk.organizations.deleteOrganization(organizationId);
    } catch (clerkError) {
      // Log but don't fail - database deletion was successful
      console.error("[DELETE_ORGANIZATION] Failed to delete Clerk org:", clerkError);
    }

    console.log("[DELETE_ORGANIZATION] Organization deleted:", org?.organizationId || organizationId);

    return actionSuccess();
  } catch (error) {
    console.error("[DELETE_ORGANIZATION]", error);
    return actionError("Failed to delete organization", error as Error);
  }
}
