"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

/**
 * List-to-Sale Price Ratio
 * How close to asking price properties sell
 * Often 98-102%+ for top agents
 */
export async function getListToSaleRatio() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) return { ratio: 0, count: 0, aboveAsking: 0, belowAsking: 0 };

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { ratio: 0, count: 0, aboveAsking: 0, belowAsking: 0 };

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      listPrice: { not: null },
      salePrice: { not: null },
    },
    select: {
      listPrice: true,
      salePrice: true,
    },
  });

  if (soldProperties.length === 0) {
    return { ratio: 0, count: 0, aboveAsking: 0, belowAsking: 0 };
  }

  let totalRatio = 0;
  let aboveAsking = 0;
  let belowAsking = 0;

  soldProperties.forEach((p) => {
    const ratio = (p.salePrice! / p.listPrice!) * 100;
    totalRatio += ratio;
    if (p.salePrice! >= p.listPrice!) {
      aboveAsking++;
    } else {
      belowAsking++;
    }
  });

  return {
    ratio: Math.round((totalRatio / soldProperties.length) * 10) / 10,
    count: soldProperties.length,
    aboveAsking,
    belowAsking,
  };
}

/**
 * List-to-Sale Ratio Distribution
 * Shows distribution of sale prices vs list prices
 */
export async function getListToSaleDistribution() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const soldProperties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      listPrice: { not: null },
      salePrice: { not: null },
    },
    select: {
      listPrice: true,
      salePrice: true,
    },
  });

  // Group into ratio buckets
  const buckets: Record<string, number> = {
    "< 95%": 0,
    "95-98%": 0,
    "98-100%": 0,
    "100-102%": 0,
    "> 102%": 0,
  };

  soldProperties.forEach((p) => {
    const ratio = (p.salePrice! / p.listPrice!) * 100;
    if (ratio < 95) {
      buckets["< 95%"]++;
    } else if (ratio < 98) {
      buckets["95-98%"]++;
    } else if (ratio < 100) {
      buckets["98-100%"]++;
    } else if (ratio < 102) {
      buckets["100-102%"]++;
    } else {
      buckets["> 102%"]++;
    }
  });

  return Object.entries(buckets).map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Listing Inventory
 * Number of active listings, creating recurring marketing opportunities
 */
export async function getListingInventory() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { active: 0, pending: 0, total: 0, byType: [] };

  const properties = await prismadb.properties.groupBy({
    by: ["property_status"],
    where: { organizationId },
    _count: true,
  });

  const statusMap = new Map(
    properties.map((p) => [p.property_status, p._count])
  );

  const active = statusMap.get("ACTIVE") || 0;
  const pending = statusMap.get("PENDING") || 0;
  const total = properties.reduce((sum, p) => sum + p._count, 0);

  const byStatus = properties.map((p) => ({
    status: p.property_status || "UNKNOWN",
    count: p._count,
  }));

  return {
    active,
    pending,
    total,
    byStatus,
  };
}

/**
 * Listing Inventory by Type
 */
export async function getListingInventoryByType() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const properties = await prismadb.properties.groupBy({
    by: ["property_type"],
    where: {
      organizationId,
      property_status: "ACTIVE",
    },
    _count: true,
  });

  return properties.map((p) => ({
    name: p.property_type || "OTHER",
    value: p._count,
  }));
}

/**
 * Listing Inventory Trend
 */
export async function getListingInventoryTrend() {
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
    },
  });

  // Group by month
  const monthlyData: Record<string, { new: number; sold: number }> = {};

  properties.forEach((property) => {
    const date = new Date(property.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { new: 0, sold: 0 };
    }
    
    monthlyData[monthKey].new++;
    if (property.property_status === "SOLD") {
      monthlyData[monthKey].sold++;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      newListings: data.new,
      sold: data.sold,
    }));
}

/**
 * Seller vs Buyer Transaction Ratio
 * Many top agents focus heavily on listings for leverage
 */
export async function getSellerBuyerRatio() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { sellerRatio: 0, sellerCount: 0, buyerCount: 0, dualCount: 0, total: 0 };

  const deals = await prismadb.deal.groupBy({
    by: ["dealType"],
    where: {
      organizationId,
      status: "COMPLETED",
    },
    _count: true,
    _sum: { totalCommission: true },
  });

  const typeMap = new Map(
    deals.map((d) => [d.dealType, { count: d._count, commission: Number(d._sum.totalCommission || 0) }])
  );

  const sellerData = typeMap.get("SELLER") || { count: 0, commission: 0 };
  const buyerData = typeMap.get("BUYER") || { count: 0, commission: 0 };
  const dualData = typeMap.get("DUAL") || { count: 0, commission: 0 };

  const total = sellerData.count + buyerData.count + dualData.count;
  const sellerRatio = total > 0 ? (sellerData.count / total) * 100 : 0;

  return {
    sellerRatio: Math.round(sellerRatio * 10) / 10,
    sellerCount: sellerData.count,
    sellerCommission: sellerData.commission,
    buyerCount: buyerData.count,
    buyerCommission: buyerData.commission,
    dualCount: dualData.count,
    dualCommission: dualData.commission,
    total,
  };
}

/**
 * Transaction Type Distribution
 */
export async function getTransactionTypeDistribution() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const deals = await prismadb.deal.groupBy({
    by: ["dealType"],
    where: {
      organizationId,
      status: "COMPLETED",
    },
    _count: true,
  });

  const labels: Record<string, string> = {
    SELLER: "Seller (Listing)",
    BUYER: "Buyer",
    DUAL: "Dual Agency",
  };

  return deals.map((d) => ({
    name: labels[d.dealType || ""] || d.dealType || "Unknown",
    value: d._count,
  })).filter((d) => d.value > 0);
}

/**
 * Average Time to Contract
 * How quickly they get offers on listings
 */
export async function getTimeToContract() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { average: 0, median: 0, count: 0 };

  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      contractDate: { not: null },
    },
    select: {
      createdAt: true,
      contractDate: true,
    },
    orderBy: {
      contractDate: "asc",
    },
  });

  if (properties.length === 0) {
    return { average: 0, median: 0, count: 0 };
  }

  const days = properties.map((p) => {
    const diffTime = new Date(p.contractDate!).getTime() - new Date(p.createdAt).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }).filter((d) => d > 0).sort((a, b) => a - b);

  if (days.length === 0) {
    return { average: 0, median: 0, count: 0 };
  }

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
 * Time to Contract Trend
 */
export async function getTimeToContractTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      contractDate: {
        not: null,
        gte: twelveMonthsAgo,
      },
    },
    select: {
      createdAt: true,
      contractDate: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { totalDays: number; count: number }> = {};

  properties.forEach((property) => {
    if (property.contractDate) {
      const date = new Date(property.contractDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalDays: 0, count: 0 };
      }
      
      const diffTime = new Date(property.contractDate).getTime() - new Date(property.createdAt).getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
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
 * Get all listing metrics in one call
 * Optimized for dashboard display
 */
export async function getAllListingMetrics() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) return {
    listToSaleRatio: { ratio: 0, count: 0, aboveAsking: 0, belowAsking: 0 },
    listToSaleDistribution: [],
    inventory: { active: 0, pending: 0, total: 0, byStatus: [] },
    inventoryByType: [],
    inventoryTrend: [],
    sellerBuyerRatio: { sellerRatio: 0, sellerCount: 0, buyerCount: 0, dualCount: 0, total: 0 },
    transactionTypes: [],
    timeToContract: { average: 0, median: 0, count: 0 },
    timeToContractTrend: [],
  };

  const [
    listToSaleRatio,
    listToSaleDistribution,
    inventory,
    inventoryByType,
    inventoryTrend,
    sellerBuyerRatio,
    transactionTypes,
    timeToContract,
    timeToContractTrend,
  ] = await Promise.all([
    getListToSaleRatio(),
    getListToSaleDistribution(),
    getListingInventory(),
    getListingInventoryByType(),
    getListingInventoryTrend(),
    getSellerBuyerRatio(),
    getTransactionTypeDistribution(),
    getTimeToContract(),
    getTimeToContractTrend(),
  ]);

  return {
    listToSaleRatio,
    listToSaleDistribution,
    inventory,
    inventoryByType,
    inventoryTrend,
    sellerBuyerRatio,
    transactionTypes,
    timeToContract,
    timeToContractTrend,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
