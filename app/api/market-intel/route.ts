import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getCompetitorListings, 
  getMarketStatsByArea,
  getPlatformStats 
} from "@/lib/market-intel/db";

/**
 * GET /api/market-intel
 * Get market intelligence overview with stats
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
    const view = searchParams.get("view") || "overview";

    if (view === "overview") {
      // Get overview stats - filter by organization for multi-tenant support
      const [areaStats, platformStats] = await Promise.all([
        getMarketStatsByArea(orgId),
        getPlatformStats(orgId)
      ]);

      const totalListings = platformStats.reduce((sum, p) => sum + p.totalListings, 0);
      const topAreas = areaStats.slice(0, 10);

      return NextResponse.json({
        overview: {
          totalListings,
          platformBreakdown: platformStats,
          topAreas
        }
      });
    }

    return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
  } catch (error) {
    console.error("Market intel API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
