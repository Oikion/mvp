import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getMarketStatsByArea,
  getPlatformStats,
  getScrapeLogs,
  getAreaPriceTrend
} from "@/lib/market-intel/db";

/**
 * GET /api/market-intel/stats
 * Get market statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "areas";

    switch (type) {
      case "areas": {
        const stats = await getMarketStatsByArea(orgId);
        return NextResponse.json({ stats });
      }

      case "platforms": {
        const stats = await getPlatformStats(orgId);
        return NextResponse.json({ stats });
      }

      case "scrape-logs": {
        const platform = searchParams.get("platform") || undefined;
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const logs = await getScrapeLogs(orgId, platform, limit);
        return NextResponse.json({ logs });
      }

      case "area-trend": {
        const area = searchParams.get("area");
        if (!area) {
          return NextResponse.json(
            { error: "Area parameter required" },
            { status: 400 }
          );
        }
        const months = parseInt(searchParams.get("months") || "6", 10);
        const trend = await getAreaPriceTrend(orgId, area, months);
        return NextResponse.json({ trend });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
