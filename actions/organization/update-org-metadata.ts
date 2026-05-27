"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

/**
 * Update Clerk publicMetadata for a specific organization.
 *
 * The `organizationId` parameter is intentional here: this function is called
 * during onboarding / personal-workspace setup immediately after a new org is
 * created, before the user has switched into that org's session context.
 * Therefore we cannot derive the org from `auth()` — but we MUST verify that
 * the authenticated user is actually a member of the target org before writing.
 */
export async function updateOrganizationMetadata(
  organizationId: string,
  metadata: Record<string, unknown>
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: "User not authenticated" };
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Authorization: verify the caller is a member of the target org before
    // allowing any metadata write. This prevents an authenticated user from
    // updating metadata on an org they do not belong to.
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
    });
    const isMember = memberships.data.some(
      (m) => m.publicUserData?.userId === userId
    );
    if (!isMember) {
      return { error: "You are not a member of this organization" };
    }

    // Update organization metadata
    await clerk.organizations.updateOrganizationMetadata(organizationId, {
      publicMetadata: metadata,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("[UPDATE_ORG_METADATA]", error);
    return { error: "Failed to update organization metadata" };
  }
}
