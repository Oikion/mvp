"use server";

import { prismadb } from "@/lib/prisma";

export interface TrackReferralInput {
  referralCode: string;
  referredUserId: string;
}

export interface TrackReferralResult {
  success: boolean;
  referralId?: string;
  error?: string;
}

/**
 * Track a new referral when a user signs up with a referral code
 * This should be called during/after the registration process
 */
export async function trackReferral(input: TrackReferralInput): Promise<TrackReferralResult> {
  try {
    const { referralCode, referredUserId } = input;

    // Find the referral code
    const code = await prismadb.referralCode.findUnique({
      where: { code: referralCode },
    });

    if (!code) {
      return {
        success: false,
        error: "Invalid referral code",
      };
    }

    if (!code.isActive) {
      return {
        success: false,
        error: "Referral code is no longer active",
      };
    }

    // Check if the referred user is the same as the referrer
    if (code.userId === referredUserId) {
      return {
        success: false,
        error: "Cannot use your own referral code",
      };
    }

    // Check if user was already referred
    const existingReferral = await prismadb.referral.findUnique({
      where: { referredUserId },
    });

    if (existingReferral) {
      return {
        success: false,
        error: "User has already been referred",
      };
    }

    // Create the referral
    const referral = await prismadb.referral.create({
      data: {
        referralCodeId: code.id,
        referredUserId,
        status: "PENDING",
        totalEarnings: 0,
      },
    });

    return {
      success: true,
      referralId: referral.id,
    };
  } catch (error) {
    console.error("[TRACK_REFERRAL]", error);
    return {
      success: false,
      error: "Failed to track referral",
    };
  }
}

/**
 * Validate a referral code without creating a referral
 * Used to show feedback during registration
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  referrerName?: string;
  error?: string;
}> {
  try {
    const referralCode = await prismadb.referralCode.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            name: true,
            firstName: true,
          },
        },
      },
    });

    if (!referralCode) {
      return {
        valid: false,
        error: "Invalid referral code",
      };
    }

    if (!referralCode.isActive) {
      return {
        valid: false,
        error: "Referral code is no longer active",
      };
    }

    // Get a display name for the referrer
    const referrerName = referralCode.user.name || referralCode.user.firstName || "A friend";

    return {
      valid: true,
      referrerName,
    };
  } catch (error) {
    console.error("[VALIDATE_REFERRAL_CODE]", error);
    return {
      valid: false,
      error: "Failed to validate code",
    };
  }
}
