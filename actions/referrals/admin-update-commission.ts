"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface UpdateCommissionInput {
  referralCodeId: string;
  commissionRate: number;
}

/**
 * Update a user's commission rate
 */
export async function adminUpdateCommissionRate(input: UpdateCommissionInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const admin = await requirePlatformAdmin();

  try {
    const { referralCodeId, commissionRate } = input;

    // Validate commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      return { success: false, error: "Commission rate must be between 0 and 100" };
    }

    // Get current referral code
    const referralCode = await prismadb.referralCode.findUnique({
      where: { id: referralCodeId },
    });

    if (!referralCode) {
      return { success: false, error: "Referral code not found" };
    }

    const previousRate = Number(referralCode.commissionRate);

    // Update commission rate
    await prismadb.referralCode.update({
      where: { id: referralCodeId },
      data: { commissionRate },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", referralCodeId, {
      action: "UPDATE_COMMISSION_RATE",
      previousRate,
      newRate: commissionRate,
      userId: referralCode.userId,
    });

    return { success: true };
  } catch (error) {
    console.error("[ADMIN_UPDATE_COMMISSION_RATE]", error);
    return { success: false, error: "Failed to update commission rate" };
  }
}

/**
 * Toggle referral code active status
 */
export async function adminToggleReferralCodeStatus(
  referralCodeId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  try {
    const referralCode = await prismadb.referralCode.findUnique({
      where: { id: referralCodeId },
    });

    if (!referralCode) {
      return { success: false, error: "Referral code not found" };
    }

    await prismadb.referralCode.update({
      where: { id: referralCodeId },
      data: { isActive },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", referralCodeId, {
      action: "TOGGLE_REFERRAL_CODE_STATUS",
      previousStatus: referralCode.isActive,
      newStatus: isActive,
      userId: referralCode.userId,
    });

    return { success: true };
  } catch (error) {
    console.error("[ADMIN_TOGGLE_REFERRAL_CODE_STATUS]", error);
    return { success: false, error: "Failed to toggle referral code status" };
  }
}

/**
 * Update referral status (convert, cancel, etc.)
 */
export async function adminUpdateReferralStatus(
  referralId: string,
  status: "PENDING" | "CONVERTED" | "CANCELLED"
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  try {
    const referral = await prismadb.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      return { success: false, error: "Referral not found" };
    }

    await prismadb.referral.update({
      where: { id: referralId },
      data: {
        status,
        ...(status === "CONVERTED" && !referral.convertedAt && {
          convertedAt: new Date(),
        }),
      },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", referralId, {
      action: "UPDATE_REFERRAL_STATUS",
      previousStatus: referral.status,
      newStatus: status,
    });

    return { success: true };
  } catch (error) {
    console.error("[ADMIN_UPDATE_REFERRAL_STATUS]", error);
    return { success: false, error: "Failed to update referral status" };
  }
}

