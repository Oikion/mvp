/**
 * Centralized Notification Service
 * Handles all notification creation and management
 */

import { prismadb } from "@/lib/prisma";
import {
  CreateNotificationInput,
  CreateBulkNotificationInput,
  NotificationCategory,
  NotificationEntityType,
} from "./types";

/**
 * Create a single notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await prismadb.notification.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        actorName: input.actorName,
        metadata: input.metadata || {},
      },
    });
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to create notification:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  input: CreateBulkNotificationInput
): Promise<void> {
  try {
    // Filter out any duplicate user IDs
    const uniqueUserIds = [...new Set(input.userIds)];

    if (uniqueUserIds.length === 0) {
      return;
    }

    await prismadb.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        actorName: input.actorName,
        metadata: input.metadata || {},
      })),
    });
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to create bulk notifications:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notification for all users in an organization (except actor)
 */
export async function notifyOrganization(
  organizationId: string,
  excludeUserId: string | null,
  type: NotificationCategory,
  title: string,
  message: string,
  options?: {
    entityType?: NotificationEntityType;
    entityId?: string;
    actorId?: string;
    actorName?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    // Get all users in the organization
    // Note: In a multi-org setup, you'd need to query based on org membership
    // For now, we'll use a simpler approach
    const users = await prismadb.users.findMany({
      where: {
        userStatus: "ACTIVE",
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (users.length === 0) {
      return;
    }

    await createBulkNotifications({
      userIds: users.map((u) => u.id),
      organizationId,
      type,
      title,
      message,
      entityType: options?.entityType,
      entityId: options?.entityId,
      actorId: options?.actorId,
      actorName: options?.actorName,
      metadata: options?.metadata,
    });
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to notify organization:", error);
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  userId: string,
  organizationId: string
): Promise<number> {
  try {
    return await prismadb.notification.count({
      where: {
        userId,
        organizationId,
        read: false,
      },
    });
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to get unread count:", error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    await prismadb.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to mark as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    await prismadb.notification.updateMany({
      where: {
        userId,
        organizationId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to mark all as read:", error);
    return false;
  }
}

/**
 * Delete old notifications (older than specified days)
 */
export async function cleanupOldNotifications(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prismadb.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        read: true, // Only delete read notifications
      },
    });

    return result.count;
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to cleanup old notifications:", error);
    return 0;
  }
}




