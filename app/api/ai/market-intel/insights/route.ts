import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * POST /api/ai/market-intel/insights
 * Get market intelligence insights for an area
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { area, propertyType, transactionType, timeframe = "30d" } = body;

    // In a full implementation, this would query the market intelligence data
    // For now, return a structured response that can be enhanced
    
    // Convert timeframe to days
    const timeframeDays: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
    };
    const days = timeframeDays[timeframe] || 30;

    // This is a placeholder - in production, query actual market data
    const insights = {
      area: area || "All areas",
      propertyType: propertyType || "All types",
      transactionType: transactionType || "All transactions",
      timeframe: `Last ${days} days`,
      summary: `Market analysis for ${area || "the region"} over the last ${days} days.`,
      metrics: {
        averagePrice: null,
        medianPrice: null,
        priceChange: null,
        inventory: null,
        daysOnMarket: null,
      },
      trends: {
        priceDirection: "stable",
        demandLevel: "moderate",
        inventoryTrend: "stable",
      },
      note: "Detailed market intelligence data requires the Market Intelligence module to be enabled and configured.",
    };

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("[AI_MARKET_INTEL_INSIGHTS]", error);
    return NextResponse.json(
      { error: "Failed to get market insights" },
      { status: 500 }
    );
  }
}
