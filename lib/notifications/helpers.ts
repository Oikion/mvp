/**
 * Notification Helpers
 * Convenience functions for common notification scenarios
 * Now includes email notifications based on user preferences
 */

import { createNotification, createBulkNotifications, notifyOrganization } from "./notification-service";
import { sendNotificationEmail, sendNotificationEmailToUsers } from "./email-service";
import { SYSTEM_ORG_ID } from "@/lib/sharing/constants";
import { prismadb } from "@/lib/prisma";
import { NotificationCategory, NotificationEntityType } from "@prisma/client";
import {
  SocialNotificationPayload,
  SharingNotificationPayload,
  EntityCreationPayload,
  DealNotificationPayload,
  ConnectionNotificationPayload,
  TaskNotificationPayload,
  CalendarNotificationPayload,
  EntityAccessRequestPayload,
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

  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.postAuthorId, "SOCIAL_POST_LIKED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.postId,
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

  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.postAuthorId, "SOCIAL_POST_COMMENTED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.postId,
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

  // Create in-app notification
  await createNotification({
    userId: payload.sharedWithId,
    organizationId: SYSTEM_ORG_ID, // Use system org for cross-org visibility
    type: "ENTITY_SHARED_WITH_YOU",
    title: `${payload.sharedByName} shared a ${entityTypeLabel} with you`,
    message: payload.message
      ? `"${payload.entityName}" - ${payload.message}`
      : `"${payload.entityName}" has been shared with you`,
    entityType: payload.entityType === "PROPERTY" ? "PROPERTY" :
                payload.entityType === "CONTACT" ? "CONTACT" :
                payload.entityType === "REQUEST" ? "REQUEST" : "DOCUMENT",
    entityId: payload.entityId,
    actorId: payload.sharedById,
    actorName: payload.sharedByName,
    metadata: {
      entityName: payload.entityName,
      entityType: payload.entityType,
      shareMessage: payload.message,
    },
  });

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.sharedWithId, "ENTITY_SHARED_WITH_YOU", {
    actorName: payload.sharedByName,
    actorId: payload.sharedById,
    entityId: payload.entityId,
    entityName: payload.entityName,
    metadata: {
      entityType: payload.entityType,
      shareMessage: payload.message,
    },
  });
}

// ============================================
// ENTITY ACCESS REQUEST NOTIFICATIONS
// ============================================

/**
 * Notify the entity owner when someone requests access to their entity.
 * The owner can then decide to grant access via shareEntity().
 */
export async function notifyEntityAccessRequested(payload: EntityAccessRequestPayload): Promise<void> {
  const entityTypeLabel = payload.entityType.charAt(0) + payload.entityType.slice(1).toLowerCase();

  await createNotification({
    userId: payload.ownerId,
    organizationId: payload.ownerOrganizationId,
    type: "ENTITY_ACCESS_REQUESTED",
    title: `${payload.requesterName} requested access to your ${entityTypeLabel}`,
    message: `"${payload.entityName}" — access request from ${payload.requesterName}`,
    entityType: payload.entityType as NotificationEntityType,
    entityId: payload.entityId,
    actorId: payload.requesterId,
    actorName: payload.requesterName,
    metadata: {
      entityName: payload.entityName,
      entityType: payload.entityType,
      requesterId: payload.requesterId,
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
 * Notify organization when a new contact is created
 */
export async function notifyContactCreated(payload: EntityCreationPayload): Promise<void> {
  // Notify all org members except the creator
  await notifyOrganization(
    payload.organizationId,
    payload.creatorId,
    "CONTACT_CREATED",
    "New contact added",
    `${payload.creatorName} added a new contact: "${payload.entityName}"`,
    {
      entityType: "CONTACT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        contactName: payload.entityName,
      },
    }
  );

  // If assigned to someone else, send additional assignment notification
  if (payload.assignedToId && payload.assignedToId !== payload.creatorId) {
    await createNotification({
      userId: payload.assignedToId,
      organizationId: payload.organizationId,
      type: "CONTACT_ASSIGNED",
      title: "Contact assigned to you",
      message: `${payload.creatorName} assigned the contact "${payload.entityName}" to you`,
      entityType: "CONTACT",
      entityId: payload.entityId,
      actorId: payload.creatorId,
      actorName: payload.creatorName,
      metadata: {
        contactName: payload.entityName,
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
  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.targetUserId, "DEAL_PROPOSED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.dealId,
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
  const notificationType = payload.status === "ACCEPTED" ? "DEAL_ACCEPTED" : 
        payload.status === "COMPLETED" ? "DEAL_COMPLETED" : "DEAL_UPDATED";

  // Create in-app notification
  await createNotification({
    userId: payload.targetUserId,
    organizationId: payload.organizationId,
    type: notificationType,
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.targetUserId, notificationType, {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.dealId,
    metadata: {
      dealTitle: payload.dealTitle,
      propertyName: payload.propertyName,
      clientName: payload.clientName,
      status: payload.status,
    },
  });
}

/**
 * Notify relevant agents when a deal advances through the pipeline.
 * Sends to listingAgentId + buyerAgentId, excluding the actor.
 */
export async function notifyDealStageChanged(payload: {
  dealId: string;
  dealTitle: string;
  fromStage: string;
  toStage: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  listingAgentId?: string | null;
  buyerAgentId?: string | null;
}): Promise<void> {
  // Collect unique recipient IDs, excluding the actor
  const recipientIds = Array.from(new Set([
    payload.listingAgentId,
    payload.buyerAgentId,
  ].filter((id): id is string => !!id && id !== payload.actorId)));

  if (recipientIds.length === 0) return;

  const title = `Deal stage updated`;
  const message = `${payload.actorName} moved "${payload.dealTitle}" from ${payload.fromStage} to ${payload.toStage}`;

  await createBulkNotifications({
    userIds: recipientIds,
    organizationId: payload.organizationId,
    type: "DEAL_STAGE_CHANGED",
    title,
    message,
    entityType: "DEAL",
    entityId: payload.dealId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      dealTitle: payload.dealTitle,
      fromStage: payload.fromStage,
      toStage: payload.toStage,
    },
  });

  // Email is intentionally fire-and-forget — failures are non-critical and
  // caught here so they don't surface through the outer .catch() at the call site.
  sendNotificationEmailToUsers(recipientIds, "DEAL_STAGE_CHANGED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.dealId,
    metadata: {
      dealTitle: payload.dealTitle,
      fromStage: payload.fromStage,
      toStage: payload.toStage,
    },
  }).catch((err) => console.error("[DEAL_STAGE_NOTIFICATION]", err));
}

// ============================================
// CONNECTION NOTIFICATIONS
// ============================================

/**
 * Notify user of a connection request
 */
export async function notifyConnectionRequest(payload: ConnectionNotificationPayload): Promise<void> {
  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.targetId, "CONNECTION_REQUEST", {
    actorName: payload.requesterName,
    actorId: payload.requesterId,
    entityId: payload.connectionId,
  });
}

/**
 * Notify user when their connection request is accepted
 */
export async function notifyConnectionAccepted(payload: ConnectionNotificationPayload): Promise<void> {
  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.requesterId, "CONNECTION_ACCEPTED", {
    actorName: payload.requesterName,
    actorId: payload.targetId,
    entityId: payload.connectionId,
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

  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.recipientId, "TASK_ASSIGNED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.taskId,
    entityName: payload.taskTitle,
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

  // Create in-app notification
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

  // Send email notification (respects user preferences)
  await sendNotificationEmail(payload.recipientId, "TASK_COMMENT_ADDED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.taskId,
    entityName: payload.taskTitle,
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

  // Create in-app notifications
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

  // Send email notifications to all recipients (respects user preferences)
  await sendNotificationEmailToUsers(recipientIds, "CALENDAR_EVENT_INVITED", {
    actorName: payload.actorName,
    actorId: payload.actorId,
    entityId: payload.eventId,
    entityName: payload.eventTitle,
    metadata: {
      eventTitle: payload.eventTitle,
      startTime: payload.eventStartTime,
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
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Get the contact with watchers
    const contact = await prismadb.contact.findFirst({
      where: { id: accountId, organizationId },
      select: {
        id: true,
        displayName: true,
        watchers: true,
      },
    });

    if (!contact || !contact.watchers || contact.watchers.length === 0) {
      return;
    }

    const watcherIds = contact.watchers;
    const actorId = metadata?.updatedBy as string | undefined;
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
      entityType: "CONTACT",
      entityId: accountId,
      actorId: metadata?.updatedBy as string | undefined,
      actorName: metadata?.updatedByName as string | undefined,
      metadata: {
        accountName: contact.displayName,
        ...metadata,
      },
    });

    await sendNotificationEmailToUsers(filteredIds, type, {
      actorName: metadata?.updatedByName as string | undefined,
      actorId: metadata?.updatedBy as string | undefined,
      entityId: accountId,
      entityName: contact.displayName,
      metadata,
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
    // Get the property with watchers (watchers is a String[] of user IDs)
    const property = await prismadb.properties.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        property_name: true,
        watchers: true,
      },
    });

    if (!property || !property.watchers || property.watchers.length === 0) {
      return;
    }

    const watcherIds = property.watchers;

    // Exclude the actor from notifications if provided
    const actorId = metadata?.updatedBy;
    const filteredIds = actorId
      ? watcherIds.filter((id) => id !== actorId)
      : watcherIds;

    if (filteredIds.length === 0) {
      return;
    }

    // Create in-app notifications
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

    // Send email notifications to watchers (respects user preferences)
    await sendNotificationEmailToUsers(filteredIds, type, {
      actorName: metadata?.updatedByName,
      actorId: metadata?.updatedBy,
      entityId: propertyId,
      entityName: property.property_name,
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

// ============================================
// REQUEST NOTIFICATIONS
// ============================================

/**
 * Notify org when a new request is created, and assignee if different from actor
 */
export async function notifyRequestCreated(payload: {
  requestId: string;
  requestFriendlyId: string;
  requestType: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  assignedAgentId?: string | null;
}): Promise<void> {
  // Notify org (excluding actor)
  void notifyOrganization(
    payload.organizationId,
    payload.actorId,
    "REQUEST_CREATED",
    "New request created",
    `${payload.actorName} created a new ${payload.requestType} request`,
    {
      entityType: "REQUEST",
      entityId: payload.requestId,
      actorId: payload.actorId,
      actorName: payload.actorName,
      metadata: { requestFriendlyId: payload.requestFriendlyId, requestType: payload.requestType },
    }
  ).catch((err) => console.error("[REQUEST_CREATED_NOTIFY]", err));

  // Notify the assignee separately if they're different from actor — fire-and-forget
  if (payload.assignedAgentId && payload.assignedAgentId !== payload.actorId) {
    void createNotification({
      userId: payload.assignedAgentId,
      organizationId: payload.organizationId,
      type: "REQUEST_ASSIGNED",
      title: "Request assigned to you",
      message: `${payload.actorName} assigned a ${payload.requestType} request to you`,
      entityType: "REQUEST",
      entityId: payload.requestId,
      actorId: payload.actorId,
      actorName: payload.actorName,
      metadata: { requestFriendlyId: payload.requestFriendlyId },
    }).catch((err) => console.error("[REQUEST_CREATED_ASSIGNEE_NOTIFY]", err));
  }
}

/**
 * Notify new (and previous) assignee when a request is reassigned
 */
export async function notifyRequestAssigned(payload: {
  requestId: string;
  requestFriendlyId: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  newAssigneeId: string;
  previousAssigneeId?: string | null;
}): Promise<void> {
  const { requestId, requestFriendlyId, organizationId, actorId, actorName, newAssigneeId, previousAssigneeId } = payload;

  const recipientIds: string[] = [];

  // Notify new assignee (if not the actor)
  if (newAssigneeId !== actorId) {
    recipientIds.push(newAssigneeId);
  }

  // Notify previous assignee on reassignment (if not the actor, not the new assignee)
  if (previousAssigneeId && previousAssigneeId !== actorId && previousAssigneeId !== newAssigneeId) {
    recipientIds.push(previousAssigneeId);
  }

  if (recipientIds.length === 0) return;

  const uniqueRecipients = Array.from(new Set(recipientIds));

  // New assignee gets REQUEST_ASSIGNED; previous assignee gets REQUEST_STATUS_CHANGED
  const newAssigneeRecipients = uniqueRecipients.filter((id) => id === newAssigneeId);
  const prevAssigneeRecipients = uniqueRecipients.filter((id) => id !== newAssigneeId);

  if (newAssigneeRecipients.length > 0) {
    await createBulkNotifications({
      userIds: newAssigneeRecipients,
      organizationId,
      type: "REQUEST_ASSIGNED",
      title: "Request assigned to you",
      message: `${actorName} assigned a request to you`,
      entityType: "REQUEST",
      entityId: requestId,
      actorId,
      actorName,
      metadata: { requestFriendlyId },
    });
  }

  if (prevAssigneeRecipients.length > 0) {
    await createBulkNotifications({
      userIds: prevAssigneeRecipients,
      organizationId,
      type: "REQUEST_STATUS_CHANGED",
      title: "Request reassigned",
      message: `${actorName} reassigned a request you were assigned to`,
      entityType: "REQUEST",
      entityId: requestId,
      actorId,
      actorName,
      metadata: { requestFriendlyId },
    });
  }
}

/**
 * Notify assignee when a request status changes
 */
export async function notifyRequestStatusChanged(payload: {
  requestId: string;
  requestFriendlyId: string;
  fromStatus: string;
  toStatus: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  assignedAgentId?: string | null;
}): Promise<void> {
  const recipientIds: string[] = [];
  if (payload.assignedAgentId && payload.assignedAgentId !== payload.actorId) {
    recipientIds.push(payload.assignedAgentId);
  }
  if (recipientIds.length === 0) return;

  await createBulkNotifications({
    userIds: recipientIds,
    organizationId: payload.organizationId,
    type: "REQUEST_STATUS_CHANGED",
    title: "Request status changed",
    message: `${payload.actorName} changed request status from ${payload.fromStatus} to ${payload.toStatus}`,
    entityType: "REQUEST",
    entityId: payload.requestId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    metadata: {
      requestFriendlyId: payload.requestFriendlyId,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
    },
  });
}

// ============================================
// COMMENT NOTIFICATIONS
// ============================================

/**
 * Notify entity assignee, owner, and watchers when a comment is added
 */
export async function notifyCommentAdded(payload: {
  entityType: "PROPERTY" | "CONTACT" | "REQUEST" | "DEAL";
  entityId: string;
  entityName: string;
  commentPreview: string; // truncated to 100 chars
  organizationId: string;
  actorId: string;
  actorName: string;
  assigneeId?: string | null;
  entityOwnerId?: string | null;
  watcherIds?: string[];
}): Promise<void> {
  const { entityType, entityId, entityName, commentPreview, organizationId, actorId, actorName, assigneeId, entityOwnerId, watcherIds } = payload;

  type CommentEntityKey = "PROPERTY" | "CONTACT" | "REQUEST" | "DEAL";
  const categoryMap: Record<CommentEntityKey, NotificationCategory> = {
    PROPERTY: "COMMENT_ADDED_PROPERTY",
    CONTACT: "COMMENT_ADDED_CONTACT",
    REQUEST: "COMMENT_ADDED_REQUEST",
    DEAL: "COMMENT_ADDED_DEAL",
  };

  const notifType = categoryMap[entityType as CommentEntityKey];
  if (!notifType) return;

  const recipientIds: string[] = [];

  if (assigneeId && assigneeId !== actorId) {
    recipientIds.push(assigneeId);
  }

  if (entityOwnerId && entityOwnerId !== actorId) {
    recipientIds.push(entityOwnerId);
  }

  if (watcherIds) {
    for (const wid of watcherIds) {
      if (wid !== actorId) recipientIds.push(wid);
    }
  }

  const uniqueRecipients = Array.from(new Set(recipientIds));
  if (uniqueRecipients.length === 0) return;

  await createBulkNotifications({
    userIds: uniqueRecipients,
    organizationId,
    type: notifType,
    title: `New comment on ${entityType.toLowerCase()}`,
    message: `${actorName} commented on "${entityName}": ${commentPreview}`,
    entityType: entityType as NotificationEntityType,
    entityId,
    actorId,
    actorName,
    metadata: {
      entityName,
      commentPreview,
    },
  });
}















