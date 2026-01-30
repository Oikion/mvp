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

// ============================================
// ACTION-LEVEL PERMISSIONS
// ============================================

// Action Permission Types
export {
  type ActionPermission,
  type PropertyAction,
  type ClientAction,
  type MessagingAction,
  type CalendarAction,
  type DocumentAction,
  type ReportAction,
  type DealAction,
  type MatchmakingAction,
  type AudienceAction,
  type SocialAction,
  type TaskAction,
  type AdminAction,
  type NotificationAction,
  type TemplateAction,
  type XePortalAction,
  type N8nAction,
  type ActionContext,
  type ActionCheckResult,
  ACTION_MODULES,
  ALL_ACTIONS,
  ACTION_DESCRIPTIONS,
  getActionModule,
  getActionName,
} from "./action-permissions";

// Action Permission Defaults
export {
  type PermissionLevel,
  type RoleActionPermissions,
  DEFAULT_ACTION_PERMISSIONS,
  getDefaultActionPermission,
  isPermissionAllowed,
  requiresOwnership,
  PERMISSION_LEVEL_NAMES,
  getAccessibleActions,
  getFullAccessActions,
} from "./action-defaults";

// Action Permission Service
export {
  getActionPermissionContext,
  canPerformAction,
  hasActionPermission,
  hasAllActionPermissions,
  hasAnyActionPermission,
  canPerformActionOnEntity,
  canPerformActionOnDeal,
  getActionPermissionLevel,
  getAllActionPermissions,
  getAccessibleActionsForUser,
  updateActionPermissions,
  resetActionPermissions,
  getOrganizationActionPermissions,
} from "./action-service";

// Action Permission Guards (for server actions)
export {
  type ActionErrorResponse,
  type GuardResult,
  requireAuth,
  requireAction,
  requireActionOnEntity,
  requireDealAction,
  requireAllActions,
  requireAnyAction,
  runActionGuards,
  notFoundError,
  validationError,
  isEntityOwner,
  isDealParticipant,
  getCurrentUserId,
  getCurrentOrganizationId,
  isActionError,
  actionSuccess,
} from "./action-guards";

// Hooks (client-side) - NOT re-exported from barrel to prevent server/client mixing
// Import directly from '@/lib/permissions/hooks' for client components

// Components (client-side) - NOT re-exported from barrel to prevent server/client mixing
// Import directly from '@/lib/permissions/components' for client components
// Example: import { PermissionGate, ModuleGate, OwnerOnly, LeadPlusOnly } from "@/lib/permissions/components"
