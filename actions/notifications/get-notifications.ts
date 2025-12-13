"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { NotificationCategory, Prisma } from "@prisma/client";

// System-level organization ID for platform admin notifications
const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

export async function getNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
}) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Include both organization-specific and system-level notifications
    // Using prismadb directly to avoid tenant filtering for system notifications
    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      organizationId: {
        in: [organizationId, SYSTEM_ORG_ID],
      },
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

    const notifications = await prismadb.notification.findMany({
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

    const count = await prismadb.notification.count({
      where: {
        userId: user.id,
        organizationId: {
          in: [organizationId, SYSTEM_ORG_ID],
        },
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

    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      organizationId: {
        in: [organizationId, SYSTEM_ORG_ID],
      },
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

    const count = await prismadb.notification.count({ where });
    return count;
  } catch (error) {
    console.error("[GET_TOTAL_NOTIFICATIONS_COUNT]", error);
    return 0;
  }
}
