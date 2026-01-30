"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

/**
 * Lead Conversion Rate
 * Percentage of leads that become clients (CONVERTED status)
 * Top agents often hit 10-20%+
 */
export async function getLeadConversionRate() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) return { rate: 0, converted: 0, total: 0 };

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { rate: 0, converted: 0, total: 0 };

  const [totalLeads, convertedLeads] = await Promise.all([
    prismadb.clients.count({
      where: { organizationId },
    }),
    prismadb.clients.count({
      where: {
        organizationId,
        client_status: "CONVERTED",
      },
    }),
  ]);

  const rate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10, // Round to 1 decimal
    converted: convertedLeads,
    total: totalLeads,
  };
}

/**
 * Lead Conversion Rate Trend (monthly)
 * Shows conversion rate over the last 6 months
 */
export async function getLeadConversionTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const clients = await prismadb.clients.findMany({
    where: {
      organizationId,
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      createdAt: true,
      client_status: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { total: number; converted: number }> = {};

  clients.forEach((client) => {
    const date = new Date(client.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, converted: 0 };
    }
    
    monthlyData[monthKey].total++;
    if (client.client_status === "CONVERTED") {
      monthlyData[monthKey].converted++;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 1000) / 10 : 0,
      converted: data.converted,
      total: data.total,
    }));
}

/**
 * Cost Per Lead
 * Marketing spend divided by number of leads generated
 */
export async function getCostPerLead() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { costPerLead: 0, totalSpend: 0, totalLeads: 0 };

  const [marketingSpend, totalLeads] = await Promise.all([
    prismadb.marketingSpend.aggregate({
      where: { organizationId },
      _sum: { amount: true },
    }),
    prismadb.clients.count({
      where: { organizationId },
    }),
  ]);

  const totalSpend = Number(marketingSpend._sum.amount || 0);
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return {
    costPerLead: Math.round(costPerLead * 100) / 100,
    totalSpend,
    totalLeads,
  };
}

/**
 * Cost Per Lead by Source
 * Shows marketing spend and leads generated per source
 */
export async function getCostPerLeadBySource() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const [spendBySource, leadsBySource] = await Promise.all([
    prismadb.marketingSpend.groupBy({
      by: ["leadSource"],
      where: {
        organizationId,
        leadSource: { not: null },
      },
      _sum: { amount: true },
    }),
    prismadb.clients.groupBy({
      by: ["lead_source"],
      where: {
        organizationId,
        lead_source: { not: null },
      },
      _count: true,
    }),
  ]);

  const spendMap = new Map(
    spendBySource.map((s) => [s.leadSource, Number(s._sum.amount || 0)])
  );

  return leadsBySource.map((lead) => {
    const spend = spendMap.get(lead.lead_source) || 0;
    const cost = lead._count > 0 ? spend / lead._count : 0;
    return {
      source: lead.lead_source || "Unknown",
      leads: lead._count,
      spend,
      costPerLead: Math.round(cost * 100) / 100,
    };
  });
}

/**
 * Lead Sources Distribution
 * Which channels (referrals, online, sphere, open houses) produce the best clients
 */
export async function getLeadSourceDistribution() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sources = await prismadb.clients.groupBy({
    by: ["lead_source"],
    where: { organizationId },
    _count: true,
  });

  const total = sources.reduce((sum, s) => sum + s._count, 0);

  // Map all possible sources including null/undefined
  const allSources = ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL", "UNKNOWN"];
  const sourceMap = new Map(
    sources.map((s) => [s.lead_source || "UNKNOWN", s._count])
  );

  return allSources.map((source) => {
    const count = sourceMap.get(source) || 0;
    return {
      name: source,
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  }).filter((s) => s.value > 0); // Only return sources with data
}

/**
 * Lead Sources with Conversion Rates
 * Shows which sources have the best conversion rates
 */
export async function getLeadSourcesWithConversion() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sources = await prismadb.clients.groupBy({
    by: ["lead_source", "client_status"],
    where: { organizationId },
    _count: true,
  });

  // Group by source
  const sourceData: Record<string, { total: number; converted: number }> = {};

  sources.forEach((s) => {
    const source = s.lead_source || "UNKNOWN";
    if (!sourceData[source]) {
      sourceData[source] = { total: 0, converted: 0 };
    }
    sourceData[source].total += s._count;
    if (s.client_status === "CONVERTED") {
      sourceData[source].converted += s._count;
    }
  });

  return Object.entries(sourceData).map(([source, data]) => ({
    name: source,
    total: data.total,
    converted: data.converted,
    conversionRate: data.total > 0 
      ? Math.round((data.converted / data.total) * 1000) / 10 
      : 0,
  }));
}

/**
 * Pipeline Value
 * Total potential commission from active prospects and pending deals
 */
export async function getPipelineValue() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { total: 0, byStatus: [], dealCount: 0 };

  const pipelineDeals = await prismadb.deal.groupBy({
    by: ["status"],
    where: {
      organizationId,
      status: {
        in: ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS"],
      },
    },
    _sum: { totalCommission: true },
    _count: true,
  });

  const byStatus = pipelineDeals.map((d) => ({
    status: d.status,
    value: Number(d._sum.totalCommission || 0),
    count: d._count,
  }));

  const total = byStatus.reduce((sum, d) => sum + d.value, 0);
  const dealCount = byStatus.reduce((sum, d) => sum + d.count, 0);

  return {
    total,
    byStatus,
    dealCount,
  };
}

/**
 * Pipeline Value Trend (monthly)
 * Shows pipeline value over time
 */
export async function getPipelineTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deals = await prismadb.deal.findMany({
    where: {
      organizationId,
      createdAt: { gte: sixMonthsAgo },
      status: {
        in: ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
      },
    },
    select: {
      createdAt: true,
      totalCommission: true,
      status: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { pipeline: number; closed: number }> = {};

  deals.forEach((deal) => {
    const date = new Date(deal.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { pipeline: 0, closed: 0 };
    }
    
    const value = Number(deal.totalCommission || 0);
    if (deal.status === "COMPLETED") {
      monthlyData[monthKey].closed += value;
    } else {
      monthlyData[monthKey].pipeline += value;
    }
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      name: formatMonth(month),
      pipeline: data.pipeline,
      closed: data.closed,
    }));
}

/**
 * Get all lead metrics in one call
 * Optimized for dashboard display
 */
export async function getAllLeadMetrics() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) return {
    conversionRate: { rate: 0, converted: 0, total: 0 },
    conversionTrend: [],
    costPerLead: { costPerLead: 0, totalSpend: 0, totalLeads: 0 },
    leadSources: [],
    leadSourcesWithConversion: [],
    pipelineValue: { total: 0, byStatus: [], dealCount: 0 },
    pipelineTrend: [],
  };

  const [
    conversionRate,
    conversionTrend,
    costPerLead,
    leadSources,
    leadSourcesWithConversion,
    pipelineValue,
    pipelineTrend,
  ] = await Promise.all([
    getLeadConversionRate(),
    getLeadConversionTrend(),
    getCostPerLead(),
    getLeadSourceDistribution(),
    getLeadSourcesWithConversion(),
    getPipelineValue(),
    getPipelineTrend(),
  ]);

  return {
    conversionRate,
    conversionTrend,
    costPerLead,
    leadSources,
    leadSourcesWithConversion,
    pipelineValue,
    pipelineTrend,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
