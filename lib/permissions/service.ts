import { auth } from "@clerk/nextjs/server";
import { OrgRole } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { cacheGet, cacheSet, cacheIncr } from "@/lib/redis";
import {
  UserPermissionContext,
  PermissionConfig,
  PermissionKey,
  ModuleId,
  ClerkOrgRole,
  clerkRoleToOrgRole,
  orgRoleToClerkRole,
  roleHasPrivilege,
  PermissionCheckResult,
} from "./types";
import {
  DEFAULT_PERMISSIONS,
  ALL_MODULES,
  DEFAULT_VIEWER_MODULES,
  RESTRICTED_MODULES,
} from "./defaults";

/**
 * Get the current user's permission context
 * This is the main entry point for permission checking
 */
export async function getUserPermissionContext(): Promise<UserPermissionContext | null> {
  try {
    const [authResult, currentUser] = await Promise.all([
      auth(),
      getCurrentUser().catch(() => null),
    ]);

    const { orgId, orgRole } = authResult;

    if (!orgId || !currentUser) {
      return null;
    }

    // Check Redis cache (avoids 3+ DB queries per protected page load)
    const cacheKey = `oik:perm:${orgId}:${currentUser.id}`;
    const [cached, currentVersion] = await Promise.all([
      cacheGet<UserPermissionContext & { _v: number }>(cacheKey),
      cacheGet<number>(`oik:perm:ver:${orgId}`),
    ]);
    if (cached && cached._v === (currentVersion ?? 0)) {
      return cached;
    }

    const role = clerkRoleToOrgRole(orgRole);
    const clerkRoleKey = orgRoleToClerkRole(role);

    // Get custom permissions for this org/role if any
    const customPermissions = await getOrganizationRolePermissions(orgId, role);

    // Get module access for this user
    const moduleAccess = await getUserModuleAccess(orgId, currentUser.id, role);

    // Merge default permissions with custom overrides
    const permissions = mergePermissions(
      DEFAULT_PERMISSIONS[role],
      customPermissions
    );

    const context: UserPermissionContext = {
      userId: currentUser.id,
      organizationId: orgId,
      role,
      clerkRole: clerkRoleKey,
      permissions,
      moduleAccess,
      isOwner: role === OrgRole.OWNER,
      isLead: role === OrgRole.LEAD,
      isMember: role === OrgRole.MEMBER,
      isViewer: role === OrgRole.VIEWER,
    };

    // Cache with version for invalidation (2-minute TTL)
    const version = currentVersion ?? 0;
    await cacheSet(cacheKey, { ...context, _v: version }, 120);

    return context;
  } catch (error) {
    console.error("[getUserPermissionContext]", error);
    return null;
  }
}

/**
 * Get custom permissions for a role in an organization
 */
async function getOrganizationRolePermissions(
  organizationId: string,
  role: OrgRole
): Promise<Partial<PermissionConfig> | null> {
  const record = await prismadb.organizationRolePermission.findUnique({
    where: {
      organizationId_role: {
        organizationId,
        role,
      },
    },
  });

  if (!record) {
    return null;
  }

  return record.permissions as Partial<PermissionConfig>;
}

/**
 * Get module access for a user, combining role defaults with user-specific overrides.
 * Always applies the org-level "network" feature flag at the end, regardless of role.
 */
async function getUserModuleAccess(
  organizationId: string,
  userId: string,
  role: OrgRole
): Promise<ModuleId[]> {
  // Build base module set from role
  let modules: Set<ModuleId>;

  if (role === OrgRole.OWNER || role === OrgRole.LEAD) {
    modules = new Set(ALL_MODULES);
  } else if (role === OrgRole.MEMBER) {
    modules = new Set(ALL_MODULES.filter((m) => m !== "admin"));
  } else {
    // VIEWER: check role-level and user-level overrides
    const [roleAccess, userAccess] = await Promise.all([
      prismadb.roleModuleAccess.findMany({ where: { organizationId, role } }),
      prismadb.userModuleAccess.findMany({ where: { organizationId, userId } }),
    ]);

    if (roleAccess.length === 0) {
      modules = new Set(DEFAULT_VIEWER_MODULES);
    } else {
      modules = new Set(
        roleAccess.filter((r) => r.hasAccess).map((r) => r.moduleId as ModuleId)
      );
    }

    for (const access of userAccess) {
      if (access.hasAccess) {
        modules.add(access.moduleId as ModuleId);
      } else {
        modules.delete(access.moduleId as ModuleId);
      }
    }
  }

  // Org-level feature gate: strip "network" if not enabled for this org.
  // This applies to all roles — even owners cannot access network on a locked-out org.
  const networkFeature = await prismadb.organizationFeature.findUnique({
    where: {
      organizationId_feature: { organizationId, feature: "network" },
    },
    select: { isEnabled: true },
  });

  if (networkFeature && !networkFeature.isEnabled) {
    modules.delete("network");
  }

  return Array.from(modules);
}

/**
 * Merge default permissions with custom overrides
 */
function mergePermissions(
  defaults: PermissionConfig,
  overrides: Partial<PermissionConfig> | null
): PermissionConfig {
  if (!overrides) {
    return { ...defaults };
  }
  return { ...defaults, ...overrides };
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(
  permission: PermissionKey
): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) {
    return false;
  }
  return context.permissions[permission] === true;
}

/**
 * Check if the current user can access a specific module
 */
export async function canAccessModule(moduleId: ModuleId): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) {
    return false;
  }

  // Check if module has a permission requirement
  const requiredPermission = RESTRICTED_MODULES[moduleId];
  if (requiredPermission && !context.permissions[requiredPermission]) {
    return false;
  }

  // Check module access list
  return context.moduleAccess.includes(moduleId);
}

/**
 * Check multiple permissions at once
 */
export async function hasAllPermissions(
  permissions: PermissionKey[]
): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) {
    return false;
  }
  return permissions.every((p) => context.permissions[p] === true);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  permissions: PermissionKey[]
): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) {
    return false;
  }
  return permissions.some((p) => context.permissions[p] === true);
}

/**
 * Check if user can perform an action on an entity with an assigned agent
 * Members cannot reassign agents, but can edit other fields
 */
export async function canModifyAssignedAgent(): Promise<boolean> {
  return hasPermission("canReassignAgent");
}

/**
 * Check if user is an organization owner
 */
export async function isOrgOwner(): Promise<boolean> {
  const context = await getUserPermissionContext();
  return context?.isOwner === true;
}

/**
 * Check if user is at least a lead (owner or lead)
 */
export async function isAtLeastLead(): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) return false;
  return context.isOwner || context.isLead;
}

/**
 * Check if user is at least a member (owner, lead, or member)
 */
export async function isAtLeastMember(): Promise<boolean> {
  const context = await getUserPermissionContext();
  if (!context) return false;
  return context.isOwner || context.isLead || context.isMember;
}

/**
 * Get the current user's role in the organization
 */
export async function getCurrentOrgRole(): Promise<OrgRole | null> {
  const context = await getUserPermissionContext();
  return context?.role ?? null;
}

/**
 * Update custom permissions for a role in an organization
 * Only owners can do this
 */
export async function updateRolePermissions(
  organizationId: string,
  role: OrgRole,
  permissions: Partial<PermissionConfig>
): Promise<void> {
  // SECURITY: Verify the caller belongs to the target org and is an OWNER.
  // Without this check, any authenticated caller could supply an arbitrary
  // organizationId and escalate permissions in orgs they don't belong to.
  const context = await getUserPermissionContext();
  if (!context) {
    throw new Error("Not authenticated");
  }
  if (context.organizationId !== organizationId) {
    throw new Error("Cannot modify permissions for a different organization");
  }
  if (!context.isOwner) {
    throw new Error("Only organization owners can modify role permissions");
  }

  // Prevent modifying owner permissions
  if (role === OrgRole.OWNER) {
    throw new Error("Cannot modify owner permissions");
  }

  await prismadb.organizationRolePermission.upsert({
    where: {
      organizationId_role: {
        organizationId,
        role,
      },
    },
    update: {
      permissions: permissions as object,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      role,
      permissions: permissions as object,
    },
  });

  // Bump permission version to invalidate all cached contexts for this org.
  // Cache invalidation is best-effort — the DB write already succeeded above.
  // If Redis fails, cached permissions may be stale for up to 2 minutes (cache TTL).
  try {
    await cacheIncr(`oik:perm:ver:${organizationId}`, 3600);
  } catch (err) {
    console.warn("[PERMISSIONS] Cache version bump failed — permissions may be stale for up to 2 min", err);
  }
}

/**
 * Update module access for a role in an organization
 */
export async function updateRoleModuleAccess(
  organizationId: string,
  role: OrgRole,
  moduleId: ModuleId,
  hasAccess: boolean
): Promise<void> {
  // SECURITY: Verify the caller belongs to the target org and is at least an OWNER.
  const context = await getUserPermissionContext();
  if (!context) {
    throw new Error("Not authenticated");
  }
  if (context.organizationId !== organizationId) {
    throw new Error("Cannot modify module access for a different organization");
  }
  if (!context.isOwner) {
    throw new Error("Only organization owners can modify role module access");
  }

  await prismadb.roleModuleAccess.upsert({
    where: {
      organizationId_role_moduleId: {
        organizationId,
        role,
        moduleId,
      },
    },
    update: {
      hasAccess,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      role,
      moduleId,
      hasAccess,
    },
  });

  try {
    await cacheIncr(`oik:perm:ver:${organizationId}`, 3600);
  } catch (err) {
    console.warn("[PERMISSIONS] Cache version bump failed — permissions may be stale for up to 2 min", err);
  }
}

/**
 * Update module access for a specific user
 */
export async function updateUserModuleAccess(
  organizationId: string,
  userId: string,
  moduleId: ModuleId,
  hasAccess: boolean
): Promise<void> {
  // SECURITY: Verify the caller belongs to the target org and is at least an OWNER.
  const context = await getUserPermissionContext();
  if (!context) {
    throw new Error("Not authenticated");
  }
  if (context.organizationId !== organizationId) {
    throw new Error("Cannot modify module access for a different organization");
  }
  if (!context.isOwner) {
    throw new Error("Only organization owners can modify user module access");
  }

  await prismadb.userModuleAccess.upsert({
    where: {
      organizationId_userId_moduleId: {
        organizationId,
        userId,
        moduleId,
      },
    },
    update: {
      hasAccess,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      userId,
      moduleId,
      hasAccess,
    },
  });

  try {
    await cacheIncr(`oik:perm:ver:${organizationId}`, 3600);
  } catch (err) {
    console.warn("[PERMISSIONS] Cache version bump failed — permissions may be stale for up to 2 min", err);
  }
}

/**
 * Get all role permissions for an organization
 */
export async function getOrganizationRolePermissionsAll(
  organizationId: string
): Promise<Record<OrgRole, PermissionConfig>> {
  const customPermissions = await prismadb.organizationRolePermission.findMany({
    where: { organizationId },
  });

  const result: Record<OrgRole, PermissionConfig> = {
    [OrgRole.OWNER]: { ...DEFAULT_PERMISSIONS[OrgRole.OWNER] },
    [OrgRole.LEAD]: { ...DEFAULT_PERMISSIONS[OrgRole.LEAD] },
    [OrgRole.MEMBER]: { ...DEFAULT_PERMISSIONS[OrgRole.MEMBER] },
    [OrgRole.VIEWER]: { ...DEFAULT_PERMISSIONS[OrgRole.VIEWER] },
  };

  for (const custom of customPermissions) {
    result[custom.role] = mergePermissions(
      DEFAULT_PERMISSIONS[custom.role],
      custom.permissions as Partial<PermissionConfig>
    );
  }

  return result;
}

/**
 * Get all module access settings for a role in an organization
 */
export async function getRoleModuleAccessAll(
  organizationId: string,
  role: OrgRole
): Promise<Record<ModuleId, boolean>> {
  const access = await prismadb.roleModuleAccess.findMany({
    where: {
      organizationId,
      role,
    },
  });

  // Start with defaults
  const result: Record<ModuleId, boolean> = {} as Record<ModuleId, boolean>;
  const defaults = role === OrgRole.VIEWER ? DEFAULT_VIEWER_MODULES : ALL_MODULES;

  for (const moduleId of ALL_MODULES) {
    result[moduleId] = defaults.includes(moduleId);
  }

  // Apply custom settings
  for (const a of access) {
    result[a.moduleId as ModuleId] = a.hasAccess;
  }

  return result;
}
