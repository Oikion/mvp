"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

/**
 * Check if the current organization is a personal workspace
 */
export async function isCurrentOrgPersonal(): Promise<boolean> {
  const { orgId } = await auth();
  if (!orgId) return false;
  return isOrgPersonal(orgId);
}

/**
 * Check if a specific organization is a personal workspace
 */
export async function isOrgPersonal(orgId: string): Promise<boolean> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    const metadata = org.publicMetadata as Record<string, unknown>;
    return metadata?.type === "personal";
  } catch (error) {
    console.error("Error checking if org is personal:", error);
    return false;
  }
}

/**
 * Guard function to prevent operations on personal workspaces
 * Throws an error if the operation is not allowed
 */
export async function guardPersonalWorkspace(
  orgId: string,
  operation: "delete" | "leave" | "invite"
): Promise<void> {
  const isPersonal = await isOrgPersonal(orgId);
  
  if (isPersonal) {
    const operationMessages = {
      delete: "Cannot delete a personal workspace. Use the Reset Workspace feature instead.",
      leave: "Cannot leave your personal workspace. This workspace is tied to your account.",
      invite: "Cannot invite members to a personal workspace. Personal workspaces are single-user only.",
    };
    
    throw new Error(operationMessages[operation]);
  }
}

/**
 * Restore a personal workspace if it was accidentally deleted
 * Called from webhook when organization.deleted event is received
 */
export async function restorePersonalWorkspaceIfNeeded(
  deletedOrgId: string,
  deletedOrgMetadata: Record<string, unknown>,
  userId: string
): Promise<{ restored: boolean; newOrgId?: string }> {
  // Check if this was a personal workspace
  if (deletedOrgMetadata?.type !== "personal") {
    return { restored: false };
  }

  console.log(`Personal workspace ${deletedOrgId} was deleted for user ${userId}. Attempting to restore...`);

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get user info to recreate the workspace
    const user = await clerk.users.getUser(userId);
    const username = user.username || user.firstName || "User";

    // Create a new personal workspace
    const newOrg = await clerk.organizations.createOrganization({
      name: `${username}'s Workspace`,
      slug: `${username.toLowerCase()}-personal-${Date.now()}`, // Add timestamp to avoid slug conflicts
      createdBy: userId,
    });

    // Set metadata to mark as personal
    await clerk.organizations.updateOrganizationMetadata(newOrg.id, {
      publicMetadata: { type: "personal" },
    });

    console.log(`Personal workspace restored. New org ID: ${newOrg.id}`);

    return { restored: true, newOrgId: newOrg.id };
  } catch (error) {
    console.error("Failed to restore personal workspace:", error);
    return { restored: false };
  }
}
