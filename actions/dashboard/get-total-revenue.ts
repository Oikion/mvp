import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Calculate total revenue from commissions on completed (sold) deals
 */
export const getTotalRevenue = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;

  const completedDeals = await prismadb.deal.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
    },
    select: {
      totalCommission: true,
    },
  });

  const totalRevenue = completedDeals.reduce((sum: number, deal: any) => {
    const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
    return sum + commission;
  }, 0);

  return totalRevenue;
};

/**
 * Calculate revenue trend comparing current month to previous month
 * Based on commissions from completed deals
 */
export const getRevenueTrend = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { value: 0, direction: "neutral" as const };

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentMonthDeals, previousMonthDeals] = await Promise.all([
    prismadb.deal.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        closedAt: {
          gte: currentMonthStart,
        },
      },
      select: {
        totalCommission: true,
      },
    }),
    prismadb.deal.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        closedAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      select: {
        totalCommission: true,
      },
    }),
  ]);

  const currentRevenue = currentMonthDeals.reduce(
    (sum: number, deal: any) => sum + (deal.totalCommission ? Number(deal.totalCommission) : 0),
    0
  );
  const previousRevenue = previousMonthDeals.reduce(
    (sum: number, deal: any) => sum + (deal.totalCommission ? Number(deal.totalCommission) : 0),
    0
  );

  if (previousRevenue === 0) {
    return currentRevenue > 0
      ? { value: 100, direction: "up" as const }
      : { value: 0, direction: "neutral" as const };
  }

  const percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange >= 0 ? ("up" as const) : ("down" as const),
  };
};



















