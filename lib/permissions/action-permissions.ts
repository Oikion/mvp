/**
 * Action-Level Permissions
 * 
 * Granular, module-specific action permissions that map directly to server actions.
 * Each action follows the pattern: "module:action"
 */

// =============================================================================
// PROPERTIES (MLS) MODULE
// =============================================================================

export type PropertyAction =
  | "property:read"
  | "property:create"
  | "property:update"
  | "property:delete"
  | "property:export"
  | "property:share"
  | "property:publish_portal"
  | "property:reassign_agent"
  | "property:import"
  | "property:bulk_update"
  | "property:add_comment"
  | "property:manage_contacts";

// =============================================================================
// CLIENTS (CRM) MODULE
// =============================================================================

export type ClientAction =
  | "client:read"
  | "client:create"
  | "client:update"
  | "client:delete"
  | "client:export"
  | "client:share"
  | "client:import"
  | "client:reassign_agent"
  | "client:bulk_update"
  | "client:add_comment"
  | "client:manage_contacts";

// =============================================================================
// MESSAGING MODULE
// =============================================================================

export type MessagingAction =
  | "messaging:read"
  | "messaging:send_message"
  | "messaging:create_channel"
  | "messaging:update_channel"
  | "messaging:delete_channel"
  | "messaging:archive_channel"
  | "messaging:manage_members"
  | "messaging:create_dm"
  | "messaging:create_group"
  | "messaging:delete_message"
  | "messaging:edit_message";

// =============================================================================
// CALENDAR MODULE
// =============================================================================

export type CalendarAction =
  | "calendar:read"
  | "calendar:create"
  | "calendar:update"
  | "calendar:delete"
  | "calendar:invite"
  | "calendar:respond_invite"
  | "calendar:manage_reminders";

// =============================================================================
// DOCUMENTS MODULE
// =============================================================================

export type DocumentAction =
  | "document:read"
  | "document:create"
  | "document:update"
  | "document:delete"
  | "document:share"
  | "document:export"
  | "document:manage_links";

// =============================================================================
// REPORTS MODULE
// =============================================================================

export type ReportAction =
  | "report:view"
  | "report:export"
  | "report:view_analytics"
  | "report:view_metrics";

// =============================================================================
// DEALS MODULE
// =============================================================================

export type DealAction =
  | "deal:read"
  | "deal:create"
  | "deal:update"
  | "deal:accept"
  | "deal:cancel"
  | "deal:complete"
  | "deal:propose_terms";

// =============================================================================
// MATCHMAKING MODULE
// =============================================================================

export type MatchmakingAction =
  | "matchmaking:view"
  | "matchmaking:run"
  | "matchmaking:view_analytics";

// =============================================================================
// AUDIENCES MODULE
// =============================================================================

export type AudienceAction =
  | "audience:read"
  | "audience:create"
  | "audience:update"
  | "audience:delete"
  | "audience:sync";

// =============================================================================
// SOCIAL / FEED MODULE
// =============================================================================

export type SocialAction =
  | "social:read"
  | "social:create_post"
  | "social:update_post"
  | "social:delete_post"
  | "social:comment"
  | "social:like"
  | "social:manage_profile"
  | "social:manage_connections";

// =============================================================================
// TASKS MODULE
// =============================================================================

export type TaskAction =
  | "task:read"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:add_comment"
  | "task:assign";

// =============================================================================
// ADMIN MODULE
// =============================================================================

export type AdminAction =
  | "admin:view_users"
  | "admin:invite_users"
  | "admin:remove_users"
  | "admin:manage_roles"
  | "admin:manage_integrations"
  | "admin:manage_api_keys"
  | "admin:manage_webhooks"
  | "admin:view_audit_log"
  | "admin:transfer_ownership"
  | "admin:manage_org_settings";

// =============================================================================
// TEMPLATES MODULE
// =============================================================================

export type TemplateAction =
  | "template:read"
  | "template:use"
  | "template:create"
  | "template:update"
  | "template:delete";

// =============================================================================
// XE PORTAL MODULE
// =============================================================================

export type XePortalAction =
  | "xe:view_config"
  | "xe:manage_config"
  | "xe:sync_properties"
  | "xe:view_history";

// =============================================================================
// N8N AUTOMATION MODULE
// =============================================================================

export type N8nAction =
  | "n8n:view_config"
  | "n8n:manage_config"
  | "n8n:manage_workflows";

// =============================================================================
// NOTIFICATIONS MODULE
// =============================================================================

export type NotificationAction =
  | "notification:read"
  | "notification:mark_read"
  | "notification:manage_settings";

// =============================================================================
// REFERRALS MODULE
// =============================================================================

export type ReferralAction =
  | "referral:view"
  | "referral:apply"
  | "referral:track"
  | "referral:admin_approve"
  | "referral:admin_deny"
  | "referral:admin_manage";

// =============================================================================
// UNION TYPE - ALL ACTION PERMISSIONS
// =============================================================================

export type ActionPermission =
  | PropertyAction
  | ClientAction
  | MessagingAction
  | CalendarAction
  | DocumentAction
  | ReportAction
  | DealAction
  | MatchmakingAction
  | AudienceAction
  | SocialAction
  | TaskAction
  | AdminAction
  | TemplateAction
  | XePortalAction
  | N8nAction
  | NotificationAction
  | ReferralAction;

// =============================================================================
// ACTION CATEGORIES BY MODULE
// =============================================================================

export const ACTION_MODULES = {
  property: [
    "property:read",
    "property:create",
    "property:update",
    "property:delete",
    "property:export",
    "property:share",
    "property:publish_portal",
    "property:reassign_agent",
    "property:import",
    "property:bulk_update",
    "property:add_comment",
    "property:manage_contacts",
  ] as const,
  client: [
    "client:read",
    "client:create",
    "client:update",
    "client:delete",
    "client:export",
    "client:share",
    "client:import",
    "client:reassign_agent",
    "client:bulk_update",
    "client:add_comment",
    "client:manage_contacts",
  ] as const,
  messaging: [
    "messaging:read",
    "messaging:send_message",
    "messaging:create_channel",
    "messaging:update_channel",
    "messaging:delete_channel",
    "messaging:archive_channel",
    "messaging:manage_members",
    "messaging:create_dm",
    "messaging:create_group",
    "messaging:delete_message",
    "messaging:edit_message",
  ] as const,
  calendar: [
    "calendar:read",
    "calendar:create",
    "calendar:update",
    "calendar:delete",
    "calendar:invite",
    "calendar:respond_invite",
    "calendar:manage_reminders",
  ] as const,
  document: [
    "document:read",
    "document:create",
    "document:update",
    "document:delete",
    "document:share",
    "document:export",
    "document:manage_links",
  ] as const,
  report: [
    "report:view",
    "report:export",
    "report:view_analytics",
    "report:view_metrics",
  ] as const,
  deal: [
    "deal:read",
    "deal:create",
    "deal:update",
    "deal:accept",
    "deal:cancel",
    "deal:complete",
    "deal:propose_terms",
  ] as const,
  matchmaking: [
    "matchmaking:view",
    "matchmaking:run",
    "matchmaking:view_analytics",
  ] as const,
  audience: [
    "audience:read",
    "audience:create",
    "audience:update",
    "audience:delete",
    "audience:sync",
  ] as const,
  social: [
    "social:read",
    "social:create_post",
    "social:update_post",
    "social:delete_post",
    "social:comment",
    "social:like",
    "social:manage_profile",
    "social:manage_connections",
  ] as const,
  task: [
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "task:add_comment",
    "task:assign",
  ] as const,
  admin: [
    "admin:view_users",
    "admin:invite_users",
    "admin:remove_users",
    "admin:manage_roles",
    "admin:manage_integrations",
    "admin:manage_api_keys",
    "admin:manage_webhooks",
    "admin:view_audit_log",
    "admin:transfer_ownership",
    "admin:manage_org_settings",
  ] as const,
  template: [
    "template:read",
    "template:use",
    "template:create",
    "template:update",
    "template:delete",
  ] as const,
  xe: [
    "xe:view_config",
    "xe:manage_config",
    "xe:sync_properties",
    "xe:view_history",
  ] as const,
  n8n: [
    "n8n:view_config",
    "n8n:manage_config",
    "n8n:manage_workflows",
  ] as const,
  notification: [
    "notification:read",
    "notification:mark_read",
    "notification:manage_settings",
  ] as const,
  referral: [
    "referral:view",
    "referral:apply",
    "referral:track",
    "referral:admin_approve",
    "referral:admin_deny",
    "referral:admin_manage",
  ] as const,
} as const;

// =============================================================================
// ALL ACTIONS LIST
// =============================================================================

export const ALL_ACTIONS: ActionPermission[] = Object.values(ACTION_MODULES).flat() as ActionPermission[];

// =============================================================================
// PERMISSION CHECK CONTEXT
// =============================================================================

/**
 * Context for ownership-based permission checks
 * Used when an action requires "own only" access for certain roles
 */
export interface ActionContext {
  /** The type of entity being acted upon */
  entityType?: "property" | "client" | "document" | "event" | "task" | "deal" | "post";
  /** The ID of the entity */
  entityId?: string;
  /** The user ID of the entity owner (assigned_to, created_by, etc.) */
  ownerId?: string | null;
  /** For deals: array of involved user IDs */
  involvedUserIds?: string[];
}

/**
 * Result of a permission check
 */
export interface ActionCheckResult {
  allowed: boolean;
  reason?: string;
  /** Whether the action requires ownership verification */
  requiresOwnership?: boolean;
}

/**
 * Human-readable descriptions for all actions
 */
export const ACTION_DESCRIPTIONS: Record<ActionPermission, string> = {
  // Property actions
  "property:read": "View property listings",
  "property:create": "Create new property listings",
  "property:update": "Edit property details",
  "property:delete": "Delete property listings",
  "property:export": "Export property data",
  "property:share": "Share properties with others",
  "property:publish_portal": "Publish properties to external portals (XE, etc.)",
  "property:reassign_agent": "Change the assigned agent on properties",
  "property:import": "Import properties from external sources",
  "property:bulk_update": "Update multiple properties at once",
  "property:add_comment": "Add comments to properties",
  "property:manage_contacts": "Manage property contacts",
  
  // Client actions
  "client:read": "View client information",
  "client:create": "Create new clients",
  "client:update": "Edit client details",
  "client:delete": "Delete clients",
  "client:export": "Export client data",
  "client:share": "Share clients with other agents",
  "client:import": "Import clients from external sources",
  "client:reassign_agent": "Change the assigned agent on clients",
  "client:bulk_update": "Update multiple clients at once",
  "client:add_comment": "Add comments to clients",
  "client:manage_contacts": "Manage client contacts",
  
  // Messaging actions
  "messaging:read": "View messages and channels",
  "messaging:send_message": "Send messages in channels and DMs",
  "messaging:create_channel": "Create new channels",
  "messaging:update_channel": "Edit channel settings",
  "messaging:delete_channel": "Delete channels",
  "messaging:archive_channel": "Archive channels",
  "messaging:manage_members": "Add/remove channel members",
  "messaging:create_dm": "Start direct message conversations",
  "messaging:create_group": "Create group conversations",
  "messaging:delete_message": "Delete messages",
  "messaging:edit_message": "Edit sent messages",
  
  // Calendar actions
  "calendar:read": "View calendar events",
  "calendar:create": "Create calendar events",
  "calendar:update": "Edit calendar events",
  "calendar:delete": "Delete calendar events",
  "calendar:invite": "Invite others to events",
  "calendar:respond_invite": "Respond to event invitations",
  "calendar:manage_reminders": "Manage event reminders",
  
  // Document actions
  "document:read": "View documents",
  "document:create": "Upload documents",
  "document:update": "Edit document details",
  "document:delete": "Delete documents",
  "document:share": "Share documents with others",
  "document:export": "Export documents",
  "document:manage_links": "Manage shareable document links",
  
  // Report actions
  "report:view": "View reports",
  "report:export": "Export reports",
  "report:view_analytics": "View detailed analytics",
  "report:view_metrics": "View performance metrics",
  
  // Deal actions
  "deal:read": "View deal information",
  "deal:create": "Create new deals",
  "deal:update": "Update deal details",
  "deal:accept": "Accept deal proposals",
  "deal:cancel": "Cancel deals",
  "deal:complete": "Mark deals as completed",
  "deal:propose_terms": "Propose new deal terms",
  
  // Matchmaking actions
  "matchmaking:view": "View property-client matches",
  "matchmaking:run": "Run matchmaking algorithms",
  "matchmaking:view_analytics": "View matchmaking analytics",
  
  // Audience actions
  "audience:read": "View audiences",
  "audience:create": "Create new audiences",
  "audience:update": "Edit audience details",
  "audience:delete": "Delete audiences",
  "audience:sync": "Sync audience members",
  
  // Social actions
  "social:read": "View social feed",
  "social:create_post": "Create social posts",
  "social:update_post": "Edit own posts",
  "social:delete_post": "Delete own posts",
  "social:comment": "Comment on posts",
  "social:like": "Like posts",
  "social:manage_profile": "Manage agent profile",
  "social:manage_connections": "Manage agent connections",
  
  // Task actions
  "task:read": "View tasks",
  "task:create": "Create tasks",
  "task:update": "Edit tasks",
  "task:delete": "Delete tasks",
  "task:add_comment": "Add task comments",
  "task:assign": "Assign tasks to users",
  
  // Admin actions
  "admin:view_users": "View organization users",
  "admin:invite_users": "Invite users to organization",
  "admin:remove_users": "Remove users from organization",
  "admin:manage_roles": "Manage user roles",
  "admin:manage_integrations": "Manage integrations",
  "admin:manage_api_keys": "Manage API keys",
  "admin:manage_webhooks": "Manage webhooks",
  "admin:view_audit_log": "View audit logs",
  "admin:transfer_ownership": "Transfer organization ownership",
  "admin:manage_org_settings": "Manage organization settings",
  
  // Template actions
  "template:read": "View document templates",
  "template:use": "Use templates to generate documents",
  "template:create": "Create new templates",
  "template:update": "Edit templates",
  "template:delete": "Delete templates",
  
  // XE portal actions
  "xe:view_config": "View XE.gr integration settings",
  "xe:manage_config": "Manage XE.gr integration",
  "xe:sync_properties": "Sync properties to XE.gr",
  "xe:view_history": "View XE.gr sync history",
  
  // N8N actions
  "n8n:view_config": "View n8n configuration",
  "n8n:manage_config": "Manage n8n settings",
  "n8n:manage_workflows": "Manage n8n workflows",
  
  // Notification actions
  "notification:read": "View notifications",
  "notification:mark_read": "Mark notifications as read",
  "notification:manage_settings": "Manage notification settings",
  
  // Referral actions
  "referral:view": "View referral program information",
  "referral:apply": "Apply to join the referral program",
  "referral:track": "Track referral conversions",
  "referral:admin_approve": "Approve referral applications",
  "referral:admin_deny": "Deny referral applications",
  "referral:admin_manage": "Manage referral program settings",
};

/**
 * Get the module name from an action
 */
export function getActionModule(action: ActionPermission): string {
  return action.split(":")[0];
}

/**
 * Get the action name from an action (without module prefix)
 */
export function getActionName(action: ActionPermission): string {
  return action.split(":")[1];
}
