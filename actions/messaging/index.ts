/**
 * Messaging Actions Index
 * 
 * Native Prisma + Socket.io messaging system
 * Export all messaging-related server actions for easy importing
 */

// User sync and credentials
export {
  syncUserToMessaging,
  getMessagingCredentials,
  disableUserMessaging,
  enableUserMessaging,
  syncOrganizationMembers,
  updateUserPresence,
} from "./sync-user";

// Channels
export {
  createChannel,
  getOrganizationChannels,
  updateChannel,
  archiveChannel,
  createDefaultChannels,
  addChannelMembers,
  removeChannelMember,
  joinChannel,
  leaveChannel,
} from "./channels";

// Direct Messages / Conversations
export {
  startDirectMessage,
  startClientConversation,
  startPropertyConversation,
  getEntityConversations,
  getUserConversations,
  createGroupConversation,
  addConversationParticipants,
  leaveConversation,
  muteConversation,
  unmuteConversation,
  deleteConversation,
} from "./direct-messages";

// Attachments
export {
  uploadMessageAttachment,
  deleteMessageAttachment,
} from "./attachments";

// Search
export {
  searchMessages,
  searchMentionableUsers,
} from "./search";

// Messages
export {
  markAsRead,
} from "./messages";

// Notifications
export {
  notifyNewMessage,
  notifyMention,
  notifyChannelInvite,
  getUnreadMessageCount,
  sendMessageEmailNotification,
} from "./notifications";
