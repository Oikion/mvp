import { prismadb } from "@/lib/prisma";
import { awardAchievement } from "./award-achievement";

/**
 * Check and award referral achievements for a user
 * Called when a referral is converted
 * @param userId - The user who made the referrals (referral code owner)
 * @returns Number of new achievements awarded
 */
export async function checkAndAwardReferralAchievements(
  userId: string
): Promise<number> {
  try {
    const referralCode = await prismadb.referralCode.findUnique({
      where: { userId },
      include: {
        referrals: {
          where: { status: "CONVERTED" },
        },
      },
    });

    if (!referralCode) {
      console.log(`[CHECK_REFERRAL] No referral code found for user ${userId}`);
      return 0;
    }

    const convertedCount = referralCode.referrals.length;
    console.log(
      `[CHECK_REFERRAL] User ${userId} has ${convertedCount} converted referrals`
    );

    const achievements = await prismadb.achievement.findMany({
      where: {
        category: "REFERRAL",
        isEnabled: true,
        threshold: { lte: convertedCount },
      },
    });

    let newlyAwarded = 0;

    for (const achievement of achievements) {
      const result = await awardAchievement(userId, achievement.id);
      if (result.success && result.data?.newlyAwarded) {
        newlyAwarded++;
        console.log(
          `[CHECK_REFERRAL] Awarded ${achievement.code} to user ${userId}`
        );
      }
    }

    if (newlyAwarded > 0) {
      console.log(
        `[CHECK_REFERRAL] Awarded ${newlyAwarded} new achievements to user ${userId}`
      );
    }

    return newlyAwarded;
  } catch (error) {
    console.error("[CHECK_REFERRAL]", error);
    throw error;
  }
}
