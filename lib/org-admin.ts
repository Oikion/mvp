import { auth } from "@clerk/nextjs/server";

/**
 * Check if the current user is an admin of the current organization
 * Uses Clerk's `has()` method to verify the org:admin role
 * 
 * @returns Promise<boolean> - true if user is org admin, false otherwise
 */
export async function isOrgAdmin(): Promise<boolean> {
  const { has, orgId } = await auth();

  // Must be in an organization context
  if (!orgId) {
    return false;
  }

  // Check if user has org:admin role in the current organization
  const hasAdminRole = await has({ role: "org:admin" });
  return hasAdminRole;
}

/**
 * Check if user has a specific organization role
 * 
 * @param role - The role to check (e.g., "org:admin", "org:member")
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
 * Get the current organization role for the user
 * 
 * @returns Promise<string | null> - The role or null if not in an org
 */
export async function getCurrentOrgRole(): Promise<string | null> {
  const { orgRole, orgId } = await auth();

  if (!orgId) {
    return null;
  }

  return orgRole ?? null;
}









