"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

async function getActiveListings(organizationId: string) {
  return prismadb.properties.count({
    where: { organizationId, property_status: "ACTIVE", draft_status: false },
  });
}

async function getPropertiesSold(organizationId: string) {
  return prismadb.properties.count({
    where: { organizationId, property_status: "SOLD" },
  });
}

async function getGrossCommissionIncome(organizationId: string) {
  const result = await prismadb.deal.aggregate({
    where: { organizationId, status: "COMPLETED" },
    _sum: { totalCommission: true },
  });
  return Number(result._sum.totalCommission ?? 0);
}

async function getAvgSalePrice(organizationId: string) {
  const result = await prismadb.properties.aggregate({
    where: { organizationId, property_status: "SOLD", salePrice: { not: null } },
    _avg: { salePrice: true },
  });
  return Math.round(Number(result._avg.salePrice ?? 0));
}

async function getAvgDaysOnMarket(organizationId: string) {
  const result = await prismadb.properties.aggregate({
    where: { organizationId, property_status: "SOLD", daysOnMarket: { not: null } },
    _avg: { daysOnMarket: true },
  });
  return Math.round(Number(result._avg.daysOnMarket ?? 0));
}

async function getTotalClients(organizationId: string) {
  return prismadb.clients.count({
    where: { organizationId, draft_status: false },
  });
}

async function getListToSaleRatio(organizationId: string) {
  const sold = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: "SOLD",
      listPrice: { not: null },
      salePrice: { not: null },
    },
    select: { listPrice: true, salePrice: true },
  });

  if (sold.length === 0) return 0;

  const totalRatio = sold.reduce((sum, p) => {
    return sum + (p.salePrice! / p.listPrice!) * 100;
  }, 0);

  return Math.round((totalRatio / sold.length) * 10) / 10;
}

async function getOpenDeals(organizationId: string) {
  return prismadb.deal.count({
    where: {
      organizationId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });
}

export async function getAllKPIMetrics() {
  const check = await canPerformAction("report:view");
  if (!check.allowed) {
    return {
      activeListings: 0,
      propertiesSold: 0,
      grossCommissionIncome: 0,
      avgSalePrice: 0,
      avgDaysOnMarket: 0,
      totalClients: 0,
      listToSaleRatio: 0,
      openDeals: 0,
    };
  }

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) {
    return {
      activeListings: 0,
      propertiesSold: 0,
      grossCommissionIncome: 0,
      avgSalePrice: 0,
      avgDaysOnMarket: 0,
      totalClients: 0,
      listToSaleRatio: 0,
      openDeals: 0,
    };
  }

  const [
    activeListings,
    propertiesSold,
    grossCommissionIncome,
    avgSalePrice,
    avgDaysOnMarket,
    totalClients,
    listToSaleRatio,
    openDeals,
  ] = await Promise.all([
    getActiveListings(organizationId),
    getPropertiesSold(organizationId),
    getGrossCommissionIncome(organizationId),
    getAvgSalePrice(organizationId),
    getAvgDaysOnMarket(organizationId),
    getTotalClients(organizationId),
    getListToSaleRatio(organizationId),
    getOpenDeals(organizationId),
  ]);

  return {
    activeListings,
    propertiesSold,
    grossCommissionIncome,
    avgSalePrice,
    avgDaysOnMarket,
    totalClients,
    listToSaleRatio,
    openDeals,
  };
}
