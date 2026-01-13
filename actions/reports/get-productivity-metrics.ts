"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Income Per Hour Worked
 * GCI divided by hours invested
 */
export async function getIncomePerHour() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { incomePerHour: 0, totalIncome: 0, totalHours: 0 };

  const [gci, totalHours] = await Promise.all([
    prismadb.deal.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
      },
      _sum: { totalCommission: true },
    }),
    prismadb.agentHours.aggregate({
      where: { organizationId },
      _sum: { hoursWorked: true },
    }),
  ]);

  const totalIncome = Number(gci._sum.totalCommission || 0);
  const hours = Number(totalHours._sum.hoursWorked || 0);
  const incomePerHour = hours > 0 ? totalIncome / hours : 0;

  return {
    incomePerHour: Math.round(incomePerHour * 100) / 100,
    totalIncome,
    totalHours: hours,
  };
}

/**
 * Income Per Hour Trend
 */
export async function getIncomePerHourTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [deals, hours] = await Promise.all([
    prismadb.deal.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        closedAt: { gte: sixMonthsAgo },
      },
      select: {
        closedAt: true,
        totalCommission: true,
      },
    }),
    prismadb.agentHours.findMany({
      where: {
        organizationId,
        date: { gte: sixMonthsAgo },
      },
      select: {
        date: true,
        hoursWorked: true,
      },
    }),
  ]);

  // Group by month
  const monthlyIncome: Record<string, number> = {};
  const monthlyHours: Record<string, number> = {};

  deals.forEach((deal) => {
    if (deal.closedAt) {
      const date = new Date(deal.closedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + Number(deal.totalCommission || 0);
    }
  });

  hours.forEach((h) => {
    const date = new Date(h.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + Number(h.hoursWorked || 0);
  });

  // Combine data
  const allMonths = new Set([...Object.keys(monthlyIncome), ...Object.keys(monthlyHours)]);
  
  return Array.from(allMonths)
    .sort()
    .map((month) => {
      const income = monthlyIncome[month] || 0;
      const hoursWorked = monthlyHours[month] || 0;
      return {
        month,
        name: formatMonth(month),
        income,
        hours: hoursWorked,
        incomePerHour: hoursWorked > 0 ? Math.round((income / hoursWorked) * 100) / 100 : 0,
      };
    });
}

/**
 * Transactions Per Showing
 * Efficiency of buyer appointments
 */
export async function getTransactionsPerShowing() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { ratio: 0, transactions: 0, showings: 0 };

  const [transactions, showings] = await Promise.all([
    prismadb.deal.count({
      where: {
        organizationId,
        status: "COMPLETED",
      },
    }),
    prismadb.propertyShowing.count({
      where: { organizationId },
    }),
  ]);

  const ratio = showings > 0 ? transactions / showings : 0;

  return {
    ratio: Math.round(ratio * 1000) / 1000, // 3 decimal places for small ratios
    transactions,
    showings,
    showingsPerTransaction: transactions > 0 ? Math.round(showings / transactions) : 0,
  };
}

/**
 * Showings by Result
 */
export async function getShowingsByResult() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const showings = await prismadb.propertyShowing.groupBy({
    by: ["result"],
    where: { organizationId },
    _count: true,
  });

  const labels: Record<string, string> = {
    NO_SHOW: "No Show",
    NO_INTEREST: "No Interest",
    INTERESTED: "Interested",
    VERY_INTERESTED: "Very Interested",
    OFFER_MADE: "Offer Made",
    CONTRACT_SIGNED: "Contract Signed",
  };

  return showings.map((s) => ({
    name: labels[s.result] || s.result,
    value: s._count,
  }));
}

/**
 * Showings Trend
 */
export async function getShowingsTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const showings = await prismadb.propertyShowing.findMany({
    where: {
      organizationId,
      showingDate: { gte: sixMonthsAgo },
    },
    select: {
      showingDate: true,
      result: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { total: number; successful: number }> = {};

  showings.forEach((showing) => {
    const date = new Date(showing.showingDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, successful: 0 };
    }
    
    monthlyData[monthKey].total++;
    if (["OFFER_MADE", "CONTRACT_SIGNED", "VERY_INTERESTED"].includes(showing.result)) {
      monthlyData[monthKey].successful++;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      total: data.total,
      successful: data.successful,
      successRate: data.total > 0 ? Math.round((data.successful / data.total) * 1000) / 10 : 0,
    }));
}

/**
 * Marketing ROI
 * Return on each marketing dollar spent
 * (GCI from marketing leads - Marketing spend) / Marketing spend * 100
 */
export async function getMarketingROI() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { roi: 0, revenue: 0, spend: 0 };

  const [marketingSpend, marketingDeals] = await Promise.all([
    prismadb.marketingSpend.aggregate({
      where: { organizationId },
      _sum: { amount: true },
    }),
    // Get GCI from deals linked to marketing spend
    prismadb.deal.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
        marketingSpendId: { not: null },
      },
      _sum: { totalCommission: true },
    }),
  ]);

  const spend = Number(marketingSpend._sum.amount || 0);
  const revenue = Number(marketingDeals._sum.totalCommission || 0);
  const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

  return {
    roi: Math.round(roi * 10) / 10,
    revenue,
    spend,
    netReturn: revenue - spend,
  };
}

/**
 * Marketing ROI by Category
 */
export async function getMarketingROIByCategory() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const [spendByCategory, dealsWithMarketing] = await Promise.all([
    prismadb.marketingSpend.groupBy({
      by: ["category"],
      where: { organizationId },
      _sum: { amount: true },
    }),
    prismadb.deal.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        marketingSpendId: { not: null },
      },
      select: {
        totalCommission: true,
        MarketingSpend: {
          select: {
            category: true,
          },
        },
      },
    }),
  ]);

  // Group revenue by category
  const revenueByCategory: Record<string, number> = {};
  dealsWithMarketing.forEach((deal) => {
    const category = deal.MarketingSpend?.category || "OTHER";
    revenueByCategory[category] = (revenueByCategory[category] || 0) + Number(deal.totalCommission || 0);
  });

  return spendByCategory.map((s) => {
    const spend = Number(s._sum.amount || 0);
    const revenue = revenueByCategory[s.category] || 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
    
    return {
      category: s.category,
      spend,
      revenue,
      roi: Math.round(roi * 10) / 10,
    };
  });
}

/**
 * Administrative Time vs Income-Producing Activities
 * Top agents minimize the former
 */
export async function getTimeAllocation() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { adminPercentage: 0, incomeProducingPercentage: 0, totalHours: 0, byActivity: [] };

  const hours = await prismadb.agentHours.groupBy({
    by: ["activityType"],
    where: { organizationId },
    _sum: { hoursWorked: true },
  });

  const totalHours = hours.reduce((sum, h) => sum + Number(h._sum.hoursWorked || 0), 0);
  
  // Define income-producing vs admin activities
  const incomeProducingTypes = [
    "INCOME_PRODUCING",
    "SHOWINGS",
    "PROSPECTING",
    "CLIENT_MEETINGS",
    "NEGOTIATIONS",
  ];

  const adminTypes = [
    "ADMINISTRATIVE",
    "PAPERWORK",
  ];

  let incomeProducingHours = 0;
  let adminHours = 0;

  const byActivity = hours.map((h) => {
    const hoursWorked = Number(h._sum.hoursWorked || 0);
    
    if (incomeProducingTypes.includes(h.activityType)) {
      incomeProducingHours += hoursWorked;
    } else if (adminTypes.includes(h.activityType)) {
      adminHours += hoursWorked;
    }

    return {
      activity: h.activityType,
      hours: hoursWorked,
      percentage: totalHours > 0 ? Math.round((hoursWorked / totalHours) * 1000) / 10 : 0,
    };
  });

  return {
    adminPercentage: totalHours > 0 ? Math.round((adminHours / totalHours) * 1000) / 10 : 0,
    incomeProducingPercentage: totalHours > 0 ? Math.round((incomeProducingHours / totalHours) * 1000) / 10 : 0,
    adminHours,
    incomeProducingHours,
    totalHours,
    byActivity,
  };
}

/**
 * Time Allocation Trend
 */
export async function getTimeAllocationTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const hours = await prismadb.agentHours.findMany({
    where: {
      organizationId,
      date: { gte: sixMonthsAgo },
    },
    select: {
      date: true,
      hoursWorked: true,
      activityType: true,
    },
  });

  const incomeProducingTypes = [
    "INCOME_PRODUCING",
    "SHOWINGS",
    "PROSPECTING",
    "CLIENT_MEETINGS",
    "NEGOTIATIONS",
  ];

  // Group by month
  const monthlyData: Record<string, { admin: number; incomeProducing: number; other: number }> = {};

  hours.forEach((h) => {
    const date = new Date(h.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { admin: 0, incomeProducing: 0, other: 0 };
    }
    
    const hoursWorked = Number(h.hoursWorked || 0);
    
    if (h.activityType === "ADMINISTRATIVE" || h.activityType === "PAPERWORK") {
      monthlyData[monthKey].admin += hoursWorked;
    } else if (incomeProducingTypes.includes(h.activityType)) {
      monthlyData[monthKey].incomeProducing += hoursWorked;
    } else {
      monthlyData[monthKey].other += hoursWorked;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      admin: data.admin,
      incomeProducing: data.incomeProducing,
      other: data.other,
    }));
}

/**
 * Get all productivity metrics in one call
 * Optimized for dashboard display
 */
export async function getAllProductivityMetrics() {
  const [
    incomePerHour,
    incomePerHourTrend,
    transactionsPerShowing,
    showingsByResult,
    showingsTrend,
    marketingROI,
    marketingROIByCategory,
    timeAllocation,
    timeAllocationTrend,
  ] = await Promise.all([
    getIncomePerHour(),
    getIncomePerHourTrend(),
    getTransactionsPerShowing(),
    getShowingsByResult(),
    getShowingsTrend(),
    getMarketingROI(),
    getMarketingROIByCategory(),
    getTimeAllocation(),
    getTimeAllocationTrend(),
  ]);

  return {
    incomePerHour,
    incomePerHourTrend,
    transactionsPerShowing,
    showingsByResult,
    showingsTrend,
    marketingROI,
    marketingROIByCategory,
    timeAllocation,
    timeAllocationTrend,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
