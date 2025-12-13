"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { sanitizeAdminMessage } from "@/lib/platform-admin-utils";
import { generateFriendlyId } from "@/lib/friendly-id";
import { Resend } from "resend";
import { z } from "zod";
import AccountWarning from "@/emails/admin/AccountWarning";
import AccountSuspension from "@/emails/admin/AccountSuspension";
import AccountDeletion from "@/emails/admin/AccountDeletion";

// Initialize Resend if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// System-level organization ID for platform admin notifications
const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

// Validation schemas
const orgActionSchema = z.object({
  organizationId: z.string().min(1),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

interface ActionResult {
  success: boolean;
  error?: string;
  affectedCount?: number;
}

/**
 * Warn all members of an organization
 * Sends warning notification and email to all members
 */
export async function warnOrganizationMembers(
  data: z.infer<typeof orgActionSchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = orgActionSchema.safeParse(data);
    
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { organizationId, reason } = validation.data;
    const sanitizedReason = sanitizeAdminMessage(reason);

    // Get organization details from Clerk
    const clerk = await clerkClient();
    let org;
    try {
      org = await clerk.organizations.getOrganization({ organizationId });
    } catch {
      return { success: false, error: "Organization not found" };
    }

    // Get all organization members
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 500,
    });

    if (memberships.data.length === 0) {
      return { success: false, error: "No members found in organization" };
    }

    // Log the action
    await logAdminAction(admin.clerkId, "SEND_WARNING", organizationId, {
      type: "ORG_WIDE",
      memberCount: memberships.data.length,
      reason: sanitizedReason,
    });

    let affectedCount = 0;

    // Send warning to each member
    for (const membership of memberships.data) {
      const userId = membership.publicUserData?.userId;
      if (!userId) continue;

      // Find user in our database
      const user = await prismadb.users.findFirst({
        where: { clerkUserId: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) continue;

      // Create in-app notification
      const notificationId = await generateFriendlyId(prismadb, "Notification");
      await prismadb.notification.create({
        data: {
          id: notificationId,
          userId: user.id,
          organizationId: SYSTEM_ORG_ID,
          type: "ACCOUNT_WARNING",
          title: "Organization Warning",
          message: `Your organization "${org.name}" has received a warning: ${sanitizedReason}`,
          actorId: admin.clerkId,
          actorName: "Platform Administrator",
          metadata: {
            adminAction: true,
            warningDate: new Date().toISOString(),
            organizationName: org.name,
          },
        },
      });

      // Send email notification
      if (resend && user.email) {
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || "Oikion <noreply@oikion.app>",
            to: user.email,
            subject: `Warning: Your Organization "${org.name}"`,
            react: AccountWarning({
              userName: user.name || "User",
              reason: sanitizedReason,
              isOrgWide: true,
              organizationName: org.name,
            }),
          });
        } catch (emailError) {
          console.error("[ORG_WARN_EMAIL]", emailError);
        }
      }

      affectedCount++;
    }

    return { success: true, affectedCount };
  } catch (error) {
    console.error("[WARN_ORG_MEMBERS]", error);
    return { success: false, error: "Failed to send warnings" };
  }
}

/**
 * Suspend an organization and all its members
 * Sets all members to INACTIVE status
 */
export async function suspendOrganization(
  data: z.infer<typeof orgActionSchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = orgActionSchema.safeParse(data);
    
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { organizationId, reason } = validation.data;
    const sanitizedReason = sanitizeAdminMessage(reason);

    // Get organization details from Clerk
    const clerk = await clerkClient();
    let org;
    try {
      org = await clerk.organizations.getOrganization({ organizationId });
    } catch {
      return { success: false, error: "Organization not found" };
    }

    // Get all organization members
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 500,
    });

    if (memberships.data.length === 0) {
      return { success: false, error: "No members found in organization" };
    }

    // Log the action
    await logAdminAction(admin.clerkId, "SUSPEND_ACCOUNT", organizationId, {
      type: "ORG_WIDE",
      memberCount: memberships.data.length,
      reason: sanitizedReason,
    });

    let affectedCount = 0;

    // Suspend each member
    for (const membership of memberships.data) {
      const userId = membership.publicUserData?.userId;
      if (!userId) continue;

      // Find user in our database
      const user = await prismadb.users.findFirst({
        where: { clerkUserId: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) continue;

      // Update user status to INACTIVE
      await prismadb.users.update({
        where: { id: user.id },
        data: { userStatus: "INACTIVE" },
      });

      // Ban user in Clerk
      try {
        await clerk.users.banUser(userId);
      } catch (banError) {
        console.error("[ORG_BAN_USER]", banError);
      }

      // Create in-app notification
      const notificationId = await generateFriendlyId(prismadb, "Notification");
      await prismadb.notification.create({
        data: {
          id: notificationId,
          userId: user.id,
          organizationId: SYSTEM_ORG_ID,
          type: "ACCOUNT_SUSPENSION",
          title: "Organization Suspended",
          message: `Your organization "${org.name}" has been suspended: ${sanitizedReason}`,
          actorId: admin.clerkId,
          actorName: "Platform Administrator",
          metadata: {
            adminAction: true,
            suspensionDate: new Date().toISOString(),
            organizationName: org.name,
            reason: sanitizedReason,
          },
        },
      });

      // Send email notification
      if (resend && user.email) {
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || "Oikion <noreply@oikion.app>",
            to: user.email,
            subject: `Organization Suspended: "${org.name}"`,
            react: AccountSuspension({
              userName: user.name || "User",
              reason: sanitizedReason,
              isOrgWide: true,
              organizationName: org.name,
            }),
          });
        } catch (emailError) {
          console.error("[ORG_SUSPEND_EMAIL]", emailError);
        }
      }

      affectedCount++;
    }

    return { success: true, affectedCount };
  } catch (error) {
    console.error("[SUSPEND_ORG]", error);
    return { success: false, error: "Failed to suspend organization" };
  }
}

/**
 * Delete an organization and notify all members
 * Removes the organization from Clerk
 */
export async function deleteOrganization(
  data: z.infer<typeof orgActionSchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = orgActionSchema.safeParse(data);
    
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { organizationId, reason } = validation.data;
    const sanitizedReason = sanitizeAdminMessage(reason);

    // Get organization details from Clerk
    const clerk = await clerkClient();
    let org;
    try {
      org = await clerk.organizations.getOrganization({ organizationId });
    } catch {
      return { success: false, error: "Organization not found" };
    }

    // Get all organization members before deletion
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 500,
    });

    // Log the action
    await logAdminAction(admin.clerkId, "DELETE_ACCOUNT", organizationId, {
      type: "ORG_DELETE",
      organizationName: org.name,
      memberCount: memberships.data.length,
      reason: sanitizedReason,
    });

    let affectedCount = 0;

    // Notify each member before deletion
    for (const membership of memberships.data) {
      const userId = membership.publicUserData?.userId;
      if (!userId) continue;

      // Find user in our database
      const user = await prismadb.users.findFirst({
        where: { clerkUserId: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) continue;

      // Create in-app notification
      const notificationId = await generateFriendlyId(prismadb, "Notification");
      await prismadb.notification.create({
        data: {
          id: notificationId,
          userId: user.id,
          organizationId: SYSTEM_ORG_ID,
          type: "ACCOUNT_DELETION_NOTICE",
          title: "Organization Deleted",
          message: `Your organization "${org.name}" has been deleted: ${sanitizedReason}`,
          actorId: admin.clerkId,
          actorName: "Platform Administrator",
          metadata: {
            adminAction: true,
            deletionDate: new Date().toISOString(),
            organizationName: org.name,
            reason: sanitizedReason,
          },
        },
      });

      // Send email notification
      if (resend && user.email) {
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || "Oikion <noreply@oikion.app>",
            to: user.email,
            subject: `Organization Deleted: "${org.name}"`,
            react: AccountDeletion({
              userName: user.name || "User",
              reason: sanitizedReason,
              isOrgWide: true,
              organizationName: org.name,
            }),
          });
        } catch (emailError) {
          console.error("[ORG_DELETE_EMAIL]", emailError);
        }
      }

      affectedCount++;
    }

    // Delete the organization from Clerk
    try {
      await clerk.organizations.deleteOrganization(organizationId);
    } catch (deleteError) {
      console.error("[ORG_DELETE_CLERK]", deleteError);
      return { success: false, error: "Failed to delete organization from Clerk" };
    }

    return { success: true, affectedCount };
  } catch (error) {
    console.error("[DELETE_ORG]", error);
    return { success: false, error: "Failed to delete organization" };
  }
}
