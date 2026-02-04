import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

/**
 * GET /api/v1/referrals/stats
 * Get referral statistics for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // Build where clause for referrals
    const referralWhere: Record<string, unknown> = {
      referralCode: {
        user: {
          organizationId: context.organizationId,
        },
      },
    };

    // Build where clause for referral codes
    const codeWhere: Record<string, unknown> = {
      user: {
        organizationId: context.organizationId,
      },
    };

    if (userId) {
      referralWhere.referralCode = {
        ...referralWhere.referralCode as object,
        userId,
      };
      codeWhere.userId = userId;
    }

    // Get overall statistics
    const [
      totalCodes,
      activeCodes,
      totalReferrals,
      referralsByStatus,
      totalEarnings,
      paidPayouts,
      pendingPayouts,
      topReferrers,
    ] = await Promise.all([
      // Total referral codes
      prismadb.referralCode.count({ where: codeWhere }),
      
      // Active referral codes
      prismadb.referralCode.count({
        where: { ...codeWhere, isActive: true },
      }),
      
      // Total referrals
      prismadb.referral.count({ where: referralWhere }),
      
      // Referrals by status
      prismadb.referral.groupBy({
        by: ["status"],
        where: referralWhere,
        _count: { id: true },
      }),
      
      // Total earnings
      prismadb.referral.aggregate({
        where: referralWhere,
        _sum: { totalEarnings: true },
      }),
      
      // Paid payouts
      prismadb.referralPayout.aggregate({
        where: {
          referral: referralWhere,
          status: "PAID",
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      
      // Pending payouts
      prismadb.referralPayout.aggregate({
        where: {
          referral: referralWhere,
          status: "PENDING",
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      
      // Top referrers (only if not filtering by userId)
      !userId
        ? prismadb.referralCode.findMany({
            where: codeWhere,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              referrals: {
                select: {
                  id: true,
                  totalEarnings: true,
                  status: true,
                },
              },
            },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    // Process referrals by status
    const statusCounts = {
      pending: 0,
      converted: 0,
      cancelled: 0,
    };
    
    referralsByStatus.forEach((item) => {
      const key = item.status.toLowerCase() as keyof typeof statusCounts;
      if (key in statusCounts) {
        statusCounts[key] = item._count.id;
      }
    });

    // Process top referrers
    const processedTopReferrers = topReferrers
      .map((code) => ({
        user: {
          id: code.user.id,
          name: code.user.name,
          email: code.user.email,
        },
        code: code.code,
        commissionRate: Number(code.commissionRate),
        totalReferrals: code.referrals.length,
        convertedReferrals: code.referrals.filter((r) => r.status === "CONVERTED").length,
        totalEarnings: code.referrals.reduce((sum, r) => sum + Number(r.totalEarnings), 0),
      }))
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 10);

    return createApiSuccessResponse({
      stats: {
        referralCodes: {
          total: totalCodes,
          active: activeCodes,
          inactive: totalCodes - activeCodes,
        },
        referrals: {
          total: totalReferrals,
          pending: statusCounts.pending,
          converted: statusCounts.converted,
          cancelled: statusCounts.cancelled,
          conversionRate: totalReferrals > 0 
            ? Math.round((statusCounts.converted / totalReferrals) * 100 * 10) / 10
            : 0,
        },
        earnings: {
          total: Number(totalEarnings._sum.totalEarnings || 0),
          paid: Number(paidPayouts._sum.amount || 0),
          pending: Number(pendingPayouts._sum.amount || 0),
        },
        payouts: {
          paidCount: paidPayouts._count.id,
          pendingCount: pendingPayouts._count.id,
        },
      },
      ...(topReferrers.length > 0 && { topReferrers: processedTopReferrers }),
    });
  },
  { requiredScopes: [API_SCOPES.REFERRALS_READ] }
);
