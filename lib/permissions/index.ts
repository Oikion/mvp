// Types
export {
  type ClerkOrgRole,
  type PermissionKey,
  type PermissionConfig,
  type ModuleId,
  type UserPermissionContext,
  type PermissionCheckResult,
  type AssignableEntityType,
  ROLE_HIERARCHY,
  clerkRoleToOrgRole,
  orgRoleToClerkRole,
  roleHasPrivilege,
  getRoleDisplayName,
} from "./types";

// Defaults
export {
  DEFAULT_PERMISSIONS,
  ALL_MODULES,
  DEFAULT_VIEWER_MODULES,
  RESTRICTED_MODULES,
  ADMIN_MODULES,
  getDefaultPermissions,
  getDefaultModuleAccess,
  PERMISSION_DESCRIPTIONS,
  MODULE_DISPLAY_NAMES,
} from "./defaults";

// Service (server-side)
export {
  getUserPermissionContext,
  hasPermission,
  canAccessModule,
  hasAllPermissions,
  hasAnyPermission,
  canModifyAssignedAgent,
  canManageUser,
  isOrgOwner,
  isAtLeastLead,
  isAtLeastMember,
  getCurrentOrgRole,
  updateRolePermissions,
  updateRoleModuleAccess,
  updateUserModuleAccess,
  getOrganizationRolePermissionsAll,
  getRoleModuleAccessAll,
} from "./service";

// Guards (API route protection)
export {
  permissionDenied,
  viewerCannotModify,
  requireCanModify,
  requirePermission,
  requireModuleAccess,
  requireMinRole,
  requireOwner,
  requireAtLeastLead,
  requireAtLeastMember,
  requireCanReassign,
  requireCanExport,
  requireCanManageRoles,
  requireCanInvite,
  checkAssignedToChange,
  runGuards,
} from "./guards";

// Hooks (client-side) - re-exported for convenience
// Import directly from './hooks' for client components

// Components (client-side) - re-exported for convenience
// Import directly from './components' for client components
export {
  PermissionGate,
  ModuleGate,
  OwnerOnly,
  LeadPlusOnly,
} from "./components";
