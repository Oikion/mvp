"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions";

/**
 * Client Lifetime Value
 * Total commission from a client over their entire relationship
 */
export async function getClientLifetimeValue() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) return { average: 0, total: 0, clientCount: 0 };

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { average: 0, total: 0, clientCount: 0 };

  // Get all completed deals with their client data
  const deals = await prismadb.deal.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
    },
    select: {
      clientId: true,
      totalCommission: true,
    },
  });

  if (deals.length === 0) {
    return { average: 0, total: 0, clientCount: 0 };
  }

  // Group by client
  const clientValues: Record<string, number> = {};
  deals.forEach((deal) => {
    if (!clientValues[deal.clientId]) {
      clientValues[deal.clientId] = 0;
    }
    clientValues[deal.clientId] += Number(deal.totalCommission || 0);
  });

  const clientCount = Object.keys(clientValues).length;
  const totalValue = Object.values(clientValues).reduce((sum, v) => sum + v, 0);
  const average = clientCount > 0 ? totalValue / clientCount : 0;

  return {
    average: Math.round(average * 100) / 100,
    total: totalValue,
    clientCount,
  };
}

/**
 * Top Clients by Lifetime Value
 */
export async function getTopClientsByValue(limit = 10) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const deals = await prismadb.deal.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
    },
    select: {
      clientId: true,
      totalCommission: true,
      Clients: {
        select: {
          client_name: true,
          full_name: true,
        },
      },
    },
  });

  // Group by client
  const clientData: Record<string, { name: string; value: number; deals: number }> = {};
  deals.forEach((deal) => {
    const clientId = deal.clientId;
    if (!clientData[clientId]) {
      clientData[clientId] = {
        name: deal.Clients?.full_name || deal.Clients?.client_name || "Unknown",
        value: 0,
        deals: 0,
      };
    }
    clientData[clientId].value += Number(deal.totalCommission || 0);
    clientData[clientId].deals++;
  });

  return Object.entries(clientData)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Repeat Client Rate
 * Percentage of past clients who return for future transactions
 */
export async function getRepeatClientRate() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { rate: 0, repeatClients: 0, totalClients: 0 };

  const deals = await prismadb.deal.groupBy({
    by: ["clientId"],
    where: {
      organizationId,
      status: "COMPLETED",
    },
    _count: true,
  });

  const totalClients = deals.length;
  const repeatClients = deals.filter((d) => d._count > 1).length;
  const rate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    repeatClients,
    totalClients,
  };
}

/**
 * Repeat Client Distribution
 * Shows how many clients have 1, 2, 3+ transactions
 */
export async function getRepeatClientDistribution() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const deals = await prismadb.deal.groupBy({
    by: ["clientId"],
    where: {
      organizationId,
      status: "COMPLETED",
    },
    _count: true,
  });

  // Group by deal count
  const distribution: Record<string, number> = {
    "1 deal": 0,
    "2 deals": 0,
    "3+ deals": 0,
  };

  deals.forEach((d) => {
    if (d._count === 1) {
      distribution["1 deal"]++;
    } else if (d._count === 2) {
      distribution["2 deals"]++;
    } else {
      distribution["3+ deals"]++;
    }
  });

  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Referral Rate
 * Percentage of business coming from referrals
 * Top agents often see 50-80%
 */
export async function getReferralRate() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { rate: 0, referralDeals: 0, totalDeals: 0, referralValue: 0, totalValue: 0 };

  const [totalDeals, referralDeals] = await Promise.all([
    prismadb.deal.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
      },
      _count: true,
      _sum: { totalCommission: true },
    }),
    prismadb.deal.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
        leadSource: "REFERRAL",
      },
      _count: true,
      _sum: { totalCommission: true },
    }),
  ]);

  const rate = totalDeals._count > 0 
    ? (referralDeals._count / totalDeals._count) * 100 
    : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    referralDeals: referralDeals._count,
    totalDeals: totalDeals._count,
    referralValue: Number(referralDeals._sum.totalCommission || 0),
    totalValue: Number(totalDeals._sum.totalCommission || 0),
  };
}

/**
 * Referral Rate by Source (from Clients lead_source)
 * Alternative calculation using client lead source
 */
export async function getReferralRateByClientSource() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { rate: 0, referralClients: 0, totalClients: 0 };

  const clients = await prismadb.clients.groupBy({
    by: ["lead_source"],
    where: {
      organizationId,
      client_status: "CONVERTED",
    },
    _count: true,
  });

  const totalClients = clients.reduce((sum, c) => sum + c._count, 0);
  const referralClients = clients.find((c) => c.lead_source === "REFERRAL")?._count || 0;
  const rate = totalClients > 0 ? (referralClients / totalClients) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    referralClients,
    totalClients,
  };
}

/**
 * Sphere of Influence Size
 * Number of meaningful contacts they regularly engage with
 */
export async function getSphereOfInfluence() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { total: 0, active: 0, contacts: 0, byStatus: [] };

  const [clientsByStatus, contactsCount] = await Promise.all([
    prismadb.clients.groupBy({
      by: ["client_status"],
      where: { organizationId },
      _count: true,
    }),
    prismadb.client_Contacts.count({
      where: { organizationId },
    }),
  ]);

  const byStatus = clientsByStatus.map((s) => ({
    status: s.client_status || "UNKNOWN",
    count: s._count,
  }));

  const total = clientsByStatus.reduce((sum, s) => sum + s._count, 0);
  const active = clientsByStatus
    .filter((s) => s.client_status === "ACTIVE" || s.client_status === "CONVERTED")
    .reduce((sum, s) => sum + s._count, 0);

  return {
    total,
    active,
    contacts: contactsCount,
    byStatus,
  };
}

/**
 * Sphere Growth Trend
 * Shows how the sphere of influence is growing over time
 */
export async function getSphereGrowthTrend() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const clients = await prismadb.clients.findMany({
    where: {
      organizationId,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      createdAt: true,
    },
  });

  // Group by month (cumulative)
  const monthlyData: Record<string, number> = {};
  
  clients.forEach((client) => {
    const date = new Date(client.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
  });

  // Make cumulative
  let cumulative = 0;
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, added]) => {
      cumulative += added;
      return {
        month,
        name: formatMonth(month),
        added,
        total: cumulative,
      };
    });
}

/**
 * Client Engagement Score
 * Based on recent activity (tasks, events, deals)
 */
export async function getClientEngagement() {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return { activeEngagements: 0, pendingTasks: 0, upcomingEvents: 0 };

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [pendingTasks, upcomingEvents] = await Promise.all([
    prismadb.crm_Accounts_Tasks.count({
      where: {
        organizationId,
        dueDateAt: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    }),
    prismadb.calComEvent.count({
      where: {
        organizationId,
        startTime: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    }),
  ]);

  return {
    activeEngagements: pendingTasks + upcomingEvents,
    pendingTasks,
    upcomingEvents,
  };
}

/**
 * Get all client metrics in one call
 * Optimized for dashboard display
 */
export async function getAllClientMetrics() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) {
    return {
      lifetimeValue: { average: 0, total: 0, clientCount: 0 },
      topClients: [],
      repeatRate: { rate: 0, repeatClients: 0, totalClients: 0 },
      repeatDistribution: [],
      referralRate: { rate: 0, referralDeals: 0, totalDeals: 0, referralValue: 0, totalValue: 0 },
      sphere: { total: 0, active: 0, contacts: 0, byStatus: [] },
      sphereGrowth: [],
      engagement: { activeEngagements: 0, pendingTasks: 0, upcomingEvents: 0 },
    };
  }

  const [
    lifetimeValue,
    topClients,
    repeatRate,
    repeatDistribution,
    referralRate,
    sphere,
    sphereGrowth,
    engagement,
  ] = await Promise.all([
    getClientLifetimeValue(),
    getTopClientsByValue(5),
    getRepeatClientRate(),
    getRepeatClientDistribution(),
    getReferralRate(),
    getSphereOfInfluence(),
    getSphereGrowthTrend(),
    getClientEngagement(),
  ]);

  return {
    lifetimeValue,
    topClients,
    repeatRate,
    repeatDistribution,
    referralRate,
    sphere,
    sphereGrowth,
    engagement,
  };
}

// Helper function to format month string
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}
