"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

export interface UpdateAudienceInput {
  audienceId: string;
  name?: string;
  description?: string;
  isAutoSync?: boolean;
}

export interface UpdateAudienceResult {
  success: boolean;
  error?: string;
}

/**
 * Update an audience's name, description, or auto-sync setting
 */
export async function updateAudience(
  input: UpdateAudienceInput
): Promise<UpdateAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { audienceId, name, description, isAutoSync } = input;

    // Check if user has access to this audience
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        OR: [
          // User owns this personal audience
          { createdById: currentUser.id, organizationId: null },
          // User is in the same org (org admins can edit org audiences)
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return { success: false, error: "Audience not found or no permission" };
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description.trim() || null;
    }
    if (isAutoSync !== undefined && audience.organizationId) {
      // Only org-level audiences can have auto-sync
      updateData.isAutoSync = isAutoSync;
    }

    await prismadb.audience.update({
      where: { id: audienceId },
      data: updateData,
    });

    revalidatePath("/audiences");
    revalidatePath(`/audiences/${audienceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating audience:", error);
    return { success: false, error: "Failed to update audience" };
  }
}

/**
 * Add members to an audience
 */
export async function addAudienceMembers(
  audienceId: string,
  memberIds: string[]
): Promise<UpdateAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if user has access to this audience
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        OR: [
          { createdById: currentUser.id, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return { success: false, error: "Audience not found or no permission" };
    }

    // Add members
    await prismadb.audienceMember.createMany({
      data: memberIds.map((userId) => ({
        audienceId,
        userId,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/audiences");
    revalidatePath(`/audiences/${audienceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error adding audience members:", error);
    return { success: false, error: "Failed to add members" };
  }
}

/**
 * Remove a member from an audience
 */
export async function removeAudienceMember(
  audienceId: string,
  userId: string
): Promise<UpdateAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if user has access to this audience
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        OR: [
          { createdById: currentUser.id, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return { success: false, error: "Audience not found or no permission" };
    }

    // Remove member
    await prismadb.audienceMember.deleteMany({
      where: {
        audienceId,
        userId,
      },
    });

    revalidatePath("/audiences");
    revalidatePath(`/audiences/${audienceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing audience member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}



