"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import type { UserAchievement, Achievement } from "@prisma/client";

export type UserAchievementWithDetails = UserAchievement & {
  achievement: Achievement;
};

/**
 * Get current user's achievements
 */
export async function getMyAchievements(): Promise<
  ActionResponse<UserAchievementWithDetails[]>
> {
  const guard = await requireAction("achievement:view");
  if (guard) return guard;

  const currentUser = await getCurrentUser();

  try {
    const userAchievements = await prismadb.userAchievement.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        achievement: true,
      },
      orderBy: [
        { earnedAt: "desc" },
      ],
    });

    return actionSuccess(userAchievements);
  } catch (error) {
    console.error("[GET_MY_ACHIEVEMENTS]", error);
    return actionError("Failed to fetch achievements", error);
  }
}

/**
 * Get a specific user's public achievements (not hidden)
 */
export async function getUserPublicAchievements(
  userId: string
): Promise<ActionResponse<UserAchievementWithDetails[]>> {
  try {
    // Check if user's profile shows achievements
    const profile = await prismadb.agentProfile.findUnique({
      where: { userId },
      select: { showAchievements: true },
    });

    if (!profile || !profile.showAchievements) {
      return actionSuccess([]);
    }

    const userAchievements = await prismadb.userAchievement.findMany({
      where: {
        userId,
        isHidden: false,
      },
      include: {
        achievement: true,
      },
      orderBy: [
        { earnedAt: "desc" },
      ],
    });

    // Filter out any achievements that were deleted or are disabled
    const validAchievements = userAchievements.filter(
      (ua) => ua.achievement !== null && ua.achievement.isEnabled
    ) as UserAchievementWithDetails[];

    return actionSuccess(validAchievements);
  } catch (error) {
    console.error("[GET_USER_PUBLIC_ACHIEVEMENTS]", error);
    return actionError("Failed to fetch user achievements", error);
  }
}

/**
 * Get achievement stats for a user
 */
export async function getMyAchievementStats(): Promise<
  ActionResponse<{
    totalEarned: number;
    totalAvailable: number;
    byCategory: Record<string, number>;
  }>
> {
  const guard = await requireAction("achievement:view");
  if (guard) return guard;

  const currentUser = await getCurrentUser();

  try {
    const [userAchievements, allAchievements] = await Promise.all([
      prismadb.userAchievement.findMany({
        where: { userId: currentUser.id },
        include: { achievement: true },
      }),
      prismadb.achievement.findMany({
        where: { isEnabled: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const ua of userAchievements) {
      const category = ua.achievement.category;
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return actionSuccess({
      totalEarned: userAchievements.length,
      totalAvailable: allAchievements.length,
      byCategory,
    });
  } catch (error) {
    console.error("[GET_MY_ACHIEVEMENT_STATS]", error);
    return actionError("Failed to fetch achievement stats", error);
  }
}
