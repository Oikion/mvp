"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";

export async function markNotificationRead(notificationId: string) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify the notification belongs to the current user and organization
    const notification = await prismadb.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
        organizationId,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Use updateMany to avoid the unique constraint issue with tenant filtering
    // We already verified ownership above, so this is safe
    await prismadb.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
        organizationId,
      },
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

    await prismadb.notification.updateMany({
      where: {
        userId: user.id,
        organizationId,
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






