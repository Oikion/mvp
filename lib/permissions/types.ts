import { OrgRole } from "@prisma/client";

/**
 * Organization role type - maps to Clerk role keys
 */
export type ClerkOrgRole = "org:owner" | "org:lead" | "org:member" | "org:viewer";

/**
 * Permission keys for organization actions
 */
export type PermissionKey =
  | "canViewAllModules"
  | "canEdit"
  | "canDelete"
  | "canCreate"
  | "canExport"
  | "canReassignAgent"
  | "canManageRoles"
  | "canInviteUsers"
  | "canRemoveUsers"
  | "canTransferOwnership"
  | "canViewAnalytics"
  | "canManageIntegrations";

/**
 * Permission configuration object
 */
export type PermissionConfig = {
  [K in PermissionKey]: boolean;
};

/**
 * Module identifiers matching system_Modules_Enabled
 */
export type ModuleId =
  | "dashboard"
  | "feed"
  | "mls"
  | "crm"
  | "calendar"
  | "documents"
  | "reports"
  | "deals"
  | "social"
  | "audiences"
  | "employees"
  | "admin";

/**
 * User permission context - combines role, org permissions, and module access
 */
export interface UserPermissionContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
  clerkRole: ClerkOrgRole;
  permissions: PermissionConfig;
  moduleAccess: ModuleId[];
  isOwner: boolean;
  isLead: boolean;
  isMember: boolean;
  isViewer: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Role hierarchy level (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 4,
  LEAD: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/**
 * Map Clerk role string to OrgRole enum
 */
export function clerkRoleToOrgRole(clerkRole: string | null | undefined): OrgRole {
  switch (clerkRole) {
    case "org:owner":
      return OrgRole.OWNER;
    case "org:lead":
      return OrgRole.LEAD;
    case "org:member":
      return OrgRole.MEMBER;
    case "org:viewer":
      return OrgRole.VIEWER;
    // Handle legacy roles - map admin to owner, member stays member
    case "org:admin":
      return OrgRole.OWNER;
    default:
      return OrgRole.VIEWER; // Default to lowest permission
  }
}

/**
 * Map OrgRole enum to Clerk role string
 */
export function orgRoleToClerkRole(role: OrgRole): ClerkOrgRole {
  switch (role) {
    case OrgRole.OWNER:
      return "org:owner";
    case OrgRole.LEAD:
      return "org:lead";
    case OrgRole.MEMBER:
      return "org:member";
    case OrgRole.VIEWER:
      return "org:viewer";
  }
}

/**
 * Check if role A has higher or equal privileges than role B
 */
export function roleHasPrivilege(roleA: OrgRole, roleB: OrgRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Get role display name for UI
 */
export function getRoleDisplayName(role: OrgRole | ClerkOrgRole): string {
  const roleKey = typeof role === "string" && role.startsWith("org:") 
    ? clerkRoleToOrgRole(role) 
    : role as OrgRole;
    
  switch (roleKey) {
    case OrgRole.OWNER:
      return "Owner";
    case OrgRole.LEAD:
      return "Lead";
    case OrgRole.MEMBER:
      return "Member";
    case OrgRole.VIEWER:
      return "Viewer";
    default:
      return "Unknown";
  }
}

/**
 * Entity types that can have assigned agents
 */
export type AssignableEntityType = "property" | "client" | "document" | "event" | "task";
