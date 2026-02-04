/**
 * Default Action Permissions per Role
 * 
 * Defines which actions each role can perform by default.
 * These can be overridden per-organization via OrganizationRolePermission.
 */

import { OrgRole } from "@prisma/client";
import { ActionPermission } from "./action-permissions";

/**
 * Permission level for an action
 * - "all": Full access to the action
 * - "own": Only on entities the user owns/is assigned to
 * - "involved": Only on entities the user is involved in (e.g., deals)
 * - "none": No access
 */
export type PermissionLevel = "all" | "own" | "involved" | "none";

/**
 * Default permission configuration for each role
 */
export type RoleActionPermissions = Record<ActionPermission, PermissionLevel>;

/**
 * VIEWER ROLE PERMISSIONS
 * Read-only access to permitted modules, no modifications allowed
 */
const VIEWER_PERMISSIONS: RoleActionPermissions = {
  // Properties - Read only
  "property:read": "all",
  "property:create": "none",
  "property:update": "none",
  "property:delete": "none",
  "property:export": "none",
  "property:share": "none",
  "property:publish_portal": "none",
  "property:reassign_agent": "none",
  "property:import": "none",
  "property:bulk_update": "none",
  "property:add_comment": "none",
  "property:manage_contacts": "none",
  
  // Clients - Read only
  "client:read": "all",
  "client:create": "none",
  "client:update": "none",
  "client:delete": "none",
  "client:export": "none",
  "client:share": "none",
  "client:import": "none",
  "client:reassign_agent": "none",
  "client:bulk_update": "none",
  "client:add_comment": "none",
  "client:manage_contacts": "none",
  
  // Messaging - No access (viewers shouldn't access internal comms)
  "messaging:read": "none",
  "messaging:send_message": "none",
  "messaging:create_channel": "none",
  "messaging:update_channel": "none",
  "messaging:delete_channel": "none",
  "messaging:archive_channel": "none",
  "messaging:manage_members": "none",
  "messaging:create_dm": "none",
  "messaging:create_group": "none",
  "messaging:delete_message": "none",
  "messaging:edit_message": "none",
  
  // Calendar - Read only
  "calendar:read": "all",
  "calendar:create": "none",
  "calendar:update": "none",
  "calendar:delete": "none",
  "calendar:invite": "none",
  "calendar:respond_invite": "none",
  "calendar:manage_reminders": "none",
  
  // Documents - Read only
  "document:read": "all",
  "document:create": "none",
  "document:update": "none",
  "document:delete": "none",
  "document:share": "none",
  "document:export": "none",
  "document:manage_links": "none",
  
  // Reports - No access
  "report:view": "none",
  "report:export": "none",
  "report:view_analytics": "none",
  "report:view_metrics": "none",
  
  // Deals - Read only
  "deal:read": "all",
  "deal:create": "none",
  "deal:update": "none",
  "deal:accept": "none",
  "deal:cancel": "none",
  "deal:complete": "none",
  "deal:propose_terms": "none",
  
  // Matchmaking - No access
  "matchmaking:view": "none",
  "matchmaking:run": "none",
  "matchmaking:view_analytics": "none",
  
  // Audiences - No access
  "audience:read": "none",
  "audience:create": "none",
  "audience:update": "none",
  "audience:delete": "none",
  "audience:sync": "none",
  
  // Social - Read only
  "social:read": "all",
  "social:create_post": "none",
  "social:update_post": "none",
  "social:delete_post": "none",
  "social:comment": "none",
  "social:like": "none",
  "social:manage_profile": "none",
  "social:manage_connections": "none",
  
  // Tasks - Read only
  "task:read": "all",
  "task:create": "none",
  "task:update": "none",
  "task:delete": "none",
  "task:add_comment": "none",
  "task:assign": "none",
  
  // Admin - No access
  "admin:view_users": "none",
  "admin:invite_users": "none",
  "admin:remove_users": "none",
  "admin:manage_roles": "none",
  "admin:manage_integrations": "none",
  "admin:manage_api_keys": "none",
  "admin:manage_webhooks": "none",
  "admin:view_audit_log": "none",
  "admin:transfer_ownership": "none",
  "admin:manage_org_settings": "none",
  
  // Templates - Read and use only
  "template:read": "all",
  "template:use": "none",
  "template:create": "none",
  "template:update": "none",
  "template:delete": "none",
  
  // XE Portal - No access
  "xe:view_config": "none",
  "xe:manage_config": "none",
  "xe:sync_properties": "none",
  "xe:view_history": "none",
  
  // N8N - No access
  "n8n:view_config": "none",
  "n8n:manage_config": "none",
  "n8n:manage_workflows": "none",
  
  // Notifications - Own only
  "notification:read": "own",
  "notification:mark_read": "own",
  "notification:manage_settings": "own",
  
  // Referrals - No access
  "referral:view": "none",
  "referral:apply": "none",
  "referral:track": "none",
  "referral:admin_approve": "none",
  "referral:admin_deny": "none",
  "referral:admin_manage": "none",
};

/**
 * MEMBER (AGENT) ROLE PERMISSIONS
 * Standard access - can work with their own entities
 */
const MEMBER_PERMISSIONS: RoleActionPermissions = {
  // Properties - Full CRUD on own, read all
  "property:read": "all",
  "property:create": "all",
  "property:update": "own",
  "property:delete": "own",
  "property:export": "all",
  "property:share": "all",
  "property:publish_portal": "all",
  "property:reassign_agent": "none", // Cannot reassign agents
  "property:import": "none", // Leads/Owners only
  "property:bulk_update": "none",
  "property:add_comment": "all",
  "property:manage_contacts": "own",
  
  // Clients - Full CRUD on own, read all
  "client:read": "all",
  "client:create": "all",
  "client:update": "own",
  "client:delete": "own",
  "client:export": "all",
  "client:share": "all",
  "client:import": "none", // Leads/Owners only
  "client:reassign_agent": "none", // Cannot reassign agents
  "client:bulk_update": "none",
  "client:add_comment": "all",
  "client:manage_contacts": "own",
  
  // Messaging - Full access except channel management
  "messaging:read": "all",
  "messaging:send_message": "all",
  "messaging:create_channel": "none", // Leads/Owners only
  "messaging:update_channel": "none",
  "messaging:delete_channel": "none",
  "messaging:archive_channel": "none",
  "messaging:manage_members": "none",
  "messaging:create_dm": "all",
  "messaging:create_group": "all",
  "messaging:delete_message": "own",
  "messaging:edit_message": "own",
  
  // Calendar - Full CRUD on own
  "calendar:read": "all",
  "calendar:create": "all",
  "calendar:update": "own",
  "calendar:delete": "own",
  "calendar:invite": "all",
  "calendar:respond_invite": "all",
  "calendar:manage_reminders": "own",
  
  // Documents - Full CRUD on own
  "document:read": "all",
  "document:create": "all",
  "document:update": "own",
  "document:delete": "own",
  "document:share": "all",
  "document:export": "all",
  "document:manage_links": "own",
  
  // Reports - No access (Leads/Owners only)
  "report:view": "none",
  "report:export": "none",
  "report:view_analytics": "none",
  "report:view_metrics": "none",
  
  // Deals - Full access on involved deals
  "deal:read": "all",
  "deal:create": "all",
  "deal:update": "involved",
  "deal:accept": "involved",
  "deal:cancel": "involved",
  "deal:complete": "involved",
  "deal:propose_terms": "involved",
  
  // Matchmaking - Full access
  "matchmaking:view": "all",
  "matchmaking:run": "all",
  "matchmaking:view_analytics": "all",
  
  // Audiences - Read own
  "audience:read": "own",
  "audience:create": "all",
  "audience:update": "own",
  "audience:delete": "own",
  "audience:sync": "own",
  
  // Social - Full access to own posts
  "social:read": "all",
  "social:create_post": "all",
  "social:update_post": "own",
  "social:delete_post": "own",
  "social:comment": "all",
  "social:like": "all",
  "social:manage_profile": "own",
  "social:manage_connections": "all",
  
  // Tasks - Full CRUD on own/assigned
  "task:read": "all",
  "task:create": "all",
  "task:update": "own",
  "task:delete": "own",
  "task:add_comment": "all",
  "task:assign": "none", // Cannot assign to others
  
  // Admin - No access
  "admin:view_users": "none",
  "admin:invite_users": "none",
  "admin:remove_users": "none",
  "admin:manage_roles": "none",
  "admin:manage_integrations": "none",
  "admin:manage_api_keys": "none",
  "admin:manage_webhooks": "none",
  "admin:view_audit_log": "none",
  "admin:transfer_ownership": "none",
  "admin:manage_org_settings": "none",
  
  // Templates - Read and use
  "template:read": "all",
  "template:use": "all",
  "template:create": "none",
  "template:update": "none",
  "template:delete": "none",
  
  // XE Portal - Can sync properties
  "xe:view_config": "none",
  "xe:manage_config": "none",
  "xe:sync_properties": "own",
  "xe:view_history": "own",
  
  // N8N - No access
  "n8n:view_config": "none",
  "n8n:manage_config": "none",
  "n8n:manage_workflows": "none",
  
  // Notifications - Own only
  "notification:read": "own",
  "notification:mark_read": "own",
  "notification:manage_settings": "own",
  
  // Referrals - Can view and apply
  "referral:view": "all",
  "referral:apply": "all",
  "referral:track": "own",
  "referral:admin_approve": "none",
  "referral:admin_deny": "none",
  "referral:admin_manage": "none",
};

/**
 * LEAD ROLE PERMISSIONS
 * Full access to most features, can manage team members but not org settings
 */
const LEAD_PERMISSIONS: RoleActionPermissions = {
  // Properties - Full CRUD on all
  "property:read": "all",
  "property:create": "all",
  "property:update": "all",
  "property:delete": "all",
  "property:export": "all",
  "property:share": "all",
  "property:publish_portal": "all",
  "property:reassign_agent": "all",
  "property:import": "all",
  "property:bulk_update": "all",
  "property:add_comment": "all",
  "property:manage_contacts": "all",
  
  // Clients - Full CRUD on all
  "client:read": "all",
  "client:create": "all",
  "client:update": "all",
  "client:delete": "all",
  "client:export": "all",
  "client:share": "all",
  "client:import": "all",
  "client:reassign_agent": "all",
  "client:bulk_update": "all",
  "client:add_comment": "all",
  "client:manage_contacts": "all",
  
  // Messaging - Full access including channel management
  "messaging:read": "all",
  "messaging:send_message": "all",
  "messaging:create_channel": "all",
  "messaging:update_channel": "all",
  "messaging:delete_channel": "all",
  "messaging:archive_channel": "all",
  "messaging:manage_members": "all",
  "messaging:create_dm": "all",
  "messaging:create_group": "all",
  "messaging:delete_message": "all",
  "messaging:edit_message": "own",
  
  // Calendar - Full CRUD on all
  "calendar:read": "all",
  "calendar:create": "all",
  "calendar:update": "all",
  "calendar:delete": "all",
  "calendar:invite": "all",
  "calendar:respond_invite": "all",
  "calendar:manage_reminders": "all",
  
  // Documents - Full CRUD on all
  "document:read": "all",
  "document:create": "all",
  "document:update": "all",
  "document:delete": "all",
  "document:share": "all",
  "document:export": "all",
  "document:manage_links": "all",
  
  // Reports - Full access
  "report:view": "all",
  "report:export": "all",
  "report:view_analytics": "all",
  "report:view_metrics": "all",
  
  // Deals - Full access
  "deal:read": "all",
  "deal:create": "all",
  "deal:update": "all",
  "deal:accept": "all",
  "deal:cancel": "all",
  "deal:complete": "all",
  "deal:propose_terms": "all",
  
  // Matchmaking - Full access
  "matchmaking:view": "all",
  "matchmaking:run": "all",
  "matchmaking:view_analytics": "all",
  
  // Audiences - Full access
  "audience:read": "all",
  "audience:create": "all",
  "audience:update": "all",
  "audience:delete": "all",
  "audience:sync": "all",
  
  // Social - Full access
  "social:read": "all",
  "social:create_post": "all",
  "social:update_post": "all",
  "social:delete_post": "all",
  "social:comment": "all",
  "social:like": "all",
  "social:manage_profile": "own",
  "social:manage_connections": "all",
  
  // Tasks - Full access
  "task:read": "all",
  "task:create": "all",
  "task:update": "all",
  "task:delete": "all",
  "task:add_comment": "all",
  "task:assign": "all",
  
  // Admin - Can invite users but not manage roles
  "admin:view_users": "all",
  "admin:invite_users": "all",
  "admin:remove_users": "none", // Owners only
  "admin:manage_roles": "none", // Owners only
  "admin:manage_integrations": "none",
  "admin:manage_api_keys": "none",
  "admin:manage_webhooks": "none",
  "admin:view_audit_log": "all",
  "admin:transfer_ownership": "none",
  "admin:manage_org_settings": "none",
  
  // Templates - Full access
  "template:read": "all",
  "template:use": "all",
  "template:create": "all",
  "template:update": "all",
  "template:delete": "all",
  
  // XE Portal - Full access except config
  "xe:view_config": "all",
  "xe:manage_config": "none",
  "xe:sync_properties": "all",
  "xe:view_history": "all",
  
  // N8N - View only
  "n8n:view_config": "all",
  "n8n:manage_config": "none",
  "n8n:manage_workflows": "all",
  
  // Notifications - Full access
  "notification:read": "all",
  "notification:mark_read": "all",
  "notification:manage_settings": "own",
  
  // Referrals - Can view and track, limited admin
  "referral:view": "all",
  "referral:apply": "all",
  "referral:track": "all",
  "referral:admin_approve": "none",
  "referral:admin_deny": "none",
  "referral:admin_manage": "none",
};

/**
 * OWNER ROLE PERMISSIONS
 * Full access to everything
 */
const OWNER_PERMISSIONS: RoleActionPermissions = {
  // Properties - Full CRUD on all
  "property:read": "all",
  "property:create": "all",
  "property:update": "all",
  "property:delete": "all",
  "property:export": "all",
  "property:share": "all",
  "property:publish_portal": "all",
  "property:reassign_agent": "all",
  "property:import": "all",
  "property:bulk_update": "all",
  "property:add_comment": "all",
  "property:manage_contacts": "all",
  
  // Clients - Full CRUD on all
  "client:read": "all",
  "client:create": "all",
  "client:update": "all",
  "client:delete": "all",
  "client:export": "all",
  "client:share": "all",
  "client:import": "all",
  "client:reassign_agent": "all",
  "client:bulk_update": "all",
  "client:add_comment": "all",
  "client:manage_contacts": "all",
  
  // Messaging - Full access
  "messaging:read": "all",
  "messaging:send_message": "all",
  "messaging:create_channel": "all",
  "messaging:update_channel": "all",
  "messaging:delete_channel": "all",
  "messaging:archive_channel": "all",
  "messaging:manage_members": "all",
  "messaging:create_dm": "all",
  "messaging:create_group": "all",
  "messaging:delete_message": "all",
  "messaging:edit_message": "all",
  
  // Calendar - Full access
  "calendar:read": "all",
  "calendar:create": "all",
  "calendar:update": "all",
  "calendar:delete": "all",
  "calendar:invite": "all",
  "calendar:respond_invite": "all",
  "calendar:manage_reminders": "all",
  
  // Documents - Full access
  "document:read": "all",
  "document:create": "all",
  "document:update": "all",
  "document:delete": "all",
  "document:share": "all",
  "document:export": "all",
  "document:manage_links": "all",
  
  // Reports - Full access
  "report:view": "all",
  "report:export": "all",
  "report:view_analytics": "all",
  "report:view_metrics": "all",
  
  // Deals - Full access
  "deal:read": "all",
  "deal:create": "all",
  "deal:update": "all",
  "deal:accept": "all",
  "deal:cancel": "all",
  "deal:complete": "all",
  "deal:propose_terms": "all",
  
  // Matchmaking - Full access
  "matchmaking:view": "all",
  "matchmaking:run": "all",
  "matchmaking:view_analytics": "all",
  
  // Audiences - Full access
  "audience:read": "all",
  "audience:create": "all",
  "audience:update": "all",
  "audience:delete": "all",
  "audience:sync": "all",
  
  // Social - Full access
  "social:read": "all",
  "social:create_post": "all",
  "social:update_post": "all",
  "social:delete_post": "all",
  "social:comment": "all",
  "social:like": "all",
  "social:manage_profile": "all",
  "social:manage_connections": "all",
  
  // Tasks - Full access
  "task:read": "all",
  "task:create": "all",
  "task:update": "all",
  "task:delete": "all",
  "task:add_comment": "all",
  "task:assign": "all",
  
  // Admin - Full access
  "admin:view_users": "all",
  "admin:invite_users": "all",
  "admin:remove_users": "all",
  "admin:manage_roles": "all",
  "admin:manage_integrations": "all",
  "admin:manage_api_keys": "all",
  "admin:manage_webhooks": "all",
  "admin:view_audit_log": "all",
  "admin:transfer_ownership": "all",
  "admin:manage_org_settings": "all",
  
  // Templates - Full access
  "template:read": "all",
  "template:use": "all",
  "template:create": "all",
  "template:update": "all",
  "template:delete": "all",
  
  // XE Portal - Full access
  "xe:view_config": "all",
  "xe:manage_config": "all",
  "xe:sync_properties": "all",
  "xe:view_history": "all",
  
  // N8N - Full access
  "n8n:view_config": "all",
  "n8n:manage_config": "all",
  "n8n:manage_workflows": "all",
  
  // Notifications - Full access
  "notification:read": "all",
  "notification:mark_read": "all",
  "notification:manage_settings": "all",
  
  // Referrals - Full admin access
  "referral:view": "all",
  "referral:apply": "all",
  "referral:track": "all",
  "referral:admin_approve": "all",
  "referral:admin_deny": "all",
  "referral:admin_manage": "all",
};

/**
 * Default action permissions mapped by role
 */
export const DEFAULT_ACTION_PERMISSIONS: Record<OrgRole, RoleActionPermissions> = {
  [OrgRole.VIEWER]: VIEWER_PERMISSIONS,
  [OrgRole.MEMBER]: MEMBER_PERMISSIONS,
  [OrgRole.LEAD]: LEAD_PERMISSIONS,
  [OrgRole.OWNER]: OWNER_PERMISSIONS,
};

/**
 * Get the default permission level for an action based on role
 */
export function getDefaultActionPermission(
  role: OrgRole,
  action: ActionPermission
): PermissionLevel {
  return DEFAULT_ACTION_PERMISSIONS[role][action] ?? "none";
}

/**
 * Check if a permission level allows the action (without ownership check)
 */
export function isPermissionAllowed(level: PermissionLevel): boolean {
  return level !== "none";
}

/**
 * Check if a permission level requires ownership verification
 */
export function requiresOwnership(level: PermissionLevel): boolean {
  return level === "own" || level === "involved";
}

/**
 * Permission level display names for UI
 */
export const PERMISSION_LEVEL_NAMES: Record<PermissionLevel, string> = {
  all: "Full Access",
  own: "Own Only",
  involved: "Involved Only",
  none: "No Access",
};

/**
 * Get all actions that a role has access to (any level above "none")
 */
export function getAccessibleActions(role: OrgRole): ActionPermission[] {
  const permissions = DEFAULT_ACTION_PERMISSIONS[role];
  return (Object.entries(permissions) as [ActionPermission, PermissionLevel][])
    .filter(([_, level]) => level !== "none")
    .map(([action]) => action);
}

/**
 * Get all actions that a role has full access to
 */
export function getFullAccessActions(role: OrgRole): ActionPermission[] {
  const permissions = DEFAULT_ACTION_PERMISSIONS[role];
  return (Object.entries(permissions) as [ActionPermission, PermissionLevel][])
    .filter(([_, level]) => level === "all")
    .map(([action]) => action);
}
