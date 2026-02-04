"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { createReferralCode, formatReferralUrl } from "@/lib/referrals/create-referral-code";

export interface ReferralCodeData {
  id: string;
  code: string;
  commissionRate: number;
  isActive: boolean;
  referralUrl: string;
  createdAt: Date;
}

/**
 * Get the current user's referral code
 * Creates one if it doesn't exist
 */
export async function getReferralCode(): Promise<ReferralCodeData> {
  const user = await getCurrentUser();

  // Check if user already has a referral code
  let referralCode = await prismadb.referralCode.findUnique({
    where: { userId: user.id },
  });

  // If no code exists, create one
  if (!referralCode) {
    // Generate a unique code
    let code = createReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const existing = await prismadb.referralCode.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = createReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique referral code");
    }

    referralCode = await prismadb.referralCode.create({
      data: {
        userId: user.id,
        code,
        commissionRate: 10, // Default 10%
        isActive: true,
      },
    });
  }

  return {
    id: referralCode.id,
    code: referralCode.code,
    commissionRate: Number(referralCode.commissionRate),
    isActive: referralCode.isActive,
    referralUrl: formatReferralUrl(referralCode.code),
    createdAt: referralCode.createdAt,
  };
}

/**
 * Regenerate the user's referral code
 * This invalidates the old code
 */
export async function regenerateReferralCode(): Promise<ReferralCodeData> {
  const user = await getCurrentUser();

  // Generate a unique code
  let code = createReferralCode();
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure code is unique
  while (attempts < maxAttempts) {
    const existing = await prismadb.referralCode.findUnique({
      where: { code },
    });

    if (!existing) {
      break;
    }

    code = createReferralCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique referral code");
  }

  // Upsert the referral code
  const referralCode = await prismadb.referralCode.upsert({
    where: { userId: user.id },
    update: {
      code,
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      code,
      commissionRate: 10,
      isActive: true,
    },
  });

  return {
    id: referralCode.id,
    code: referralCode.code,
    commissionRate: Number(referralCode.commissionRate),
    isActive: referralCode.isActive,
    referralUrl: formatReferralUrl(referralCode.code),
    createdAt: referralCode.createdAt,
  };
}
