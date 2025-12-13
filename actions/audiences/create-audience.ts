"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { generateFriendlyId } from "@/lib/friendly-id";

export interface CreateAudienceInput {
  name: string;
  description?: string;
  isOrgLevel: boolean;
  isAutoSync?: boolean;
  memberIds?: string[];
}

export interface CreateAudienceResult {
  success: boolean;
  audienceId?: string;
  error?: string;
}

/**
 * Create a new audience (personal or org-level)
 */
export async function createAudience(
  input: CreateAudienceInput
): Promise<CreateAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { name, description, isOrgLevel, isAutoSync = false, memberIds = [] } = input;

    if (!name || name.trim().length === 0) {
      return { success: false, error: "Audience name is required" };
    }

    // Generate friendly ID
    const audienceId = await generateFriendlyId(prismadb, "Audience");

    // Create the audience
    const audience = await prismadb.audience.create({
      data: {
        id: audienceId,
        name: name.trim(),
        description: description?.trim() || null,
        createdById: currentUser.id,
        organizationId: isOrgLevel ? organizationId : null,
        isAutoSync: isOrgLevel ? isAutoSync : false, // Only org-level can auto-sync
      },
    });

    // Add initial members if provided
    if (memberIds.length > 0) {
      await prismadb.audienceMember.createMany({
        data: memberIds.map((userId) => ({
          audienceId: audience.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/audiences");

    return { success: true, audienceId: audience.id };
  } catch (error) {
    console.error("Error creating audience:", error);
    return { success: false, error: "Failed to create audience" };
  }
}






