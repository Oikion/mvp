"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { createReferralCode as generateCode } from "@/lib/referrals/create-referral-code";
import { revalidatePath } from "next/cache";

export interface CreateReferralCodeInput {
  userId: string;
  commissionRate?: number;
}

export interface CreateReferralCodeResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Admin action to create a referral code for a specific user
 */
export async function adminCreateReferralCode(
  input: CreateReferralCodeInput
): Promise<CreateReferralCodeResult> {
  const admin = await requirePlatformAdmin();

  const { userId, commissionRate = 10 } = input;

  try {
    // Validate commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      return {
        success: false,
        error: "Commission rate must be between 0 and 100",
      };
    }

    // Check if user exists
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check if user already has a referral code
    const existingCode = await prismadb.referralCode.findUnique({
      where: { userId },
    });

    if (existingCode) {
      return {
        success: false,
        error: "User already has a referral code",
      };
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prismadb.referralCode.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return {
        success: false,
        error: "Failed to generate unique referral code",
      };
    }

    // Create the referral code
    const referralCode = await prismadb.referralCode.create({
      data: {
        userId,
        code,
        commissionRate,
        isActive: true,
      },
    });

    // Log admin action
    await logAdminAction(admin.clerkId, "CREATE_REFERRAL_CODE", userId, {
      referralCodeId: referralCode.id,
      code: referralCode.code,
      commissionRate,
      userEmail: user.email,
    });

    // Revalidate the referrals page
    revalidatePath("/[locale]/app/platform-admin/referrals");

    return {
      success: true,
      code: referralCode.code,
    };
  } catch (error) {
    console.error("[ADMIN_CREATE_REFERRAL_CODE]", error);
    return {
      success: false,
      error: "Failed to create referral code",
    };
  }
}

/**
 * Search users who don't have a referral code yet
 */
export async function adminSearchUsersWithoutReferralCode(
  search: string
): Promise<{ id: string; email: string; name: string | null }[]> {
  await requirePlatformAdmin();

  if (!search || search.length < 2) {
    return [];
  }

  try {
    const users = await prismadb.users.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          },
          {
            ReferralCode: null, // Only users without a referral code
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: 10,
      orderBy: { email: "asc" },
    });

    return users;
  } catch (error) {
    console.error("[ADMIN_SEARCH_USERS_WITHOUT_REFERRAL]", error);
    return [];
  }
}
