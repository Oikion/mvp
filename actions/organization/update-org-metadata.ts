"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

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

    // Update organization metadata
    await clerk.organizations.updateOrganizationMetadata(organizationId, {
      publicMetadata: metadata,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating organization metadata:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update organization metadata";
    return { error: errorMessage };
  }
}
