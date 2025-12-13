"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";

// System-level organization ID for platform admin notifications
const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

export async function markNotificationRead(notificationId: string) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify the notification belongs to the current user
    // Include both org-specific and system-level notifications
    const notification = await prismadb.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
        organizationId: {
          in: [organizationId, SYSTEM_ORG_ID],
        },
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Update the notification
    await prismadb.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    // Return the updated notification
    const updated = await prismadb.notification.findUnique({
      where: { id: notificationId },
    });

    return updated;
  } catch (error) {
    console.error("[MARK_NOTIFICATION_READ]", error);
    throw error;
  }
}

export async function markAllNotificationsRead() {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Mark both org-specific and system-level notifications as read
    await prismadb.notification.updateMany({
      where: {
        userId: user.id,
        organizationId: {
          in: [organizationId, SYSTEM_ORG_ID],
        },
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MARK_ALL_NOTIFICATIONS_READ]", error);
    throw error;
  }
}
