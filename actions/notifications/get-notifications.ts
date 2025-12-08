"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { NotificationCategory, Prisma } from "@prisma/client";

export async function getNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
}) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      organizationId,
    };

    if (options?.unreadOnly) {
      where.read = false;
    }

    if (options?.type) {
      // Validate that the type is a valid NotificationCategory
      const validCategories = Object.values(NotificationCategory);
      if (validCategories.includes(options.type as NotificationCategory)) {
        where.type = options.type as NotificationCategory;
      }
    }

    const notifications = await prismaTenant.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return notifications;
  } catch (error) {
    console.error("[GET_NOTIFICATIONS]", error);
    // Return empty array instead of throwing to prevent page crashes
    return [];
  }
}

export async function getUnreadCount() {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const count = await prismaTenant.notification.count({
      where: {
        userId: user.id,
        organizationId,
        read: false,
      },
    });

    return count;
  } catch (error) {
    console.error("[GET_UNREAD_COUNT]", error);
    return 0;
  }
}

export async function getTotalNotificationsCount(options?: {
  unreadOnly?: boolean;
  type?: string;
}) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      organizationId,
    };

    if (options?.unreadOnly) {
      where.read = false;
    }

    if (options?.type) {
      // Validate that the type is a valid NotificationCategory
      const validCategories = Object.values(NotificationCategory);
      if (validCategories.includes(options.type as NotificationCategory)) {
        where.type = options.type as NotificationCategory;
      }
    }

    const count = await prismaTenant.notification.count({ where });
    return count;
  } catch (error) {
    console.error("[GET_TOTAL_NOTIFICATIONS_COUNT]", error);
    return 0;
  }
}
