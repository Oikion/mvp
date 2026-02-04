import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getUnderpricedListings,
  getNewListings,
  getRecentPriceChanges
} from "@/lib/market-intel/db";

/**
 * GET /api/market-intel/opportunities
 * Get investment opportunities (underpriced, new, price drops)
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
    const type = searchParams.get("type") || "all";

    switch (type) {
      case "underpriced": {
        const threshold = parseInt(searchParams.get("threshold") || "15", 10);
        const listings = await getUnderpricedListings(orgId, threshold);
        return NextResponse.json({ listings });
      }

      case "new": {
        const hours = parseInt(searchParams.get("hours") || "24", 10);
        const listings = await getNewListings(orgId, hours);
        return NextResponse.json({ listings });
      }

      case "price-drops": {
        const hours = parseInt(searchParams.get("hours") || "168", 10);
        const changes = await getRecentPriceChanges(orgId, hours, 'decrease');
        return NextResponse.json({ changes });
      }

      case "price-increases": {
        const hours = parseInt(searchParams.get("hours") || "168", 10);
        const changes = await getRecentPriceChanges(orgId, hours, 'increase');
        return NextResponse.json({ changes });
      }

      case "all": {
        const [underpriced, newListings, priceDrops] = await Promise.all([
          getUnderpricedListings(orgId, 15),
          getNewListings(orgId, 24),
          getRecentPriceChanges(orgId, 168, 'decrease')
        ]);

        return NextResponse.json({
          underpriced: underpriced.slice(0, 10),
          newListings: newListings.slice(0, 10),
          priceDrops: priceDrops.slice(0, 10)
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Opportunities API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
