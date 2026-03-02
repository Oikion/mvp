"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import type { UserAchievement } from "@prisma/client";

/**
 * Toggle visibility of a user's achievement (hide/show)
 */
export async function toggleAchievementVisibility(
  achievementId: string
): Promise<ActionResponse<UserAchievement>> {
  const guard = await requireAction("achievement:manage_own");
  if (guard) return guard;

  const currentUser = await getCurrentUser();

  try {
    const userAchievement = await prismadb.userAchievement.findFirst({
      where: {
        userId: currentUser.id,
        achievementId,
      },
    });

    if (!userAchievement) {
      return actionNotFound("Achievement");
    }

    const updated = await prismadb.userAchievement.update({
      where: { id: userAchievement.id },
      data: { isHidden: !userAchievement.isHidden },
    });

    return actionSuccess(updated);
  } catch (error) {
    console.error("[TOGGLE_ACHIEVEMENT_VISIBILITY]", error);
    return actionError("Failed to toggle achievement visibility", error);
  }
}

/**
 * Toggle the master achievements display on profile
 */
export async function toggleProfileAchievements(
  show: boolean
): Promise<ActionResponse<{ showAchievements: boolean }>> {
  const guard = await requireAction("achievement:manage_own");
  if (guard) return guard;

  const currentUser = await getCurrentUser();

  try {
    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: { showAchievements: show },
    });

    return actionSuccess({ showAchievements: show });
  } catch (error) {
    console.error("[TOGGLE_PROFILE_ACHIEVEMENTS]", error);
    return actionError("Failed to update profile settings", error);
  }
}
