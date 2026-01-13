"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Gross Commission Income (GCI)
 * Total commissions earned - the primary income metric
 */
export async function getGrossCommissionIncome() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { total: 0, currency: "EUR" };

  const completedDeals = await prismadb.deal.aggregate({
    where: {
      organizationId,
      status: "COMPLETED",
    },
    _sum: { totalCommission: true },
  });

  return {
    total: Number(completedDeals._sum.totalCommission || 0),
    currency: "EUR",
  };
}

/**
 * GCI Trend (monthly)
 * Shows commission income over the last 12 months
 */
export async function getGCITrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const deals = await prismadb.deal.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      closedAt: { gte: twelveMonthsAgo },
    },
    select: {
      closedAt: true,
      totalCommission: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, number> = {};

  deals.forEach((deal) => {
    if (deal.closedAt) {
      const date = new Date(deal.closedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(deal.totalCommission || 0);
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      name: formatMonth(month),
      value,
    }));
}

/**
 * Number of Transactions Closed
 * Volume matters for building systems and reputation
 */
export async function getTransactionsClosed() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { count: 0, thisMonth: 0, thisYear: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [total, thisMonth, thisYear] = await Promise.all([
    prismadb.deal.count({
      where: {
        organizationId,
        status: "COMPLETED",
      },
    }),
    prismadb.deal.count({
      where: {
        organizationId,
        status: "COMPLETED",
        closedAt: { gte: startOfMonth },
      },
    }),
    prismadb.deal.count({
      where: {
        organizationId,
        status: "COMPLETED",
        closedAt: { gte: startOfYear },
      },
    }),
  ]);

  return {
    count: total,
    thisMonth,
    thisYear,
  };
}

/**
 * Transactions by Month
 */
export async function getTransactionsByMonth() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const deals = await prismadb.deal.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      closedAt: { gte: twelveMonthsAgo },
    },
    select: {
      closedAt: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, number> = {};

  deals.forEach((deal) => {
    if (deal.closedAt) {
      const date = new Date(deal.closedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      name: formatMonth(month),
      count,
    }));
}

/**
 * Average Sales Price
 * Higher prices mean more commission per transaction
 */
export async function getAverageSalesPrice() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { average: 0, median: 0, count: 0 };

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      salePrice: { not: null },
    },
    select: {
      salePrice: true,
    },
    orderBy: {
      salePrice: "asc",
    },
  });

  if (soldProperties.length === 0) {
    return { average: 0, median: 0, count: 0 };
  }

  const prices = soldProperties.map((p) => p.salePrice || 0);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const average = total / prices.length;

  // Calculate median
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 !== 0
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2;

  return {
    average: Math.round(average),
    median: Math.round(median),
    count: prices.length,
  };
}

/**
 * Average Sales Price Trend
 */
export async function getAverageSalesPriceTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      saleDate: { gte: twelveMonthsAgo },
      salePrice: { not: null },
    },
    select: {
      saleDate: true,
      salePrice: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { total: number; count: number }> = {};

  soldProperties.forEach((property) => {
    if (property.saleDate) {
      const date = new Date(property.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0 };
      }
      
      monthlyData[monthKey].total += property.salePrice || 0;
      monthlyData[monthKey].count++;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      average: data.count > 0 ? Math.round(data.total / data.count) : 0,
      count: data.count,
    }));
}

/**
 * Days on Market
 * How quickly listings sell compared to market average
 * Shows marketing effectiveness
 */
export async function getDaysOnMarket() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { average: 0, median: 0, count: 0 };

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      daysOnMarket: { not: null },
    },
    select: {
      daysOnMarket: true,
    },
    orderBy: {
      daysOnMarket: "asc",
    },
  });

  if (soldProperties.length === 0) {
    // If no daysOnMarket data, calculate from createdAt to saleDate
    const propertiesWithDates = await prismadb.properties.findMany({
      where: {
        organizationId,
        property_status: "SOLD",
        saleDate: { not: null },
      },
      select: {
        createdAt: true,
        saleDate: true,
      },
    });

    if (propertiesWithDates.length === 0) {
      return { average: 0, median: 0, count: 0 };
    }

    const days = propertiesWithDates.map((p) => {
      if (!p.saleDate) return 0;
      const diffTime = new Date(p.saleDate).getTime() - new Date(p.createdAt).getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }).filter(d => d > 0).sort((a, b) => a - b);

    if (days.length === 0) {
      return { average: 0, median: 0, count: 0 };
    }

    const total = days.reduce((sum, d) => sum + d, 0);
    const average = total / days.length;
    const mid = Math.floor(days.length / 2);
    const median = days.length % 2 !== 0 ? days[mid] : (days[mid - 1] + days[mid]) / 2;

    return {
      average: Math.round(average),
      median: Math.round(median),
      count: days.length,
    };
  }

  const days = soldProperties.map((p) => p.daysOnMarket || 0);
  const total = days.reduce((sum, d) => sum + d, 0);
  const average = total / days.length;

  const mid = Math.floor(days.length / 2);
  const median = days.length % 2 !== 0
    ? days[mid]
    : (days[mid - 1] + days[mid]) / 2;

  return {
    average: Math.round(average),
    median: Math.round(median),
    count: days.length,
  };
}

/**
 * Days on Market Trend
 */
export async function getDaysOnMarketTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      saleDate: { gte: twelveMonthsAgo },
    },
    select: {
      saleDate: true,
      createdAt: true,
      daysOnMarket: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { totalDays: number; count: number }> = {};

  soldProperties.forEach((property) => {
    if (property.saleDate) {
      const date = new Date(property.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalDays: 0, count: 0 };
      }
      
      let days = property.daysOnMarket;
      if (!days) {
        const diffTime = new Date(property.saleDate).getTime() - new Date(property.createdAt).getTime();
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      if (days > 0) {
        monthlyData[monthKey].totalDays += days;
        monthlyData[monthKey].count++;
      }
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      average: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
      count: data.count,
    }));
}

/**
 * Get all sales metrics in one call
 * Optimized for dashboard display
 */
export async function getAllSalesMetrics() {
  const [
    gci,
    gciTrend,
    transactions,
    transactionsTrend,
    avgSalesPrice,
    avgSalesPriceTrend,
    daysOnMarket,
    daysOnMarketTrend,
  ] = await Promise.all([
    getGrossCommissionIncome(),
    getGCITrend(),
    getTransactionsClosed(),
    getTransactionsByMonth(),
    getAverageSalesPrice(),
    getAverageSalesPriceTrend(),
    getDaysOnMarket(),
    getDaysOnMarketTrend(),
  ]);

  return {
    gci,
    gciTrend,
    transactions,
    transactionsTrend,
    avgSalesPrice,
    avgSalesPriceTrend,
    daysOnMarket,
    daysOnMarketTrend,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
