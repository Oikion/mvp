/**
 * Notification Types & Interfaces
 * Central definitions for all notification-related types
 */

import { NotificationCategory, NotificationEntityType } from "@prisma/client";

// Re-export Prisma enums for convenience
export { NotificationCategory, NotificationEntityType };

/**
 * Input for creating a notification
 */
export interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  type: NotificationCategory;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for creating notifications for multiple users
 */
export interface CreateBulkNotificationInput {
  userIds: string[];
  organizationId: string;
  type: NotificationCategory;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification preferences (for future use)
 */
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  categories: {
    [key in NotificationCategory]?: {
      email: boolean;
      inApp: boolean;
    };
  };
}

/**
 * Notification with actor details
 */
export interface NotificationWithActor {
  id: string;
  createdAt: Date;
  type: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  readAt: Date | null;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Social notification payload
 */
export interface SocialNotificationPayload {
  postId: string;
  postAuthorId: string;
  postContent?: string;
  actorId: string;
  actorName: string;
  organizationId: string;
}

/**
 * Entity sharing notification payload
 */
export interface SharingNotificationPayload {
  entityType: "PROPERTY" | "CLIENT" | "DOCUMENT";
  entityId: string;
  entityName: string;
  sharedById: string;
  sharedByName: string;
  sharedWithId: string;
  organizationId: string;
  message?: string;
}

/**
 * Calendar notification payload
 */
export interface CalendarNotificationPayload {
  eventId: string;
  eventTitle: string;
  eventStartTime: Date;
  organizationId: string;
  recipientIds: string[];
  actorId?: string;
  actorName?: string;
}

/**
 * Entity creation notification payload
 */
export interface EntityCreationPayload {
  entityType: "CLIENT" | "PROPERTY";
  entityId: string;
  entityName: string;
  creatorId: string;
  creatorName: string;
  organizationId: string;
  assignedToId?: string;
}

/**
 * Deal notification payload
 */
export interface DealNotificationPayload {
  dealId: string;
  dealTitle?: string;
  propertyName: string;
  clientName: string;
  actorId: string;
  actorName: string;
  targetUserId: string;
  organizationId: string;
  status?: string;
}

/**
 * Connection notification payload
 */
export interface ConnectionNotificationPayload {
  connectionId: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  organizationId: string;
}

/**
 * Task notification payload
 */
export interface TaskNotificationPayload {
  taskId: string;
  taskTitle: string;
  accountId?: string;
  accountName?: string;
  actorId: string;
  actorName: string;
  recipientId: string;
  organizationId: string;
}




