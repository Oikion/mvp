/**
 * Action Permission Service
 * 
 * Provides server-side permission checking for action-level permissions.
 * Combines role-based defaults with organization-specific overrides.
 */

import { auth } from "@clerk/nextjs/server";
import { OrgRole } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { clerkRoleToOrgRole } from "./types";
import {
  ActionPermission,
  ActionContext,
  ActionCheckResult,
  getActionModule,
} from "./action-permissions";
import {
  PermissionLevel,
  DEFAULT_ACTION_PERMISSIONS,
  getDefaultActionPermission,
  isPermissionAllowed,
  requiresOwnership,
} from "./action-defaults";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended permission config that includes action overrides
 */
interface ExtendedPermissionConfig {
  actions?: Record<string, PermissionLevel>;
}

/**
 * User context for permission checking
 */
interface UserActionContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
}

// =============================================================================
// CONTEXT RETRIEVAL
// =============================================================================

/**
 * Get the current user's action permission context
 */
export async function getActionPermissionContext(): Promise<UserActionContext | null> {
  try {
    const [authResult, currentUser] = await Promise.all([
      auth(),
      getCurrentUser().catch(() => null),
    ]);

    const { orgId, orgRole } = authResult;

    if (!orgId || !currentUser) {
      return null;
    }

    const role = clerkRoleToOrgRole(orgRole);

    return {
      userId: currentUser.id,
      organizationId: orgId,
      role,
    };
  } catch (error) {
    console.error("[getActionPermissionContext]", error);
    return null;
  }
}

// =============================================================================
// PERMISSION CHECKING
// =============================================================================

/**
 * Get the effective permission level for an action, considering org overrides
 */
async function getEffectivePermissionLevel(
  organizationId: string,
  role: OrgRole,
  action: ActionPermission
): Promise<PermissionLevel> {
  // Start with the default
  const defaultLevel = getDefaultActionPermission(role, action);

  // Check for organization-specific overrides
  try {
    const orgOverride = await prismadb.organizationRolePermission.findUnique({
      where: {
        organizationId_role: {
          organizationId,
          role,
        },
      },
    });

    if (orgOverride?.permissions) {
      const config = orgOverride.permissions as ExtendedPermissionConfig;
      if (config.actions && action in config.actions) {
        return config.actions[action] as PermissionLevel;
      }
    }
  } catch (error) {
    // If DB lookup fails, use defaults
    console.error("[getEffectivePermissionLevel] Error fetching org overrides:", error);
  }

  return defaultLevel;
}

/**
 * Check if the current user can perform an action
 * 
 * @param action - The action to check
 * @param context - Optional context for ownership-based checks
 * @returns ActionCheckResult with allowed status and reason
 */
export async function canPerformAction(
  action: ActionPermission,
  context?: ActionContext
): Promise<ActionCheckResult> {
  const userContext = await getActionPermissionContext();

  if (!userContext) {
    return {
      allowed: false,
      reason: "Authentication required",
    };
  }

  const { userId, organizationId, role } = userContext;

  // Get the effective permission level
  const level = await getEffectivePermissionLevel(organizationId, role, action);

  // If no access, deny immediately
  if (!isPermissionAllowed(level)) {
    return {
      allowed: false,
      reason: `No permission to perform "${action}"`,
    };
  }

  // If full access, allow
  if (level === "all") {
    return { allowed: true };
  }

  // Handle ownership-based permissions
  if (level === "own") {
    if (!context?.ownerId) {
      // No owner context provided - require ownership check by caller
      return {
        allowed: true,
        requiresOwnership: true,
        reason: "Ownership verification required",
      };
    }

    // Check if user owns the entity
    if (context.ownerId !== userId) {
      return {
        allowed: false,
        reason: "You can only perform this action on your own records",
      };
    }

    return { allowed: true };
  }

  // Handle "involved" permissions (for deals, etc.)
  if (level === "involved") {
    if (!context?.involvedUserIds) {
      // No involvement context provided - require check by caller
      return {
        allowed: true,
        requiresOwnership: true,
        reason: "Involvement verification required",
      };
    }

    // Check if user is involved
    if (!context.involvedUserIds.includes(userId)) {
      return {
        allowed: false,
        reason: "You can only perform this action on records you are involved in",
      };
    }

    return { allowed: true };
  }

  // Default deny for unknown levels
  return {
    allowed: false,
    reason: "Unknown permission level",
  };
}

/**
 * Check if the current user has a specific action permission
 * Simple boolean check without context
 */
export async function hasActionPermission(action: ActionPermission): Promise<boolean> {
  const result = await canPerformAction(action);
  return result.allowed;
}

/**
 * Check multiple actions at once
 * Returns true only if ALL actions are allowed
 */
export async function hasAllActionPermissions(actions: ActionPermission[]): Promise<boolean> {
  const results = await Promise.all(actions.map((a) => canPerformAction(a)));
  return results.every((r) => r.allowed);
}

/**
 * Check multiple actions at once
 * Returns true if ANY action is allowed
 */
export async function hasAnyActionPermission(actions: ActionPermission[]): Promise<boolean> {
  const results = await Promise.all(actions.map((a) => canPerformAction(a)));
  return results.some((r) => r.allowed);
}

/**
 * Check if the current user can perform an action on a specific entity
 * Convenience method that wraps canPerformAction with context
 */
export async function canPerformActionOnEntity(
  action: ActionPermission,
  entityType: ActionContext["entityType"],
  entityId: string,
  ownerId: string | null | undefined
): Promise<ActionCheckResult> {
  return canPerformAction(action, {
    entityType,
    entityId,
    ownerId,
  });
}

/**
 * Check if the current user can perform an action on a deal
 * Deals have special "involved" semantics
 */
export async function canPerformActionOnDeal(
  action: ActionPermission,
  dealId: string,
  propertyAgentId: string,
  clientAgentId: string
): Promise<ActionCheckResult> {
  return canPerformAction(action, {
    entityType: "deal",
    entityId: dealId,
    involvedUserIds: [propertyAgentId, clientAgentId],
  });
}

// =============================================================================
// PERMISSION LEVEL QUERIES
// =============================================================================

/**
 * Get the permission level for an action for the current user
 */
export async function getActionPermissionLevel(action: ActionPermission): Promise<PermissionLevel | null> {
  const userContext = await getActionPermissionContext();

  if (!userContext) {
    return null;
  }

  return getEffectivePermissionLevel(
    userContext.organizationId,
    userContext.role,
    action
  );
}

/**
 * Get all action permissions for the current user
 * Returns a map of action to permission level
 */
export async function getAllActionPermissions(): Promise<Record<ActionPermission, PermissionLevel> | null> {
  const userContext = await getActionPermissionContext();

  if (!userContext) {
    return null;
  }

  const { organizationId, role } = userContext;
  const defaults = DEFAULT_ACTION_PERMISSIONS[role];

  // Get org overrides
  try {
    const orgOverride = await prismadb.organizationRolePermission.findUnique({
      where: {
        organizationId_role: {
          organizationId,
          role,
        },
      },
    });

    if (orgOverride?.permissions) {
      const config = orgOverride.permissions as ExtendedPermissionConfig;
      if (config.actions) {
        return {
          ...defaults,
          ...config.actions,
        } as Record<ActionPermission, PermissionLevel>;
      }
    }
  } catch (error) {
    console.error("[getAllActionPermissions] Error:", error);
  }

  return defaults;
}

/**
 * Get all actions the current user can perform (any level above "none")
 */
export async function getAccessibleActionsForUser(): Promise<ActionPermission[] | null> {
  const permissions = await getAllActionPermissions();

  if (!permissions) {
    return null;
  }

  return (Object.entries(permissions) as [ActionPermission, PermissionLevel][])
    .filter(([_, level]) => level !== "none")
    .map(([action]) => action);
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Update action permissions for a role in an organization
 * Only Owners can do this
 */
export async function updateActionPermissions(
  organizationId: string,
  role: OrgRole,
  actionOverrides: Partial<Record<ActionPermission, PermissionLevel>>
): Promise<void> {
  // Don't allow modifying Owner permissions
  if (role === OrgRole.OWNER) {
    throw new Error("Cannot modify owner permissions");
  }

  // Get existing permissions
  const existing = await prismadb.organizationRolePermission.findUnique({
    where: {
      organizationId_role: {
        organizationId,
        role,
      },
    },
  });

  // Merge with existing config
  const existingConfig = (existing?.permissions as ExtendedPermissionConfig) || {};
  const newConfig: ExtendedPermissionConfig = {
    ...existingConfig,
    actions: {
      ...(existingConfig.actions || {}),
      ...actionOverrides,
    },
  };

  // Upsert
  await prismadb.organizationRolePermission.upsert({
    where: {
      organizationId_role: {
        organizationId,
        role,
      },
    },
    update: {
      permissions: newConfig as object,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      role,
      permissions: newConfig as object,
    },
  });
}

/**
 * Reset action permissions to defaults for a role
 */
export async function resetActionPermissions(
  organizationId: string,
  role: OrgRole
): Promise<void> {
  if (role === OrgRole.OWNER) {
    throw new Error("Cannot modify owner permissions");
  }

  const existing = await prismadb.organizationRolePermission.findUnique({
    where: {
      organizationId_role: {
        organizationId,
        role,
      },
    },
  });

  if (existing) {
    const config = (existing.permissions as ExtendedPermissionConfig) || {};
    // Remove actions overrides while keeping other config
    const { actions, ...rest } = config;
    
    await prismadb.organizationRolePermission.update({
      where: {
        organizationId_role: {
          organizationId,
          role,
        },
      },
      data: {
        permissions: rest as object,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Get action permission overrides for all roles in an organization
 */
export async function getOrganizationActionPermissions(
  organizationId: string
): Promise<Record<OrgRole, Partial<Record<ActionPermission, PermissionLevel>>>> {
  const overrides = await prismadb.organizationRolePermission.findMany({
    where: { organizationId },
  });

  const result: Record<OrgRole, Partial<Record<ActionPermission, PermissionLevel>>> = {
    [OrgRole.OWNER]: {},
    [OrgRole.LEAD]: {},
    [OrgRole.MEMBER]: {},
    [OrgRole.VIEWER]: {},
  };

  for (const override of overrides) {
    const config = override.permissions as ExtendedPermissionConfig;
    if (config.actions) {
      result[override.role] = config.actions as Partial<Record<ActionPermission, PermissionLevel>>;
    }
  }

  return result;
}
