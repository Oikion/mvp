import { prismadb } from "@/lib/prisma";
import type { UserAchievement } from "@prisma/client";

export interface AwardResult {
  success: boolean;
  data?: {
    userAchievement: UserAchievement;
    newlyAwarded: boolean;
  };
  error?: string;
}

/**
 * Award an achievement to a user
 * @param userId - User to award the achievement to
 * @param achievementId - Achievement to award
 * @param organizationId - Optional organization context (for org-scoped achievements)
 * @returns Award result with success flag and newly awarded indicator
 */
export async function awardAchievement(
  userId: string,
  achievementId: string,
  organizationId?: string | null
): Promise<AwardResult> {
  try {
    const achievement = await prismadb.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return { success: false, error: "Achievement not found" };
    }

    if (!achievement.isEnabled) {
      return { success: false, error: "Achievement is disabled" };
    }

    const existing = await prismadb.userAchievement.findFirst({
      where: {
        userId,
        achievementId,
      },
    });

    if (existing) {
      return {
        success: true,
        data: {
          userAchievement: existing,
          newlyAwarded: false,
        },
      };
    }

    const userAchievement = await prismadb.userAchievement.create({
      data: {
        userId,
        achievementId,
        organizationId: organizationId || null,
        isHidden: false,
      },
    });

    console.log(
      `[AWARD_ACHIEVEMENT] User ${userId} earned achievement ${achievement.code}`
    );

    return {
      success: true,
      data: {
        userAchievement,
        newlyAwarded: true,
      },
    };
  } catch (error) {
    console.error("[AWARD_ACHIEVEMENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a user has earned a specific achievement
 */
export async function hasAchievement(
  userId: string,
  achievementCode: string
): Promise<boolean> {
  try {
    const achievement = await prismadb.achievement.findUnique({
      where: { code: achievementCode },
    });

    if (!achievement) {
      return false;
    }

    const userAchievement = await prismadb.userAchievement.findFirst({
      where: {
        userId,
        achievementId: achievement.id,
      },
    });

    return !!userAchievement;
  } catch (error) {
    console.error("[HAS_ACHIEVEMENT]", error);
    return false;
  }
}
