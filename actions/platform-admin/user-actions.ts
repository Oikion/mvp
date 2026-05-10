"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { sanitizeAdminMessage } from "@/lib/platform-admin-utils";
import { generateFriendlyId } from "@/lib/friendly-id";
import { handleUserDeparture } from "@/lib/user-departure";
import { Resend } from "resend";
import { z } from "zod";
import { EMAIL_CONFIG } from "@/lib/resend-segments";
import { SYSTEM_ORG_ID } from "@/lib/sharing/constants";

// Validation schemas
const warningSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

const suspensionSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

const deleteSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

// Initialize Resend if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Result type for all actions
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send a warning to a user
 * Creates an in-app notification and sends an email
 */
export async function sendUserWarning(userId: string, reason: string): Promise<ActionResult> {
  try {
    // Verify admin access
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = warningSchema.safeParse({ userId, reason });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }
    
    const sanitizedReason = sanitizeAdminMessage(validation.data.reason);

    // Get user from database
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, clerkUserId: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Log the action
    await logAdminAction(admin.clerkId, "SEND_WARNING", userId, { reason: sanitizedReason });

    // Create in-app notification
    const notificationId = await generateFriendlyId(prismadb, "Notification", SYSTEM_ORG_ID);
    
    await prismadb.notification.create({
      data: {
        id: notificationId,
        userId: user.id,
        organizationId: SYSTEM_ORG_ID,
        type: "ACCOUNT_WARNING",
        title: "Account Warning",
        message: sanitizedReason,
        actorId: admin.clerkId,
        actorName: "Platform Administrator",
        metadata: {
          adminAction: true,
          warningDate: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    // Send email notification
    if (resend && user.email) {
      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: user.email,
          subject: "Important: Account Warning - Oikion",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">⚠️ Account Warning</h2>
              <p>Dear ${user.name || "User"},</p>
              <p>Your Oikion account has received a warning from our platform administrators:</p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #92400e;">${sanitizedReason}</p>
              </div>
              <p>Please review our terms of service and ensure your account activity complies with our policies.</p>
              <p>If you believe this warning was issued in error, please contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated message from Oikion Platform Administration.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[SEND_WARNING_EMAIL]", emailError);
        // Don't fail the action if email fails
      }
    }

    return { success: true, message: "Warning sent successfully" };
  } catch (error) {
    console.error("[SEND_USER_WARNING]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send warning";
    return { success: false, error: errorMessage };
  }
}

/**
 * Suspend a user account
 * Sets user status to INACTIVE and creates notification
 */
export async function suspendUser(userId: string, reason: string): Promise<ActionResult> {
  try {
    // Verify admin access
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = suspensionSchema.safeParse({ userId, reason });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }
    
    const sanitizedReason = sanitizeAdminMessage(validation.data.reason);

    // Get user from database
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, clerkUserId: true, userStatus: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.userStatus === "INACTIVE") {
      return { success: false, error: "User is already suspended" };
    }

    // Log the action
    await logAdminAction(admin.clerkId, "SUSPEND_ACCOUNT", userId, { reason: sanitizedReason });

    // Update user status to INACTIVE
    await prismadb.users.update({
      where: { id: userId },
      data: { userStatus: "INACTIVE" },
    });

    // Create in-app notification
    const notificationId = await generateFriendlyId(prismadb, "Notification", SYSTEM_ORG_ID);
    
    await prismadb.notification.create({
      data: {
        id: notificationId,
        userId: user.id,
        organizationId: SYSTEM_ORG_ID,
        type: "ACCOUNT_SUSPENSION",
        title: "Account Suspended",
        message: `Your account has been suspended. Reason: ${sanitizedReason}`,
        actorId: admin.clerkId,
        actorName: "Platform Administrator",
        metadata: {
          adminAction: true,
          suspensionDate: new Date().toISOString(),
          reason: sanitizedReason,
        },
        updatedAt: new Date(),
      },
    });

    // Ban user in Clerk (optional - prevents login)
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.banUser(user.clerkUserId);
      } catch (clerkError) {
        console.error("[CLERK_BAN_USER]", clerkError);
        // Continue even if Clerk ban fails
      }
    }

    // Send email notification
    if (resend && user.email) {
      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: user.email,
          subject: "Account Suspended - Oikion",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">🚫 Account Suspended</h2>
              <p>Dear ${user.name || "User"},</p>
              <p>Your Oikion account has been suspended by our platform administrators.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${sanitizedReason}</p>
              </div>
              <p>Your access to the platform has been restricted. If you believe this action was taken in error, please contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated message from Oikion Platform Administration.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[SEND_SUSPENSION_EMAIL]", emailError);
      }
    }

    return { success: true, message: "User suspended successfully" };
  } catch (error) {
    console.error("[SUSPEND_USER]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to suspend user";
    return { success: false, error: errorMessage };
  }
}

/**
 * Unsuspend a user account
 * Sets user status back to ACTIVE
 */
export async function unsuspendUser(userId: string, note?: string): Promise<ActionResult> {
  try {
    // Verify admin access
    const admin = await requirePlatformAdmin();

    // Get user from database
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, clerkUserId: true, userStatus: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.userStatus !== "INACTIVE") {
      return { success: false, error: "User is not suspended" };
    }

    // Log the action
    await logAdminAction(admin.clerkId, "UNSUSPEND_ACCOUNT", userId, { note });

    // Update user status to ACTIVE
    await prismadb.users.update({
      where: { id: userId },
      data: { userStatus: "ACTIVE" },
    });

    // Create in-app notification
    const notificationId = await generateFriendlyId(prismadb, "Notification", SYSTEM_ORG_ID);
    
    await prismadb.notification.create({
      data: {
        id: notificationId,
        userId: user.id,
        organizationId: SYSTEM_ORG_ID,
        type: "ACCOUNT_UNSUSPENSION",
        title: "Account Restored",
        message: "Your account has been restored and you can now access the platform.",
        actorId: admin.clerkId,
        actorName: "Platform Administrator",
        metadata: {
          adminAction: true,
          restorationDate: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    // Unban user in Clerk
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.unbanUser(user.clerkUserId);
      } catch (clerkError) {
        console.error("[CLERK_UNBAN_USER]", clerkError);
      }
    }

    // Send email notification
    if (resend && user.email) {
      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: user.email,
          subject: "Account Restored - Oikion",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">✅ Account Restored</h2>
              <p>Dear ${user.name || "User"},</p>
              <p>Good news! Your Oikion account has been restored and you can now access the platform again.</p>
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated message from Oikion Platform Administration.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[SEND_RESTORATION_EMAIL]", emailError);
      }
    }

    return { success: true, message: "User unsuspended successfully" };
  } catch (error) {
    console.error("[UNSUSPEND_USER]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to unsuspend user";
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a user account
 * Removes user from database and Clerk
 * Sends deletion notification email before deletion
 */
export async function deleteUser(userId: string, reason: string): Promise<ActionResult> {
  try {
    // Verify admin access
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = deleteSchema.safeParse({ userId, reason });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }
    
    const sanitizedReason = sanitizeAdminMessage(validation.data.reason);

    // Get user from database
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, clerkUserId: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Log the action BEFORE deletion
    await logAdminAction(admin.clerkId, "DELETE_ACCOUNT", userId, { 
      reason: sanitizedReason,
      userEmail: user.email, // Log for audit trail
    });

    // Send deletion notification email BEFORE deleting
    if (resend && user.email) {
      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: user.email,
          subject: "Account Deleted - Oikion",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Account Deleted</h2>
              <p>Dear ${user.name || "User"},</p>
              <p>Your Oikion account has been deleted by our platform administrators.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${sanitizedReason}</p>
              </div>
              <p>All your data has been removed from our platform. If you believe this action was taken in error, please contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated message from Oikion Platform Administration.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[SEND_DELETION_EMAIL]", emailError);
      }
    }

    // Handle departure from each org the user belongs to
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();

        // Get all org memberships for this user
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId: user.clerkUserId,
        });

        // Run departure for each org (nullify references, clean up personal data)
        for (const membership of memberships.data) {
          try {
            const result = await handleUserDeparture(
              user.id,
              membership.organization.id,
              "ADMIN_FORCE_DELETED"
            );
            if (result.errors.length > 0) {
              console.warn(
                `[DELETE_USER] Departure warnings for org ${membership.organization.id}:`,
                result.errors
              );
            }
          } catch (departureError) {
            console.error(
              `[DELETE_USER] Departure failed for org ${membership.organization.id}:`,
              departureError
            );
            // Continue with other orgs
          }
        }

        // Delete user from Clerk
        try {
          await clerk.users.deleteUser(user.clerkUserId);
        } catch (clerkError) {
          console.error("[CLERK_DELETE_USER]", clerkError);
          // Continue with database deletion even if Clerk fails
        }
      } catch (clerkError) {
        console.error("[CLERK_GET_MEMBERSHIPS]", clerkError);
        // Continue with database deletion even if Clerk fails
      }
    }

    // Delete the Users row (references already nullified by handleUserDeparture)
    await prismadb.users.delete({
      where: { id: userId },
    });

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("[DELETE_USER]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
    return { success: false, error: errorMessage };
  }
}









