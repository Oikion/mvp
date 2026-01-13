import { OrgRole } from "@prisma/client";
import { PermissionConfig, ModuleId } from "./types";

/**
 * Default permissions for each role
 * These can be overridden per-organization via OrganizationRolePermission
 */
export const DEFAULT_PERMISSIONS: Record<OrgRole, PermissionConfig> = {
  [OrgRole.OWNER]: {
    canViewAllModules: true,
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canExport: true,
    canReassignAgent: true,
    canManageRoles: true,
    canInviteUsers: true,
    canRemoveUsers: true,
    canTransferOwnership: true,
    canViewAnalytics: true,
    canManageIntegrations: true,
  },
  [OrgRole.LEAD]: {
    canViewAllModules: true,
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canExport: true,
    canReassignAgent: true,
    canManageRoles: false,
    canInviteUsers: true,
    canRemoveUsers: false,
    canTransferOwnership: false,
    canViewAnalytics: true,
    canManageIntegrations: false,
  },
  [OrgRole.MEMBER]: {
    canViewAllModules: true,
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canExport: true,
    canReassignAgent: false, // Key restriction for Members
    canManageRoles: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canTransferOwnership: false,
    canViewAnalytics: false,
    canManageIntegrations: false,
  },
  [OrgRole.VIEWER]: {
    canViewAllModules: false, // Restricted to permitted modules only
    canEdit: false,
    canDelete: false,
    canCreate: false,
    canExport: false,
    canReassignAgent: false,
    canManageRoles: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canTransferOwnership: false,
    canViewAnalytics: false,
    canManageIntegrations: false,
  },
};

/**
 * All available modules in the system
 */
export const ALL_MODULES: ModuleId[] = [
  "dashboard",
  "feed",
  "mls",
  "crm",
  "calendar",
  "documents",
  "reports",
  "deals",
  "social",
  "audiences",
  "employees",
  "admin",
];

/**
 * Default module access for Viewers
 * These are the modules that Viewers can access by default unless restricted
 */
export const DEFAULT_VIEWER_MODULES: ModuleId[] = [
  "dashboard",
  "mls",
  "crm",
  "calendar",
  "documents",
];

/**
 * Modules that require specific permissions to access
 */
export const RESTRICTED_MODULES: Record<ModuleId, keyof PermissionConfig | null> = {
  dashboard: null, // Always accessible
  feed: null,
  mls: null,
  crm: null,
  calendar: null,
  documents: null,
  reports: "canViewAnalytics",
  deals: null,
  social: null,
  audiences: null,
  employees: "canInviteUsers", // Need invite permission to see employees
  admin: "canManageRoles", // Need role management to access admin
};

/**
 * Admin-only modules that require canManageRoles permission
 */
export const ADMIN_MODULES: ModuleId[] = ["admin", "employees"];

/**
 * Get the default permissions for a role, merging with any customizations
 */
export function getDefaultPermissions(role: OrgRole): PermissionConfig {
  return { ...DEFAULT_PERMISSIONS[role] };
}

/**
 * Get the default module access for a role
 */
export function getDefaultModuleAccess(role: OrgRole): ModuleId[] {
  if (role === OrgRole.VIEWER) {
    return [...DEFAULT_VIEWER_MODULES];
  }
  return [...ALL_MODULES];
}

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<keyof PermissionConfig, string> = {
  canViewAllModules: "Access all modules without restrictions",
  canEdit: "Edit existing records (properties, clients, events, etc.)",
  canDelete: "Delete records permanently",
  canCreate: "Create new records",
  canExport: "Export data to CSV/Excel",
  canReassignAgent: "Change the assigned agent on records",
  canManageRoles: "Manage organization roles and permissions",
  canInviteUsers: "Invite new users to the organization",
  canRemoveUsers: "Remove users from the organization",
  canTransferOwnership: "Transfer organization ownership to another user",
  canViewAnalytics: "View reports and analytics",
  canManageIntegrations: "Manage API keys and webhooks",
};

/**
 * Module display names for UI
 */
export const MODULE_DISPLAY_NAMES: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  feed: "Feed",
  mls: "Properties (MLS)",
  crm: "Clients (CRM)",
  calendar: "Calendar",
  documents: "Documents",
  reports: "Reports",
  deals: "Deals",
  social: "Social Network",
  audiences: "Audiences",
  employees: "Team Members",
  admin: "Admin Settings",
};
