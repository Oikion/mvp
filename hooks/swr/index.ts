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

// Client Linked Entities
export { useClientLinked, getClientLinkedKey } from "./useClientLinked";

// Client Comments
export {
  useClientComments,
  useAddClientComment,
  useDeleteClientComment,
  getClientCommentsKey,
} from "./useClientComments";
export type { ClientComment } from "./useClientComments";

// Calendar Events
export { useCalendarEvents, getCalendarEventsKey } from "./useCalendarEvents";

// Calendar Event (Single)
export { useCalendarEvent, getCalendarEventKey } from "./useCalendarEvent";
export type { CalendarEventDetail } from "./useCalendarEvent";

// Event Invitations
export {
  useEventInvitees,
  useInvitedEvents,
  usePendingInvitationCount,
} from "./useEventInvitations";
export type { EventInvitee, InvitedEvent } from "./useEventInvitations";

// Selector Hooks
export { useClients } from "./useClients";
export type { ClientOption } from "./useClients";

export { useProperties } from "./useProperties";
export type { PropertyOption } from "./useProperties";

export { useDocuments } from "./useDocuments";
export type { DocumentOption } from "./useDocuments";

// Global Search
export { useGlobalSearch } from "./useGlobalSearch";
export type { SearchResult } from "./useGlobalSearch";

// Task
export { useTask, getTaskKey } from "./useTask";
export type { Task } from "./useTask";

// Connections
export { useConnections } from "./useConnections";
export type { Connection, ConnectionUser } from "./useConnections";

// Audiences
export { useAudiences } from "./useAudiences";
export type { Audience, AudienceMember } from "./useAudiences";

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

// Link Mutations (Property-Client linking)
export {
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  useLinkPropertiesToClient,
  useUnlinkPropertyFromClient,
} from "./useLinkMutations";

// ============================================================
// Paginated Hooks (for infinite scroll)
// ============================================================

export { usePropertiesPaginated } from "./usePropertiesPaginated";
export type { PropertyData as PaginatedPropertyData } from "./usePropertiesPaginated";

export { useClientsPaginated } from "./useClientsPaginated";
export type { ClientData as PaginatedClientData } from "./useClientsPaginated";

// ============================================================
// Prefetch Utility
// ============================================================

export { usePrefetch } from "./usePrefetch";

// ============================================================
// Cache Invalidation Utility
// ============================================================

export { useCacheInvalidation } from "./useCacheInvalidation";
