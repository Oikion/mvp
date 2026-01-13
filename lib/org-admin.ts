import { auth } from "@clerk/nextjs/server";
import { OrgRole } from "@prisma/client";
import {
  clerkRoleToOrgRole,
  roleHasPrivilege,
  ClerkOrgRole,
} from "@/lib/permissions/types";

/**
 * Check if the current user is an admin of the current organization
 * Now checks for org:owner or org:admin (legacy) roles
 * 
 * @returns Promise<boolean> - true if user is org admin/owner, false otherwise
 */
export async function isOrgAdmin(): Promise<boolean> {
  const { has, orgId, orgRole } = await auth();

  // Must be in an organization context
  if (!orgId) {
    return false;
  }

  // Check for new owner role or legacy admin role
  const isOwner = await has({ role: "org:owner" });
  const isLegacyAdmin = await has({ role: "org:admin" });
  
  return isOwner || isLegacyAdmin;
}

/**
 * Check if user has a specific organization role
 * 
 * @param role - The role to check (e.g., "org:owner", "org:lead", "org:member", "org:viewer")
 * @returns Promise<boolean>
 */
export async function hasOrgRole(role: string): Promise<boolean> {
  const { has, orgId } = await auth();

  if (!orgId) {
    return false;
  }

  return await has({ role });
}

/**
 * Get the current organization role for the user as a ClerkOrgRole
 * 
 * @returns Promise<ClerkOrgRole | null> - The Clerk role string or null if not in an org
 */
export async function getCurrentOrgRoleString(): Promise<ClerkOrgRole | null> {
  const { orgRole, orgId } = await auth();

  if (!orgId) {
    return null;
  }

  return (orgRole as ClerkOrgRole) ?? null;
}

/**
 * Get the current organization role for the user as an OrgRole enum
 * 
 * @returns Promise<OrgRole | null> - The role enum or null if not in an org
 */
export async function getCurrentOrgRole(): Promise<OrgRole | null> {
  const { orgRole, orgId } = await auth();

  if (!orgId) {
    return null;
  }

  return clerkRoleToOrgRole(orgRole);
}

/**
 * Check if the current user is an organization owner
 */
export async function isOrgOwner(): Promise<boolean> {
  const { has, orgId } = await auth();

  if (!orgId) {
    return false;
  }

  // Check for owner role or legacy admin
  const isOwner = await has({ role: "org:owner" });
  const isLegacyAdmin = await has({ role: "org:admin" });
  
  return isOwner || isLegacyAdmin;
}

/**
 * Check if the current user is at least a lead (owner or lead)
 */
export async function isAtLeastLead(): Promise<boolean> {
  const { has, orgId } = await auth();

  if (!orgId) {
    return false;
  }

  const isOwner = await has({ role: "org:owner" });
  const isLead = await has({ role: "org:lead" });
  const isLegacyAdmin = await has({ role: "org:admin" });
  
  return isOwner || isLead || isLegacyAdmin;
}

/**
 * Check if the current user is at least a member (owner, lead, or member)
 */
export async function isAtLeastMember(): Promise<boolean> {
  const { has, orgId } = await auth();

  if (!orgId) {
    return false;
  }

  const isOwner = await has({ role: "org:owner" });
  const isLead = await has({ role: "org:lead" });
  const isMember = await has({ role: "org:member" });
  const isLegacyAdmin = await has({ role: "org:admin" });
  
  return isOwner || isLead || isMember || isLegacyAdmin;
}

/**
 * Check if the current user is a viewer (read-only access)
 */
export async function isViewer(): Promise<boolean> {
  const role = await getCurrentOrgRole();
  return role === OrgRole.VIEWER;
}

/**
 * Check if the current user can manage users with a specific role
 * Based on role hierarchy: Owner > Lead > Member > Viewer
 * 
 * @param targetRole - The role of the user being managed
 * @returns Promise<boolean>
 */
export async function canManageRole(targetRole: OrgRole): Promise<boolean> {
  const currentRole = await getCurrentOrgRole();
  
  if (!currentRole) {
    return false;
  }

  // Cannot manage owners (only ownership transfer)
  if (targetRole === OrgRole.OWNER) {
    return false;
  }

  // Must have higher role to manage
  return roleHasPrivilege(currentRole, targetRole) && currentRole !== targetRole;
}/**
 * Get the role hierarchy level (higher = more permissions)
 * Useful for sorting and comparison
 */
export async function getRoleLevel(): Promise<number> {
  const role = await getCurrentOrgRole();
  
  if (!role) {
    return 0;
  }

  const levels: Record<OrgRole, number> = {
    [OrgRole.OWNER]: 4,
    [OrgRole.LEAD]: 3,
    [OrgRole.MEMBER]: 2,
    [OrgRole.VIEWER]: 1,
  };

  return levels[role];
}

/**
 * Check if user has permission to perform a specific action
 * This is a quick check that doesn't query the database for custom permissions
 * For full permission checking with custom overrides, use the permission service
 * 
 * @param action - The action to check
 * @returns Promise<boolean>
 */
export async function hasQuickPermission(
  action: "edit" | "delete" | "create" | "export" | "reassign" | "invite" | "manage_roles"
): Promise<boolean> {
  const role = await getCurrentOrgRole();
  
  if (!role) {
    return false;
  }

  // Permission matrix based on default role permissions
  const permissions: Record<OrgRole, Record<string, boolean>> = {
    [OrgRole.OWNER]: {
      edit: true,
      delete: true,
      create: true,
      export: true,
      reassign: true,
      invite: true,
      manage_roles: true,
    },
    [OrgRole.LEAD]: {
      edit: true,
      delete: true,
      create: true,
      export: true,
      reassign: true,
      invite: true,
      manage_roles: false,
    },
    [OrgRole.MEMBER]: {
      edit: true,
      delete: true,
      create: true,
      export: true,
      reassign: false, // Key restriction
      invite: false,
      manage_roles: false,
    },
    [OrgRole.VIEWER]: {
      edit: false,
      delete: false,
      create: false,
      export: false,
      reassign: false,
      invite: false,
      manage_roles: false,
    },
  };

  return permissions[role][action] ?? false;
}

/**
 * Require at least owner role, throw if not
 */
export async function requireOwner(): Promise<void> {
  const isOwner = await isOrgOwner();
  if (!isOwner) {
    throw new Error("Owner role required");
  }
}

/**
 * Require at least lead role, throw if not
 */
export async function requireAtLeastLead(): Promise<void> {
  const isLead = await isAtLeastLead();
  if (!isLead) {
    throw new Error("Lead or higher role required");
  }
}

/**
 * Require at least member role, throw if not
 */
export async function requireAtLeastMember(): Promise<void> {
  const isMember = await isAtLeastMember();
  if (!isMember) {
    throw new Error("Member or higher role required");
  }
}

/**
 * Require non-viewer role (can modify data), throw if viewer
 */
export async function requireCanModify(): Promise<void> {
  const viewer = await isViewer();
  if (viewer) {
    throw new Error("Viewers cannot modify data");
  }
}
