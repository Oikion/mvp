import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Calculate trend comparing current month to previous month for contacts
 */
export const getContactsTrend = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { value: 0, direction: "neutral" as const };

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentCount, previousCount] = await Promise.all([
    prismadb.client_Contacts.count({
      where: {
        assigned_client: {
          organizationId,
        },
        created_on: {
          gte: currentMonthStart,
        },
      },
    }),
    prismadb.client_Contacts.count({
      where: {
        assigned_client: {
          organizationId,
        },
        created_on: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    }),
  ]);

  if (previousCount === 0) {
    return currentCount > 0
      ? { value: 100, direction: "up" as const }
      : { value: 0, direction: "neutral" as const };
  }

  const percentageChange = ((currentCount - previousCount) / previousCount) * 100;
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange >= 0 ? ("up" as const) : ("down" as const),
  };
};

