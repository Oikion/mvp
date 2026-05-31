"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

/**
 * Generate comprehensive financial report data
 * Includes revenue breakdown, deals, commissions, and trends
 */
export async function generateFinancialReport() {
  // Permission check: Users need report:view permission
  const check = await canPerformAction("report:view");
  if (!check.allowed) {
    return {
      success: false,
      error: "You don't have permission to view financial reports",
    };
  }

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) {
    return {
      success: false,
      error: "Organization not found",
    };
  }

  try {
    // Get all completed deals with details
    const completedDeals = await prismadb.deal.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
      },
      include: {
        Properties: {
          select: {
            property_name: true,
            address_street: true,
            address_city: true,
            salePrice: true,
            property_type: true,
          },
        },
        Clients: {
          select: {
            client_name: true,
            primary_email: true,
          },
        },
        Users_Deal_clientAgentIdToUsers: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        closedAt: "desc",
      },
    });

    // Calculate total revenue
    const totalRevenue = completedDeals.reduce((sum, deal) => {
      const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
      return sum + commission;
    }, 0);

    // Calculate monthly breakdown
    const monthlyBreakdown: Record<
      string,
      { revenue: number; deals: number; avgCommission: number }
    > = {};

    completedDeals.forEach((deal) => {
      if (deal.closedAt) {
        const date = new Date(deal.closedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = { revenue: 0, deals: 0, avgCommission: 0 };
        }

        const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
        monthlyBreakdown[monthKey].revenue += commission;
        monthlyBreakdown[monthKey].deals += 1;
      }
    });

    // Calculate average commission per month
    Object.keys(monthlyBreakdown).forEach((month) => {
      const data = monthlyBreakdown[month];
      data.avgCommission = data.deals > 0 ? data.revenue / data.deals : 0;
    });

    // Get current year stats
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);

    const yearDeals = completedDeals.filter(
      (deal) => deal.closedAt && new Date(deal.closedAt) >= yearStart
    );

    const yearRevenue = yearDeals.reduce((sum, deal) => {
      const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
      return sum + commission;
    }, 0);

    // Get top performing agents
    const agentPerformance: Record<
      string,
      { name: string; email: string; revenue: number; deals: number }
    > = {};

    completedDeals.forEach((deal) => {
      if (deal.Users_Deal_clientAgentIdToUsers) {
        const agent = deal.Users_Deal_clientAgentIdToUsers;
        const agentId = agent.email || agent.name || "Unknown";
        if (!agentPerformance[agentId]) {
          agentPerformance[agentId] = {
            name: agent.name || "Unknown",
            email: agent.email || "",
            revenue: 0,
            deals: 0,
          };
        }

        const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
        agentPerformance[agentId].revenue += commission;
        agentPerformance[agentId].deals += 1;
      }
    });

    const topAgents = Object.values(agentPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate quarter-over-quarter growth
    const currentQuarter = Math.floor(new Date().getMonth() / 3);
    const quarterStart = new Date(currentYear, currentQuarter * 3, 1);
    const prevQuarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
    const prevQuarterEnd = new Date(currentYear, currentQuarter * 3, 0);

    const currentQuarterDeals = completedDeals.filter(
      (deal) => deal.closedAt && new Date(deal.closedAt) >= quarterStart
    );

    const prevQuarterDeals = completedDeals.filter(
      (deal) =>
        deal.closedAt &&
        new Date(deal.closedAt) >= prevQuarterStart &&
        new Date(deal.closedAt) <= prevQuarterEnd
    );

    const currentQuarterRevenue = currentQuarterDeals.reduce((sum, deal) => {
      const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
      return sum + commission;
    }, 0);

    const prevQuarterRevenue = prevQuarterDeals.reduce((sum, deal) => {
      const commission = deal.totalCommission ? Number(deal.totalCommission) : 0;
      return sum + commission;
    }, 0);

    const quarterGrowth =
      prevQuarterRevenue > 0
        ? ((currentQuarterRevenue - prevQuarterRevenue) / prevQuarterRevenue) * 100
        : 0;

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalDeals: completedDeals.length,
          averageCommission:
            completedDeals.length > 0 ? totalRevenue / completedDeals.length : 0,
          yearToDateRevenue: yearRevenue,
          yearToDateDeals: yearDeals.length,
          currentQuarterRevenue,
          quarterGrowth,
        },
        monthlyBreakdown: Object.entries(monthlyBreakdown)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 12)
          .map(([month, data]) => ({
            month,
            ...data,
          })),
        topAgents,
        recentDeals: completedDeals.slice(0, 20).map((deal) => ({
          id: deal.id,
          propertyTitle: deal.Properties?.property_name || "Unknown Property",
          propertyAddress: `${deal.Properties?.address_street || ""} ${deal.Properties?.address_city || ""}`.trim() || "Unknown Address",
          clientName: deal.Clients?.client_name || "Unknown Client",
          agentName: deal.Users_Deal_clientAgentIdToUsers?.name || "Unassigned",
          commission: deal.totalCommission ? Number(deal.totalCommission) : 0,
          salePrice: deal.Properties?.salePrice || 0,
          closedAt: deal.closedAt,
          dealType: deal.dealType,
        })),
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error generating financial report:", error);
    return {
      success: false,
      error: "Failed to generate financial report",
    };
  }
}
