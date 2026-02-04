"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId, generateFriendlyIds } from "@/lib/friendly-id";
import { prismadb } from "@/lib/prisma";

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    // Generate friendly ID
    const notificationId = await generateFriendlyId(prismadb, "Notification");

    const notification = await prismaTenant.notification.create({
      data: {
        id: notificationId,
        userId: params.userId,
        organizationId,
        type: params.type as unknown as import("@prisma/client").NotificationCategory,
        title: params.title,
        message: params.message,
        entityType: params.entityType as unknown as import("@prisma/client").NotificationEntityType,
        entityId: params.entityId,
        actorId: params.actorId,
        actorName: params.actorName,
        metadata: params.metadata || {},
        updatedAt: new Date(),
      },
    });

    return notification;
  } catch (error) {
    console.error("[CREATE_NOTIFICATION]", error);
    throw error;
  }
}

/**
 * Create notifications for multiple users (e.g., all watchers of an account)
 */
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    // Generate friendly IDs for all notifications
    const notificationIds = await generateFriendlyIds(prismadb, "Notification", userIds.length);

    const notifications = await prismaTenant.notification.createMany({
      data: userIds.map((userId, index) => ({
        id: notificationIds[index],
        userId,
        organizationId,
        type: params.type as unknown as import("@prisma/client").NotificationCategory,
        title: params.title,
        message: params.message,
        entityType: params.entityType as unknown as import("@prisma/client").NotificationEntityType,
        entityId: params.entityId,
        actorId: params.actorId,
        actorName: params.actorName,
        metadata: params.metadata || {},
        updatedAt: new Date(),
      })),
    });

    return notifications;
  } catch (error) {
    console.error("[CREATE_NOTIFICATIONS_FOR_USERS]", error);
    throw error;
  }
}





