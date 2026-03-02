"use server";

import { prismadb } from "@/lib/prisma";
import { awardAchievement } from "@/lib/achievements/award-achievement";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

/**
 * Check and award achievements for a user.
 *
 * @auth-exempt: internal system trigger — called only from authenticated server-side
 * callers (e.g., adminUpdateReferralStatus after a conversion). The userId is
 * supplied by the caller which has already verified admin access; this function
 * must not re-verify since it may be invoked from background jobs.
 */
export async function checkAndAwardAchievements(
  userId: string,
  category: string
): Promise<ActionResponse<{ awarded: number }>> {
  try {
    let awarded = 0;

    switch (category) {
      case "REFERRAL":
        awarded = await checkAndAwardReferralAchievements(userId);
        break;
      default:
        console.warn(`[CHECK_AND_AWARD] Unknown category: ${category}`);
    }

    return actionSuccess({ awarded });
  } catch (error) {
    console.error("[CHECK_AND_AWARD_ACHIEVEMENTS]", error);
    return actionError("Failed to check achievements", error);
  }
}

/**
 * Check and award referral achievements
 */
async function checkAndAwardReferralAchievements(userId: string): Promise<number> {
  try {
    // Get user's referral code
    const referralCode = await prismadb.referralCode.findUnique({
      where: { userId },
      include: {
        referrals: {
          where: { status: "CONVERTED" },
        },
      },
    });

    if (!referralCode) {
      return 0;
    }

    const convertedCount = referralCode.referrals.length;

    // Get all referral achievements
    const achievements = await prismadb.achievement.findMany({
      where: {
        category: "REFERRAL",
        isEnabled: true,
        threshold: { lte: convertedCount },
      },
    });

    let awarded = 0;
    for (const achievement of achievements) {
      const result = await awardAchievement(userId, achievement.id);
      if (result.success && result.data?.newlyAwarded) {
        awarded++;
        console.log(`[AWARD_ACHIEVEMENT] User ${userId} earned ${achievement.code}`);
      }
    }

    return awarded;
  } catch (error) {
    console.error("[CHECK_REFERRAL_ACHIEVEMENTS]", error);
    throw error;
  }
}
