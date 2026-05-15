/**
 * Centralized Notification Service
 * Handles all notification creation and management
 */

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import {
  CreateNotificationInput,
  CreateBulkNotificationInput,
  NotificationCategory,
  NotificationEntityType,
} from "./types";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { sendNotificationEmailToUsers, type NotificationEmailData } from "./email-service";

/**
 * Create a single notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    const notification = await prismadb.notification.create({
      data: {
        id: randomUUID(),
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
        updatedAt: new Date(),
      },
    });

    // Invalidate cached notification counts for the recipient
    await cacheDel(`oik:notif:${input.organizationId}:${input.userId}`);

    // Fire-and-forget Ably push — never throws
    try {
      const { publishToChannel } = await import("@/lib/ably");
      await publishToChannel(`user:${input.userId}`, "notification:new", {
        notificationId: notification.id,
        category: notification.type,
        entityType: notification.entityType ?? null,
        entityId: notification.entityId ?? null,
      });
    } catch {
      // Ably failure is non-critical — notification is already persisted
    }
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
    const uniqueUserIds = Array.from(new Set(input.userIds));

    if (uniqueUserIds.length === 0) {
      return;
    }

    const now = new Date();
    await prismadb.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        id: randomUUID(),
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
        updatedAt: now,
      })),
    });

    // Invalidate cached notification counts for all recipients
    await Promise.all(
      uniqueUserIds.map((userId) =>
        cacheDel(`oik:notif:${input.organizationId}:${userId}`)
      )
    );

    // Fire-and-forget Ably push to all recipients — never throws
    try {
      const { publishToChannel } = await import("@/lib/ably");
      await Promise.all(
        uniqueUserIds.map((userId) =>
          publishToChannel(`user:${userId}`, "notification:new", {
            notificationId: null,
            category: input.type,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
          })
        )
      );
    } catch {
      // Non-critical
    }
  } catch (error) {
    console.error("[NOTIFICATION_SERVICE] Failed to create bulk notifications:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notification for all users in an organization (except actor)
 * Also sends email notifications via Resend based on user preferences
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
    // Get actual org members via Clerk (proper tenant isolation)
    const { users } = await getOrgMembersFromDb({
      organizationId,
      select: { id: true, userStatus: true },
    });

    // Only notify active users, excluding the actor (recipientIds are Prisma Users.id values)
    const recipientIds = users
      .filter((u) => u.userStatus === "ACTIVE" && u.id !== excludeUserId)
      .map((u) => u.id);

    if (recipientIds.length === 0) {
      return;
    }

    // Create in-app notifications
    await createBulkNotifications({
      userIds: recipientIds,
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

    // Send email notifications (fire-and-forget, respects user preferences)
    const emailData: Omit<NotificationEmailData, "recipientName"> = {
      actorName: options?.actorName,
      actorId: options?.actorId,
      entityId: options?.entityId,
      entityName: options?.metadata?.entityName || options?.metadata?.clientName || options?.metadata?.propertyName,
      entityType: options?.entityType,
      metadata: options?.metadata,
    };

    sendNotificationEmailToUsers(recipientIds, type, emailData).catch((err) => {
      console.error("[NOTIFICATION_SERVICE] Email delivery failed (non-blocking):", err);
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



