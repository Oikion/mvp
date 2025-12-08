"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentOrgId } from "@/lib/get-current-user";

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

    const notification = await prismaTenant.notification.create({
      data: {
        userId: params.userId,
        organizationId,
        type: params.type as any,
        title: params.title,
        message: params.message,
        entityType: params.entityType as any,
        entityId: params.entityId,
        actorId: params.actorId,
        actorName: params.actorName,
        metadata: params.metadata || {},
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

    const notifications = await prismaTenant.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        organizationId,
        type: params.type as any,
        title: params.title,
        message: params.message,
        entityType: params.entityType as any,
        entityId: params.entityId,
        actorId: params.actorId,
        actorName: params.actorName,
        metadata: params.metadata || {},
      })),
    });

    return notifications;
  } catch (error) {
    console.error("[CREATE_NOTIFICATIONS_FOR_USERS]", error);
    throw error;
  }
}





