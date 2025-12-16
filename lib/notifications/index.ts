/**
 * Notifications Module
 * Central export for all notification-related functionality
 */

// Types
export * from "./types";

// Core service functions
export {
  createNotification,
  createBulkNotifications,
  notifyOrganization,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  cleanupOldNotifications,
} from "./notification-service";

// Helper functions for specific scenarios
export {
  // Social
  notifyPostLiked,
  notifyPostCommented,
  // Sharing
  notifyEntityShared,
  // Entity creation
  notifyClientCreated,
  notifyPropertyCreated,
  // Deals
  notifyDealProposed,
  notifyDealStatusChanged,
  // Connections
  notifyConnectionRequest,
  notifyConnectionAccepted,
  // Tasks
  notifyTaskAssigned,
  notifyTaskCommented,
  // Calendar
  notifyEventInvite,
  // Watchers
  notifyAccountWatchers,
  notifyPropertyWatchers,
} from "./helpers";









