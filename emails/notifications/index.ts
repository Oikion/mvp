/**
 * Notification Email Templates Index
 * Export all notification email templates from a single entry point
 */

// Social Notifications
export { default as SocialPostLikedEmail } from "./SocialPostLiked";
export { default as SocialPostCommentedEmail } from "./SocialPostCommented";
export { default as SocialPostMentionedEmail } from "./SocialPostMentioned";

// Entity Sharing
export { default as EntitySharedWithYouEmail } from "./EntitySharedWithYou";
export { default as EntityShareAcceptedEmail } from "./EntityShareAccepted";

// Connections
export { default as ConnectionRequestEmail } from "./ConnectionRequest";
export { default as ConnectionAcceptedEmail } from "./ConnectionAccepted";

// Deals
export { default as DealProposedEmail } from "./DealProposed";
export { default as DealStatusChangedEmail } from "./DealStatusChanged";

// Tasks
export { default as TaskAssignedEmail } from "./TaskAssigned";
export { default as TaskDueSoonEmail } from "./TaskDueSoon";

// Calendar
export { default as CalendarEventInvitedEmail } from "./CalendarEventInvited";
export { default as CalendarEventUpdatedEmail } from "./CalendarEventUpdated";

// CRM
export { default as ClientCreatedEmail } from "./ClientCreated";
export { default as PropertyCreatedEmail } from "./PropertyCreated";
export { default as AccountUpdatedEmail } from "./AccountUpdated";
export { default as PropertyUpdatedEmail } from "./PropertyUpdated";
