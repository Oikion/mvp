"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { NotificationCategory, Prisma } from "@prisma/client";
import { requireAction } from "@/lib/permissions/action-guards";

// System-level organization ID for platform admin notifications
const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

export async function getNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
}) {
  try {
    // Check permission to read notifications
    const guard = await requireAction("notification:read");
    if (guard) return [];

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

/**
 * Map notification types to pages for sidebar badges
 */
const PAGE_NOTIFICATION_TYPES: Record<string, NotificationCategory[]> = {
  connections: [
    NotificationCategory.CONNECTION_REQUEST,
    NotificationCategory.CONNECTION_ACCEPTED,
  ],
  socialFeed: [
    NotificationCategory.SOCIAL_POST_LIKED,
    NotificationCategory.SOCIAL_POST_COMMENTED,
    NotificationCategory.SOCIAL_POST_MENTIONED,
  ],
  sharedWithMe: [
    NotificationCategory.ENTITY_SHARED_WITH_YOU,
    NotificationCategory.DOCUMENT_SHARED,
  ],
  calendar: [
    NotificationCategory.CALENDAR_EVENT_INVITED,
    NotificationCategory.CALENDAR_REMINDER,
    NotificationCategory.CALENDAR_EVENT_CREATED,
    NotificationCategory.CALENDAR_EVENT_UPDATED,
  ],
  deals: [
    NotificationCategory.DEAL_PROPOSED,
    NotificationCategory.DEAL_ACCEPTED,
    NotificationCategory.DEAL_COMPLETED,
    NotificationCategory.DEAL_UPDATED,
  ],
  messages: [
    NotificationCategory.MESSAGE_RECEIVED,
    NotificationCategory.MESSAGE_MENTION,
    NotificationCategory.CHANNEL_INVITE,
    NotificationCategory.CHANNEL_MESSAGE,
  ],
  crm: [
    NotificationCategory.TASK_ASSIGNED,
    NotificationCategory.TASK_COMMENT_ADDED,
    NotificationCategory.CLIENT_CREATED,
    NotificationCategory.CLIENT_ASSIGNED,
    NotificationCategory.ACCOUNT_UPDATED,
    NotificationCategory.ACCOUNT_TASK_CREATED,
  ],
  mls: [
    NotificationCategory.PROPERTY_CREATED,
    NotificationCategory.PROPERTY_ASSIGNED,
    NotificationCategory.PROPERTY_UPDATED,
  ],
};

export type PageNotificationCounts = {
  [key: string]: number;
};

/**
 * Get unread notification counts grouped by page
 * Used for sidebar notification badges
 */
export async function getUnreadCountsByPage(): Promise<PageNotificationCounts> {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get all unread notifications with their types
    const unreadNotifications = await prismadb.notification.findMany({
      where: {
        userId: user.id,
        organizationId: {
          in: [organizationId, SYSTEM_ORG_ID],
        },
        read: false,
      },
      select: {
        type: true,
      },
    });

    // Count notifications by page
    const counts: PageNotificationCounts = {};

    for (const [page, types] of Object.entries(PAGE_NOTIFICATION_TYPES)) {
      counts[page] = unreadNotifications.filter((n) =>
        types.includes(n.type)
      ).length;
    }

    return counts;
  } catch (error) {
    console.error("[GET_UNREAD_COUNTS_BY_PAGE]", error);
    return {};
  }
}
