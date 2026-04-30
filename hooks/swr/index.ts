// @ts-nocheck
// TODO: Fix type errors
// Organization Users
export { useOrgUsers } from "./useOrgUsers";

// Notifications
export {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getNotificationsKey,
} from "./useNotifications";
export type { Notification } from "./useNotifications";

// Notification Counts (for sidebar badges)
export { useNotificationCounts, getCountForPage } from "./useNotificationCounts";
export type { NotificationCountsResponse } from "./useNotificationCounts";

// Infinite Notifications (for NotificationCenter with Load More)
export { useInfiniteNotifications } from "./useInfiniteNotifications";

// Property Linked Entities
export { usePropertyLinked, getPropertyLinkedKey } from "./usePropertyLinked";

// Property Comments
export {
  usePropertyComments,
  useAddPropertyComment,
  useDeletePropertyComment,
  getPropertyCommentsKey,
} from "./usePropertyComments";
export type { PropertyComment } from "./usePropertyComments";


// Feedback Comments (for real-time chat between users and admins)
export {
  useFeedbackComments,
  useAddFeedbackComment,
  getFeedbackCommentsKey,
  useInvalidateFeedbackComments,
} from "./useFeedbackComments";
export type { FeedbackComment } from "./useFeedbackComments";

// Calendar Events
export { useCalendarEvents, getCalendarEventsKey } from "./useCalendarEvents";

// Calendar Event (Single)
export { useCalendarEvent, getCalendarEventKey } from "./useCalendarEvent";
export type { CalendarEventDetail, EventContactAttendee, EventAgentAttendee } from "./useCalendarEvent";

// Event Invitations
export {
  useEventInvitees,
  useInvitedEvents,
  usePendingInvitationCount,
} from "./useEventInvitations";
export type { EventInvitee, InvitedEvent } from "./useEventInvitations";

// v2.0 Contact hooks
export { useContacts } from "./useContacts";
export type { ContactOption } from "./useContacts";
export { useContact } from "./useContact";
export {
  useContactComments,
  useAddContactComment,
  useDeleteContactComment,
  getContactCommentsKey,
} from "./useContactComments";
export type { ContactComment } from "./useContactComments";

// v2.0 Request hooks
export { useRequests } from "./useRequests";
export type { RequestOption } from "./useRequests";
export { useRequest } from "./useRequest";
export { useRequestComments, useAddRequestComment, useDeleteRequestComment } from "./useRequestComments";

// v2.0 Deal hooks (Phase 3)
export { useDeals, useDeal, getDealsKey, getDealKey } from "./useDeals";
export type { DealOption } from "./useDeals";

export { useProperties } from "./useProperties";
export type { PropertyOption } from "./useProperties";

export { useDocuments } from "./useDocuments";
export type { DocumentOption } from "./useDocuments";

// Unified Entity Search (high-performance selector search)
export {
  useUnifiedEntitySearch,
  useClientSearch,
  useContactSearch,
  usePropertySearch,
  useDocumentSearch,
  useEventSearch,
  useRequestSearch,
  useDealSearch,
} from "./useUnifiedEntitySearch";
export type {
  EntityType,
  EntitySearchResult,
  EntitySearchResponse,
  UseUnifiedEntitySearchOptions,
} from "./useUnifiedEntitySearch";

// Global Search
export { 
  useGlobalSearch, 
  useGlobalSearchInfinite, 
  useFilteredSearch 
} from "./useGlobalSearch";
export type { SearchResult, SearchEntityType } from "./useGlobalSearch";

// Task
export { useTask, getTaskKey } from "./useTask";
export type { Task } from "./useTask";

// Connections
export { useConnections } from "./useConnections";
export type { Connection, ConnectionUser } from "./useConnections";

// ============================================================
// Mutation Hooks
// ============================================================

// Connection Mutations
export {
  useRemoveConnection,
  useRespondToConnection,
  useSendConnectionRequest,
} from "./useConnectionMutations";
export type { ConnectionMutationResponse } from "./useConnectionMutations";

// Calendar Event Mutations
export {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "./useEventMutations";
export type {
  CreateEventData,
  UpdateEventData,
  CalendarEvent,
} from "./useEventMutations";

// Share Mutations
export { useShareEntity } from "./useShareMutations";
export type {
  ShareEntityType,
  SharePermission,
  ShareEntityData,
  ShareResponse,
  BulkShareResponse,
} from "./useShareMutations";

// Contact Linked Entities
export { useContactLinked, getContactLinkedKey } from "./useContactLinked";

// Request Linked Entities
export { useRequestLinked, getRequestLinkedKey } from "./useRequestLinked";

// Document Linked Entities
export { useDocumentLinked, getDocumentLinkedKey } from "./useDocumentLinked";

// Link Mutations (Property-Contact linking, Property-Request linking, Document linking)
export {
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  useLinkPropertiesToClient,
  useUnlinkPropertyFromClient,
  useLinkRequestsToProperty,
  useUnlinkRequestFromProperty,
  useLinkClientsToDocument,
  useUnlinkClientFromDocument,
  useLinkPropertiesToDocument,
  useUnlinkPropertyFromDocument,
  useLinkRequestsToDocument,
  useUnlinkRequestFromDocument,
  useLinkDocumentsToClient,
  useUnlinkDocumentFromClient,
  useLinkDocumentsToProperty,
  useUnlinkDocumentFromProperty,
  useLinkDocumentsToRequest,
  useUnlinkDocumentFromRequest,
  useLinkRequestsToContact,
  useUnlinkRequestFromContact,
  useLinkPropertiesToContact,
  useUnlinkPropertyFromContact,
  useLinkContactsToRequest,
  useUnlinkContactFromRequest,
  useLinkPropertiesToRequest,
  useUnlinkPropertyFromRequest,
} from "./useLinkMutations";

// ============================================================
// Paginated Hooks (for infinite scroll)
// ============================================================

export { usePropertiesPaginated } from "./usePropertiesPaginated";
export type { PropertyData as PaginatedPropertyData } from "./usePropertiesPaginated";

export { useContactsPaginated } from "./useContactsPaginated";
export type { ContactData as PaginatedContactData } from "./useContactsPaginated";

// ============================================================
// Prefetch Utility
// ============================================================

export { usePrefetch } from "./usePrefetch";

// ============================================================
// Cache Invalidation Utility
// ============================================================

export { useCacheInvalidation } from "./useCacheInvalidation";

// ============================================================
// Export History
// ============================================================

export { useExportHistory, useRecordExport } from "./use-export-history";
export type {
  ExportHistoryRecord,
  ChangedField,
  ChangeDetectionResult,
  ExportHistoryResponse,
} from "./use-export-history";

// ============================================================
// Messaging
// ============================================================

export {
  useMessagingCredentials,
  useChannels,
  useCreateChannel,
  useConversations,
  useStartDM,
  getChannelsKey,
  getConversationsKey,
  getCredentialsKey,
} from "./useMessaging";
export type {
  MessagingCredentials,
  Channel,
  Conversation,
} from "./useMessaging";

export { useUnreadMessageCount } from "./useUnreadMessageCount";


// ============================================================
// Tags
// ============================================================

export {
  useTags,
  useEntityTags,
  useTagMutations,
  useEntityTagMutations,
  useTagCategories,
  getTagsKey,
  getEntityTagsKey,
} from "./useTags";
export type { Tag } from "./useTags";

// ============================================================
// Activities (Phase 4)
// ============================================================

export { useActivities } from "./useActivities";
export type {
  Activity,
  ActivityUser,
  ActivityKind,
  ActivityDirection,
  ActivityParentType,
  UseActivitiesOptions,
} from "./useActivities";

// ============================================================
// Document Templates (Phase 4)
// ============================================================

export { useDocumentTemplates } from "./useDocumentTemplates";
export type {
  DocumentTemplate,
  DocTemplateCategory,
  UseDocumentTemplatesOptions,
} from "./useDocumentTemplates";
