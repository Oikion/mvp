"use server";

import { prismadb } from "@/lib/prisma";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import type { Achievement, AchievementCategory } from "@prisma/client";

/**
 * Get all achievements (enabled only)
 */
export async function getAchievements(): Promise<ActionResponse<Achievement[]>> {
  const guard = await requireAction("achievement:view");
  if (guard) return guard;

  try {
    const achievements = await prismadb.achievement.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: [
        { category: "asc" },
        { threshold: "asc" },
      ],
    });

    return actionSuccess(achievements);
  } catch (error) {
    console.error("[GET_ACHIEVEMENTS]", error);
    return actionError("Failed to fetch achievements", error);
  }
}

/**
 * Get achievements by category
 */
export async function getAchievementsByCategory(
  category: string
): Promise<ActionResponse<Achievement[]>> {
  const guard = await requireAction("achievement:view");
  if (guard) return guard;

  try {
    const achievements = await prismadb.achievement.findMany({
      where: {
        category: category as AchievementCategory,
        isEnabled: true,
      },
      orderBy: [{ threshold: "asc" }],
    });

    return actionSuccess(achievements);
  } catch (error) {
    console.error("[GET_ACHIEVEMENTS_BY_CATEGORY]", error);
    return actionError("Failed to fetch achievements", error);
  }
}
