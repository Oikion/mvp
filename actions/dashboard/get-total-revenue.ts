import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Calculate total revenue from all active properties
 */
export const getTotalRevenue = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;

  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return 0;
  }

  const properties = await delegate.findMany({
    where: {
      organizationId,
      property_status: {
        in: ["ACTIVE", "PENDING", "SOLD"],
      },
    },
    select: {
      price: true,
    },
  });

  const totalRevenue = properties.reduce((sum: number, property: any) => {
    return sum + (property.price || 0);
  }, 0);

  return totalRevenue;
};

/**
 * Calculate revenue trend comparing current month to previous month
 */
export const getRevenueTrend = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { value: 0, direction: "neutral" as const };

  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return { value: 0, direction: "neutral" as const };
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentMonthProperties, previousMonthProperties] = await Promise.all([
    delegate.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: currentMonthStart,
        },
        property_status: {
          in: ["ACTIVE", "PENDING", "SOLD"],
        },
      },
      select: {
        price: true,
      },
    }),
    delegate.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
        property_status: {
          in: ["ACTIVE", "PENDING", "SOLD"],
        },
      },
      select: {
        price: true,
      },
    }),
  ]);

  const currentRevenue = currentMonthProperties.reduce(
    (sum: number, p: any) => sum + (p.price || 0),
    0
  );
  const previousRevenue = previousMonthProperties.reduce(
    (sum: number, p: any) => sum + (p.price || 0),
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



















