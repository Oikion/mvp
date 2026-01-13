"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Absorption Rate
 * How quickly inventory is selling in their market/price range
 * Calculated as: (Sold listings / Active listings) per month
 */
export async function getAbsorptionRate() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { rate: 0, activeListings: 0, soldLastMonth: 0, monthsOfInventory: 0 };

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [activeListings, soldLastMonth] = await Promise.all([
    prismadb.properties.count({
      where: {
        organizationId,
        property_status: "ACTIVE",
      },
    }),
    prismadb.properties.count({
      where: {
        organizationId,
        property_status: "SOLD",
        saleDate: { gte: oneMonthAgo },
      },
    }),
  ]);

  const rate = activeListings > 0 ? (soldLastMonth / activeListings) * 100 : 0;
  const monthsOfInventory = soldLastMonth > 0 ? activeListings / soldLastMonth : activeListings > 0 ? 999 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    activeListings,
    soldLastMonth,
    monthsOfInventory: Math.round(monthsOfInventory * 10) / 10,
  };
}

/**
 * Absorption Rate by Area
 */
export async function getAbsorptionRateByArea() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [activeByArea, soldByArea] = await Promise.all([
    prismadb.properties.groupBy({
      by: ["area"],
      where: {
        organizationId,
        property_status: "ACTIVE",
        area: { not: null },
      },
      _count: true,
    }),
    prismadb.properties.groupBy({
      by: ["area"],
      where: {
        organizationId,
        property_status: "SOLD",
        saleDate: { gte: oneMonthAgo },
        area: { not: null },
      },
      _count: true,
    }),
  ]);

  const soldMap = new Map(soldByArea.map((s) => [s.area, s._count]));

  return activeByArea.map((a) => {
    const active = a._count;
    const sold = soldMap.get(a.area) || 0;
    const rate = active > 0 ? (sold / active) * 100 : 0;

    return {
      area: a.area || "Unknown",
      activeListings: active,
      soldLastMonth: sold,
      absorptionRate: Math.round(rate * 10) / 10,
    };
  });
}

/**
 * Absorption Rate Trend
 */
export async function getAbsorptionRateTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      OR: [
        { property_status: "ACTIVE" },
        { 
          property_status: "SOLD",
          saleDate: { gte: sixMonthsAgo },
        },
      ],
    },
    select: {
      property_status: true,
      createdAt: true,
      saleDate: true,
    },
  });

  // Group by month (this is a simplified calculation)
  const monthlyData: Record<string, { sold: number; active: number }> = {};

  properties.forEach((p) => {
    if (p.property_status === "SOLD" && p.saleDate) {
      const date = new Date(p.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { sold: 0, active: 0 };
      }
      monthlyData[monthKey].sold++;
    }
  });

  // For active count, we use current active listings as a baseline
  const currentActive = properties.filter((p) => p.property_status === "ACTIVE").length;

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      sold: data.sold,
      // Use current active as estimate (simplified)
      absorptionRate: currentActive > 0 ? Math.round((data.sold / currentActive) * 1000) / 10 : 0,
    }));
}

/**
 * Inventory Levels
 * Number of active listings, affecting strategy (buyer's vs. seller's market)
 */
export async function getInventoryLevels() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { total: 0, byStatus: [], byType: [], byArea: [] };

  const [byStatus, byType, byArea] = await Promise.all([
    prismadb.properties.groupBy({
      by: ["property_status"],
      where: { organizationId },
      _count: true,
    }),
    prismadb.properties.groupBy({
      by: ["property_type"],
      where: {
        organizationId,
        property_status: "ACTIVE",
      },
      _count: true,
    }),
    prismadb.properties.groupBy({
      by: ["area"],
      where: {
        organizationId,
        property_status: "ACTIVE",
        area: { not: null },
      },
      _count: true,
      orderBy: { _count: { area: "desc" } },
      take: 10,
    }),
  ]);

  const total = byStatus.reduce((sum, s) => sum + s._count, 0);

  return {
    total,
    byStatus: byStatus.map((s) => ({
      name: s.property_status || "Unknown",
      value: s._count,
    })),
    byType: byType.map((t) => ({
      name: t.property_type || "Other",
      value: t._count,
    })),
    byArea: byArea.map((a) => ({
      name: a.area || "Unknown",
      value: a._count,
    })),
  };
}

/**
 * Inventory Trend
 */
export async function getInventoryTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      createdAt: true,
      property_status: true,
      saleDate: true,
    },
  });

  // Track new listings and sales by month
  const monthlyData: Record<string, { new: number; sold: number }> = {};

  properties.forEach((p) => {
    const createdMonth = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[createdMonth]) {
      monthlyData[createdMonth] = { new: 0, sold: 0 };
    }
    monthlyData[createdMonth].new++;

    if (p.property_status === "SOLD" && p.saleDate) {
      const soldMonth = `${p.saleDate.getFullYear()}-${String(p.saleDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[soldMonth]) {
        monthlyData[soldMonth] = { new: 0, sold: 0 };
      }
      monthlyData[soldMonth].sold++;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      newListings: data.new,
      sold: data.sold,
      netChange: data.new - data.sold,
    }));
}

/**
 * Median Sale Price Trends
 * Market direction in their area
 */
export async function getMedianSalePriceTrend() {
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

  // Group by month and calculate median
  const monthlyPrices: Record<string, number[]> = {};

  soldProperties.forEach((p) => {
    if (p.saleDate && p.salePrice) {
      const date = new Date(p.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyPrices[monthKey]) {
        monthlyPrices[monthKey] = [];
      }
      monthlyPrices[monthKey].push(p.salePrice);
    }
  });

  return Object.entries(monthlyPrices)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, prices]) => {
      prices.sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 !== 0
        ? prices[mid]
        : (prices[mid - 1] + prices[mid]) / 2;

      return {
        month,
        name: formatMonth(month),
        median: Math.round(median),
        average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
        count: prices.length,
      };
    });
}

/**
 * Current Median Sale Price
 */
export async function getCurrentMedianSalePrice() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { median: 0, average: 0, count: 0 };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      saleDate: { gte: threeMonthsAgo },
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
    return { median: 0, average: 0, count: 0 };
  }

  const prices = soldProperties.map((p) => p.salePrice!);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 !== 0
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2;
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  return {
    median: Math.round(median),
    average: Math.round(average),
    count: prices.length,
  };
}

/**
 * Comparative Market Analysis (CMA) Accuracy
 * How close pricing estimates are to actual sales
 */
export async function getCMAAccuracy() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { averageAccuracy: 0, count: 0, overEstimated: 0, underEstimated: 0 };

  const propertiesWithEstimates = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      estimatedPrice: { not: null },
      salePrice: { not: null },
    },
    select: {
      estimatedPrice: true,
      salePrice: true,
    },
  });

  if (propertiesWithEstimates.length === 0) {
    return { averageAccuracy: 0, count: 0, overEstimated: 0, underEstimated: 0 };
  }

  let totalAccuracy = 0;
  let overEstimated = 0;
  let underEstimated = 0;

  propertiesWithEstimates.forEach((p) => {
    const accuracy = (p.salePrice! / p.estimatedPrice!) * 100;
    totalAccuracy += accuracy;
    
    if (p.estimatedPrice! > p.salePrice!) {
      overEstimated++;
    } else if (p.estimatedPrice! < p.salePrice!) {
      underEstimated++;
    }
  });

  return {
    averageAccuracy: Math.round((totalAccuracy / propertiesWithEstimates.length) * 10) / 10,
    count: propertiesWithEstimates.length,
    overEstimated,
    underEstimated,
    onTarget: propertiesWithEstimates.length - overEstimated - underEstimated,
  };
}

/**
 * CMA Accuracy Distribution
 */
export async function getCMAAccuracyDistribution() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const propertiesWithEstimates = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      estimatedPrice: { not: null },
      salePrice: { not: null },
    },
    select: {
      estimatedPrice: true,
      salePrice: true,
    },
  });

  // Group into accuracy buckets
  const buckets: Record<string, number> = {
    "< 90%": 0,
    "90-95%": 0,
    "95-98%": 0,
    "98-102%": 0,
    "102-105%": 0,
    "> 105%": 0,
  };

  propertiesWithEstimates.forEach((p) => {
    const accuracy = (p.salePrice! / p.estimatedPrice!) * 100;
    
    if (accuracy < 90) {
      buckets["< 90%"]++;
    } else if (accuracy < 95) {
      buckets["90-95%"]++;
    } else if (accuracy < 98) {
      buckets["95-98%"]++;
    } else if (accuracy < 102) {
      buckets["98-102%"]++;
    } else if (accuracy < 105) {
      buckets["102-105%"]++;
    } else {
      buckets["> 105%"]++;
    }
  });

  return Object.entries(buckets).map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Market Data Summary (from MarketData model)
 */
export async function getMarketDataSummary() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const latestData = await prismadb.marketData.findFirst({
    where: { organizationId },
    orderBy: { date: "desc" },
  });

  if (!latestData) {
    return null;
  }

  return {
    date: latestData.date,
    area: latestData.area,
    activeListings: latestData.activeListings,
    soldListings: latestData.soldListings,
    medianSalePrice: Number(latestData.medianSalePrice || 0),
    averageDaysOnMarket: Number(latestData.averageDaysOnMarket || 0),
    absorptionRate: Number(latestData.absorptionRate || 0),
  };
}

/**
 * Get all market metrics in one call
 * Optimized for dashboard display
 */
export async function getAllMarketMetrics() {
  const [
    absorptionRate,
    absorptionByArea,
    absorptionTrend,
    inventoryLevels,
    inventoryTrend,
    medianPriceTrend,
    currentMedianPrice,
    cmaAccuracy,
    cmaDistribution,
    marketDataSummary,
  ] = await Promise.all([
    getAbsorptionRate(),
    getAbsorptionRateByArea(),
    getAbsorptionRateTrend(),
    getInventoryLevels(),
    getInventoryTrend(),
    getMedianSalePriceTrend(),
    getCurrentMedianSalePrice(),
    getCMAAccuracy(),
    getCMAAccuracyDistribution(),
    getMarketDataSummary(),
  ]);

  return {
    absorptionRate,
    absorptionByArea,
    absorptionTrend,
    inventoryLevels,
    inventoryTrend,
    medianPriceTrend,
    currentMedianPrice,
    cmaAccuracy,
    cmaDistribution,
    marketDataSummary,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
