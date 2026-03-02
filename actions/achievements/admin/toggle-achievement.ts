"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import type { Achievement } from "@prisma/client";

/**
 * Toggle an achievement's enabled status (Platform Admin only)
 */
export async function toggleAchievement(
  achievementId: string,
  isEnabled: boolean
): Promise<ActionResponse<Achievement>> {
  const guard = await requirePlatformAdmin();
  if (guard) return guard;

  try {
    const achievement = await prismadb.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return actionNotFound("Achievement");
    }

    const updated = await prismadb.achievement.update({
      where: { id: achievementId },
      data: { isEnabled },
    });

    console.log(
      `[TOGGLE_ACHIEVEMENT] Achievement ${achievement.code} ${isEnabled ? "enabled" : "disabled"}`
    );

    return actionSuccess(updated);
  } catch (error) {
    console.error("[TOGGLE_ACHIEVEMENT]", error);
    return actionError("Failed to toggle achievement", error);
  }
}

/**
 * Get all achievements (including disabled) - Platform Admin only
 */
export async function getAllAchievements(): Promise<ActionResponse<Achievement[]>> {
  const guard = await requirePlatformAdmin();
  if (guard) return guard;

  try {
    const achievements = await prismadb.achievement.findMany({
      orderBy: [
        { category: "asc" },
        { threshold: "asc" },
      ],
    });

    return actionSuccess(achievements);
  } catch (error) {
    console.error("[GET_ALL_ACHIEVEMENTS]", error);
    return actionError("Failed to fetch achievements", error);
  }
}
