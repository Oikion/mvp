"use server";

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { revalidatePath } from "next/cache";

export interface SyncOrgAudienceResult {
  success: boolean;
  addedCount?: number;
  error?: string;
}

/**
 * Sync an org-level audience with all current org members
 * This is called manually or can be set up to run automatically
 */
export async function syncOrgAudience(
  audienceId: string
): Promise<SyncOrgAudienceResult> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify audience exists and is org-level
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        organizationId,
        isAutoSync: true,
      },
    });

    if (!audience) {
      return {
        success: false,
        error: "Audience not found, not an org audience, or auto-sync is disabled",
      };
    }

    // Get all org members
    const { users: orgMembers } = await getOrgMembersFromDb();
    const orgMemberIds = orgMembers.map((u: any) => u.id);

    // Get current audience members
    const currentMembers = await prismadb.audienceMember.findMany({
      where: { audienceId },
      select: { userId: true },
    });
    const currentMemberIds = new Set(currentMembers.map((m) => m.userId));

    // Find members to add (in org but not in audience)
    const membersToAdd = orgMemberIds.filter((id: string) => !currentMemberIds.has(id));

    if (membersToAdd.length > 0) {
      await prismadb.audienceMember.createMany({
        data: membersToAdd.map((userId: string) => ({
          audienceId,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/audiences");
    revalidatePath(`/audiences/${audienceId}`);

    return { success: true, addedCount: membersToAdd.length };
  } catch (error) {
    console.error("Error syncing org audience:", error);
    return { success: false, error: "Failed to sync organization members" };
  }
}

/**
 * Create an auto-sync org audience with all current org members
 */
export async function createOrgAutoSyncAudience(
  name: string,
  description?: string
): Promise<{ success: boolean; audienceId?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Create the audience with auto-sync enabled
    const audience = await prismadb.audience.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        createdById: currentUser.id,
        organizationId,
        isAutoSync: true,
      },
    });

    // Immediately sync org members
    const { users: orgMembers } = await getOrgMembersFromDb();
    
    if (orgMembers.length > 0) {
      await prismadb.audienceMember.createMany({
        data: orgMembers.map((user: any) => ({
          audienceId: audience.id,
          userId: user.id,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/audiences");

    return { success: true, audienceId: audience.id };
  } catch (error) {
    console.error("Error creating auto-sync audience:", error);
    return { success: false, error: "Failed to create organization audience" };
  }
}

