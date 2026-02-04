import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRecentPriceChanges } from "@/lib/market-intel/db";

/**
 * GET /api/market-intel/price-changes
 * Get recent price changes across all platforms
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
    const hours = parseInt(searchParams.get("hours") || "168", 10); // Default: 1 week
    const type = searchParams.get("type") as 'increase' | 'decrease' | undefined;

    const changes = await getRecentPriceChanges(orgId, hours, type);

    // Group by change type for summary
    const summary = {
      total: changes.length,
      increases: changes.filter(c => c.changeType === 'increase').length,
      decreases: changes.filter(c => c.changeType === 'decrease').length,
      avgIncreasePercent: 0,
      avgDecreasePercent: 0
    };

    const increases = changes.filter(c => c.changeType === 'increase');
    const decreases = changes.filter(c => c.changeType === 'decrease');

    if (increases.length > 0) {
      summary.avgIncreasePercent = Math.round(
        (increases.reduce((sum, c) => sum + c.changePercent, 0) / increases.length) * 10
      ) / 10;
    }

    if (decreases.length > 0) {
      summary.avgDecreasePercent = Math.round(
        (decreases.reduce((sum, c) => sum + Math.abs(c.changePercent), 0) / decreases.length) * 10
      ) / 10;
    }

    return NextResponse.json({
      changes,
      summary
    });
  } catch (error) {
    console.error("Price changes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
