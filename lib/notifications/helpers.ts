/**
 * Notification Helpers
 * Convenience functions for common notification scenarios
 */

import { createNotification, createBulkNotifications, notifyOrganization } from "./notification-service";
import { prismadb } from "@/lib/prisma";
import {
  SocialNotificationPayload,
  SharingNotificationPayload,
  EntityCreationPayload,
  DealNotificationPayload,
  ConnectionNotificationPayload,
  TaskNotificationPayload,
  CalendarNotificationPayload,
} from "./types";

// ============================================
// SOCIAL FEED NOTIFICATIONS
// ============================================

/**
 * Notify post author when someone likes their post
 */
export async function notifyPostLiked(payload: SocialNotificationPayload): Promise<void> {
  // Don't notify if user liked their own post
  if (payload.actorId === payload.postAuthorId) {
    return;
  }

  await createNotification({
    userId: payload.postAuthorId,
    organizationId: payload.organizationId,
    type: "SOCIAL_POST_LIKED",
    title: "Someone liked your post",
    message: `${payload.actorName} liked your post${payload.postContent ? `: "${truncate(payload.postContent, 50)}"` : ""}`,
    entityType: "SOCIAL_POST",
    entityId: payload.postId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      postContent: payload.postContent,
    },
  });
}

/**
 * Notify post author when someone comments on their post
 */
export async function notifyPostCommented(
  payload: SocialNotificationPayload & { commentContent: string }
): Promise<void> {
  // Don't notify if user commented on their own post
  if (payload.actorId === payload.postAuthorId) {
    return;
  }

  await createNotification({
    userId: payload.postAuthorId,
    organizationId: payload.organizationId,
    type: "SOCIAL_POST_COMMENTED",
    title: "New comment on your post",
    message: `${payload.actorName} commented: "${truncate(payload.commentContent, 100)}"`,
    entityType: "SOCIAL_POST",
    entityId: payload.postId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      commentContent: payload.commentContent,
      postContent: payload.postContent,
    },
  });
}

// ============================================
// SHARING NOTIFICATIONS
// ============================================

/**
 * Notify user when something is shared with them
 */
export async function notifyEntityShared(payload: SharingNotificationPayload): Promise<void> {
  const entityTypeLabel = payload.entityType.toLowerCase();

  await createNotification({
    userId: payload.sharedWithId,
    organizationId: payload.organizationId,
    type: "ENTITY_SHARED_WITH_YOU",
    title: `${payload.sharedByName} shared a ${entityTypeLabel} with you`,
    message: payload.message
      ? `"${payload.entityName}" - ${payload.message}`
      : `"${payload.entityName}" has been shared with you`,
    entityType: payload.entityType === "PROPERTY" ? "PROPERTY" : 
                payload.entityType === "CLIENT" ? "ACCOUNT" : "DOCUMENT",
    entityId: payload.entityId,
    actorId: payload.sharedById,
    actorName: payload.sharedByName,
    metadata: {
      entityName: payload.entityName,
      entityType: payload.entityType,
      shareMessage: payload.message,
    },
  });
}

// ============================================
// ENTITY CREATION NOTIFICATIONS
// ============================================

/**
 * Notify organization when a new client is created
 */
export async function notifyClientCreated(payload: EntityCreationPayload): Promise<void> {
  // Notify all org members except the creator
  await notifyOrganization(
    payload.organizationId,
    payload.creatorId,
    "CLIENT_CREATED",
    "New client added",
    `${payload.creatorName} added a new client: "${payload.entityName}"`,
    {
      entityType: "ACCOUNT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        clientName: payload.entityName,
      },
    }
  );

  // If assigned to someone else, send additional assignment notification
  if (payload.assignedToId && payload.assignedToId !== payload.creatorId) {
    await createNotification({
      userId: payload.assignedToId,
      organizationId: payload.organizationId,
      type: "CLIENT_ASSIGNED",
      title: "Client assigned to you",
      message: `${payload.creatorName} assigned the client "${payload.entityName}" to you`,
      entityType: "ACCOUNT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        clientName: payload.entityName,
      },
    });
  }
}

/**
 * Notify organization when a new property is created
 */
export async function notifyPropertyCreated(payload: EntityCreationPayload): Promise<void> {
  // Notify all org members except the creator
  await notifyOrganization(
    payload.organizationId,
    payload.creatorId,
    "PROPERTY_CREATED",
    "New property added",
    `${payload.creatorName} added a new property: "${payload.entityName}"`,
    {
      entityType: "PROPERTY",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        propertyName: payload.entityName,
      },
    }
  );

  // If assigned to someone else, send additional assignment notification
  if (payload.assignedToId && payload.assignedToId !== payload.creatorId) {
    await createNotification({
      userId: payload.assignedToId,
      organizationId: payload.organizationId,
      type: "PROPERTY_ASSIGNED",
      title: "Property assigned to you",
      message: `${payload.creatorName} assigned the property "${payload.entityName}" to you`,
      entityType: "PROPERTY",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        propertyName: payload.entityName,
      },
    });
  }
}

// ============================================
// DEAL NOTIFICATIONS
// ============================================

/**
 * Notify user about a deal proposal
 */
export async function notifyDealProposed(payload: DealNotificationPayload): Promise<void> {
  await createNotification({
    userId: payload.targetUserId,
    organizationId: payload.organizationId,
    type: "DEAL_PROPOSED",
    title: "New deal proposal",
    message: `${payload.actorName} proposed a deal for "${payload.propertyName}" with client "${payload.clientName}"`,
    entityType: "DEAL",
    entityId: payload.dealId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      dealTitle: payload.dealTitle,
      propertyName: payload.propertyName,
      clientName: payload.clientName,
    },
  });
}

/**
 * Notify user when a deal status changes
 */
export async function notifyDealStatusChanged(payload: DealNotificationPayload): Promise<void> {
  const statusMessages: Record<string, string> = {
    ACCEPTED: "was accepted",
    COMPLETED: "has been completed",
    CANCELLED: "was cancelled",
    IN_PROGRESS: "is now in progress",
    NEGOTIATING: "is under negotiation",
  };

  const statusMessage = statusMessages[payload.status || ""] || "was updated";

  await createNotification({
    userId: payload.targetUserId,
    organizationId: payload.organizationId,
    type: payload.status === "ACCEPTED" ? "DEAL_ACCEPTED" : 
          payload.status === "COMPLETED" ? "DEAL_COMPLETED" : "DEAL_UPDATED",
    title: `Deal ${statusMessage}`,
    message: `The deal for "${payload.propertyName}" ${statusMessage}`,
    entityType: "DEAL",
    entityId: payload.dealId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      dealTitle: payload.dealTitle,
      propertyName: payload.propertyName,
      clientName: payload.clientName,
      status: payload.status,
    },
  });
}

// ============================================
// CONNECTION NOTIFICATIONS
// ============================================

/**
 * Notify user of a connection request
 */
export async function notifyConnectionRequest(payload: ConnectionNotificationPayload): Promise<void> {
  await createNotification({
    userId: payload.targetId,
    organizationId: payload.organizationId,
    type: "CONNECTION_REQUEST",
    title: "New connection request",
    message: `${payload.requesterName} wants to connect with you`,
    entityType: "CONNECTION",
    entityId: payload.connectionId,
    actorId: payload.requesterId,
    actorName: payload.requesterName,
  });
}

/**
 * Notify user when their connection request is accepted
 */
export async function notifyConnectionAccepted(payload: ConnectionNotificationPayload): Promise<void> {
  await createNotification({
    userId: payload.requesterId,
    organizationId: payload.organizationId,
    type: "CONNECTION_ACCEPTED",
    title: "Connection accepted",
    message: `${payload.requesterName} accepted your connection request`,
    entityType: "CONNECTION",
    entityId: payload.connectionId,
    actorId: payload.targetId,
    actorName: payload.requesterName,
  });
}

// ============================================
// TASK NOTIFICATIONS
// ============================================

/**
 * Notify user when a task is assigned to them
 */
export async function notifyTaskAssigned(payload: TaskNotificationPayload): Promise<void> {
  if (payload.actorId === payload.recipientId) {
    return; // Don't notify if assigning to yourself
  }

  await createNotification({
    userId: payload.recipientId,
    organizationId: payload.organizationId,
    type: "TASK_ASSIGNED",
    title: "Task assigned to you",
    message: `${payload.actorName} assigned "${payload.taskTitle}" to you${payload.accountName ? ` (${payload.accountName})` : ""}`,
    entityType: "TASK",
    entityId: payload.taskId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      taskTitle: payload.taskTitle,
      accountId: payload.accountId,
      accountName: payload.accountName,
    },
  });
}

/**
 * Notify task owner/assignee when a comment is added
 */
export async function notifyTaskCommented(
  payload: TaskNotificationPayload & { commentContent: string }
): Promise<void> {
  if (payload.actorId === payload.recipientId) {
    return; // Don't notify if commenting on own task
  }

  await createNotification({
    userId: payload.recipientId,
    organizationId: payload.organizationId,
    type: "TASK_COMMENT_ADDED",
    title: "New comment on task",
    message: `${payload.actorName} commented on "${payload.taskTitle}": "${truncate(payload.commentContent, 80)}"`,
    entityType: "TASK",
    entityId: payload.taskId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      taskTitle: payload.taskTitle,
      commentContent: payload.commentContent,
      accountId: payload.accountId,
      accountName: payload.accountName,
    },
  });
}

// ============================================
// CALENDAR NOTIFICATIONS
// ============================================

/**
 * Notify users when they are invited to an event
 */
export async function notifyEventInvite(payload: CalendarNotificationPayload): Promise<void> {
  const recipientIds = payload.recipientIds.filter((id) => id !== payload.actorId);

  if (recipientIds.length === 0) {
    return;
  }

  await createBulkNotifications({
    userIds: recipientIds,
    organizationId: payload.organizationId,
    type: "CALENDAR_EVENT_INVITED",
    title: "You've been invited to an event",
    message: `${payload.actorName || "Someone"} invited you to "${payload.eventTitle}" on ${formatDate(payload.eventStartTime)}`,
    entityType: "CALENDAR_EVENT",
    entityId: payload.eventId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      eventTitle: payload.eventTitle,
      eventStartTime: payload.eventStartTime.toISOString(),
    },
  });
}

/**
 * Notify watchers when an account is updated
 */
export async function notifyAccountWatchers(
  accountId: string,
  organizationId: string,
  type: "ACCOUNT_UPDATED" | "ACCOUNT_DELETED" | "ACCOUNT_TASK_CREATED" | "ACCOUNT_TASK_UPDATED",
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Get the account with watchers
    const account = await prismadb.clients.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        client_name: true,
        watching_users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!account || !account.watching_users || account.watching_users.length === 0) {
      return;
    }

    const watcherIds = account.watching_users.map((u) => u.id);

    // Exclude the actor from notifications if provided
    const actorId = metadata?.updatedBy;
    const filteredIds = actorId
      ? watcherIds.filter((id) => id !== actorId)
      : watcherIds;

    if (filteredIds.length === 0) {
      return;
    }

    await createBulkNotifications({
      userIds: filteredIds,
      organizationId,
      type,
      title,
      message,
      entityType: "ACCOUNT",
      entityId: accountId,
      actorId: metadata?.updatedBy,
      actorName: metadata?.updatedByName,
      metadata: {
        accountName: account.client_name,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("[NOTIFY_ACCOUNT_WATCHERS]", error);
  }
}

/**
 * Notify watchers when a property is updated
 */
export async function notifyPropertyWatchers(
  propertyId: string,
  organizationId: string,
  type: "PROPERTY_UPDATED" | "PROPERTY_DELETED",
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Get the property with watchers
    const property = await prismadb.properties.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        property_name: true,
        watching_users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!property || !property.watching_users || property.watching_users.length === 0) {
      return;
    }

    const watcherIds = property.watching_users.map((u) => u.id);

    // Exclude the actor from notifications if provided
    const actorId = metadata?.updatedBy;
    const filteredIds = actorId
      ? watcherIds.filter((id) => id !== actorId)
      : watcherIds;

    if (filteredIds.length === 0) {
      return;
    }

    await createBulkNotifications({
      userIds: filteredIds,
      organizationId,
      type,
      title,
      message,
      entityType: "PROPERTY",
      entityId: propertyId,
      actorId: metadata?.updatedBy,
      actorName: metadata?.updatedByName,
      metadata: {
        propertyName: property.property_name,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("[NOTIFY_PROPERTY_WATCHERS]", error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}









