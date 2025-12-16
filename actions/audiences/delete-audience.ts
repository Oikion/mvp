"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

export interface DeleteAudienceResult {
  success: boolean;
  error?: string;
}

/**
 * Delete an audience (cascades to all memberships)
 */
export async function deleteAudience(
  audienceId: string
): Promise<DeleteAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if user owns this audience (personal) or is in the same org (org-level)
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        OR: [
          // User created this personal audience
          { createdById: currentUser.id, organizationId: null },
          // It's an org audience the user belongs to (for now allow any org member to delete)
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return { success: false, error: "Audience not found or no permission to delete" };
    }

    // Delete the audience (cascade deletes memberships due to onDelete: Cascade)
    await prismadb.audience.delete({
      where: { id: audienceId },
    });

    revalidatePath("/audiences");

    return { success: true };
  } catch (error) {
    console.error("Error deleting audience:", error);
    return { success: false, error: "Failed to delete audience" };
  }
}








