"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { ReferralStatus, PayoutStatus } from "@prisma/client";

export interface ReferralData {
  id: string;
  referredUserEmail: string; // Masked for privacy
  referredUserName: string | null;
  status: ReferralStatus;
  totalEarnings: number;
  convertedAt: Date | null;
  createdAt: Date;
}

export interface PayoutData {
  id: string;
  amount: number;
  status: PayoutStatus;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface ReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}

export interface UserReferralsResult {
  referrals: ReferralData[];
  stats: ReferralStats;
  payouts: PayoutData[];
}

/**
 * Mask email for privacy (e.g., "john@example.com" -> "j***@e***.com")
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***@***.***";
  
  const [domainName, tld] = domain.split(".");
  
  const maskedLocal = localPart.length > 1 
    ? localPart[0] + "***" 
    : "***";
  
  const maskedDomain = domainName && domainName.length > 1 
    ? domainName[0] + "***" 
    : "***";
  
  return `${maskedLocal}@${maskedDomain}.${tld || "***"}`;
}

/**
 * Get all referrals for the current user
 */
export async function getUserReferrals(): Promise<UserReferralsResult> {
  const user = await getCurrentUser();

  // Get user's referral code with referrals
  const referralCode = await prismadb.referralCode.findUnique({
    where: { userId: user.id },
    include: {
      referrals: {
        include: {
          referredUser: {
            select: {
              email: true,
              name: true,
            },
          },
          payouts: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!referralCode) {
    return {
      referrals: [],
      stats: {
        totalReferrals: 0,
        convertedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
      },
      payouts: [],
    };
  }

  // Process referrals
  const referrals: ReferralData[] = referralCode.referrals.map((ref) => ({
    id: ref.id,
    referredUserEmail: maskEmail(ref.referredUser.email),
    referredUserName: ref.referredUser.name,
    status: ref.status,
    totalEarnings: Number(ref.totalEarnings),
    convertedAt: ref.convertedAt,
    createdAt: ref.createdAt,
  }));

  // Collect all payouts
  const allPayouts: PayoutData[] = [];
  for (const ref of referralCode.referrals) {
    for (const payout of ref.payouts) {
      allPayouts.push({
        id: payout.id,
        amount: Number(payout.amount),
        status: payout.status,
        paidAt: payout.paidAt,
        notes: payout.notes,
        createdAt: payout.createdAt,
      });
    }
  }

  // Sort payouts by date
  allPayouts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Calculate stats
  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter((r) => r.status === "CONVERTED").length;
  const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length;
  const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0);
  const paidEarnings = allPayouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingEarnings = totalEarnings - paidEarnings;

  return {
    referrals,
    stats: {
      totalReferrals,
      convertedReferrals,
      pendingReferrals,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
    },
    payouts: allPayouts,
  };
}
