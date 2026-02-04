"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { ReferralStatus, PayoutStatus } from "@prisma/client";

export interface AdminReferralData {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string | null;
  referredUserId: string;
  referredUserEmail: string;
  referredUserName: string | null;
  status: ReferralStatus;
  totalEarnings: number;
  commissionRate: number;
  convertedAt: Date | null;
  createdAt: Date;
  payoutCount: number;
  totalPaid: number;
}

export interface AdminReferralStats {
  totalReferralCodes: number;
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  totalCommissionsEarned: number;
  totalCommissionsPaid: number;
  totalCommissionsPending: number;
}

export interface AdminReferralCodeData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  code: string;
  commissionRate: number;
  isActive: boolean;
  referralCount: number;
  totalEarnings: number;
  createdAt: Date;
}

export interface GetAllReferralsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReferralStatus | "ALL";
  sortBy?: "createdAt" | "totalEarnings" | "referrerEmail";
  sortOrder?: "asc" | "desc";
}

export interface GetAllReferralsResult {
  referrals: AdminReferralData[];
  totalCount: number;
  page: number;
  totalPages: number;
  stats: AdminReferralStats;
}

/**
 * Get all referrals for platform admin
 */
export async function adminGetAllReferrals(
  options: GetAllReferralsOptions = {}
): Promise<GetAllReferralsResult> {
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    limit = 20,
    search = "",
    status = "ALL",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  try {
    await logAdminAction(admin.clerkId, "VIEW_USERS", undefined, { 
      action: "VIEW_REFERRALS",
      page, 
      search, 
      status 
    });

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          referredUser: {
            email: { contains: search, mode: "insensitive" },
          },
        },
        {
          referredUser: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          referralCode: {
            user: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          referralCode: {
            code: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Get total count
    const totalCount = await prismadb.referral.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get referrals
    const referrals = await prismadb.referral.findMany({
      where,
      orderBy: sortBy === "referrerEmail" 
        ? { referralCode: { user: { email: sortOrder } } }
        : { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        referredUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        referralCode: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        payouts: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    // Process referrals
    const processedReferrals: AdminReferralData[] = referrals.map((ref) => {
      const paidPayouts = ref.payouts.filter((p) => p.status === "PAID");
      const totalPaid = paidPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        id: ref.id,
        referrerId: ref.referralCode.user.id,
        referrerEmail: ref.referralCode.user.email,
        referrerName: ref.referralCode.user.name,
        referredUserId: ref.referredUser.id,
        referredUserEmail: ref.referredUser.email,
        referredUserName: ref.referredUser.name,
        status: ref.status,
        totalEarnings: Number(ref.totalEarnings),
        commissionRate: Number(ref.referralCode.commissionRate),
        convertedAt: ref.convertedAt,
        createdAt: ref.createdAt,
        payoutCount: ref.payouts.length,
        totalPaid,
      };
    });

    // Get stats
    const stats = await getAdminReferralStats();

    return {
      referrals: processedReferrals,
      totalCount,
      page,
      totalPages,
      stats,
    };
  } catch (error) {
    console.error("[ADMIN_GET_ALL_REFERRALS]", error);
    throw new Error("Failed to fetch referrals");
  }
}

/**
 * Get all referral codes for platform admin
 */
export async function adminGetAllReferralCodes(
  options: { page?: number; limit?: number; search?: string } = {}
): Promise<{ codes: AdminReferralCodeData[]; totalCount: number; page: number; totalPages: number }> {
  await requirePlatformAdmin();

  const { page = 1, limit = 20, search = "" } = options;

  try {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const totalCount = await prismadb.referralCode.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const codes = await prismadb.referralCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        referrals: {
          select: {
            totalEarnings: true,
          },
        },
      },
    });

    const processedCodes: AdminReferralCodeData[] = codes.map((code) => ({
      id: code.id,
      userId: code.user.id,
      userEmail: code.user.email,
      userName: code.user.name,
      code: code.code,
      commissionRate: Number(code.commissionRate),
      isActive: code.isActive,
      referralCount: code.referrals.length,
      totalEarnings: code.referrals.reduce((sum, r) => sum + Number(r.totalEarnings), 0),
      createdAt: code.createdAt,
    }));

    return {
      codes: processedCodes,
      totalCount,
      page,
      totalPages,
    };
  } catch (error) {
    console.error("[ADMIN_GET_ALL_REFERRAL_CODES]", error);
    throw new Error("Failed to fetch referral codes");
  }
}

/**
 * Get referral statistics for admin dashboard
 */
async function getAdminReferralStats(): Promise<AdminReferralStats> {
  const [
    totalReferralCodes,
    totalReferrals,
    convertedReferrals,
    pendingReferrals,
    referralsWithEarnings,
    paidPayouts,
  ] = await Promise.all([
    prismadb.referralCode.count(),
    prismadb.referral.count(),
    prismadb.referral.count({ where: { status: "CONVERTED" } }),
    prismadb.referral.count({ where: { status: "PENDING" } }),
    prismadb.referral.findMany({
      select: { totalEarnings: true },
    }),
    prismadb.referralPayout.findMany({
      where: { status: "PAID" },
      select: { amount: true },
    }),
  ]);

  const totalCommissionsEarned = referralsWithEarnings.reduce(
    (sum, r) => sum + Number(r.totalEarnings),
    0
  );
  const totalCommissionsPaid = paidPayouts.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalCommissionsPending = totalCommissionsEarned - totalCommissionsPaid;

  return {
    totalReferralCodes,
    totalReferrals,
    convertedReferrals,
    pendingReferrals,
    totalCommissionsEarned,
    totalCommissionsPaid,
    totalCommissionsPending,
  };
}

/**
 * Get detailed referral info for a specific referral
 */
export async function adminGetReferralDetails(referralId: string) {
  const admin = await requirePlatformAdmin();

  await logAdminAction(admin.clerkId, "VIEW_USER_DETAILS", referralId, {
    action: "VIEW_REFERRAL_DETAILS",
  });

  const referral = await prismadb.referral.findUnique({
    where: { id: referralId },
    include: {
      referredUser: {
        select: {
          id: true,
          email: true,
          name: true,
          created_on: true,
          userStatus: true,
        },
      },
      referralCode: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      payouts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!referral) {
    return null;
  }

  return {
    id: referral.id,
    status: referral.status,
    totalEarnings: Number(referral.totalEarnings),
    convertedAt: referral.convertedAt,
    createdAt: referral.createdAt,
    referrer: {
      id: referral.referralCode.user.id,
      email: referral.referralCode.user.email,
      name: referral.referralCode.user.name,
      commissionRate: Number(referral.referralCode.commissionRate),
    },
    referredUser: {
      id: referral.referredUser.id,
      email: referral.referredUser.email,
      name: referral.referredUser.name,
      createdAt: referral.referredUser.created_on,
      status: referral.referredUser.userStatus,
    },
    payouts: referral.payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      paidAt: p.paidAt,
      paidByAdminId: p.paidByAdminId,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
  };
}
