import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getCompetitorListings,
  getDistinctAreas,
  type ListingFilters
} from "@/lib/market-intel/db";

/**
 * GET /api/market-intel/listings
 * Get competitor listings with filters and pagination
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
    
    // Parse filters - always include organizationId for multi-tenant filtering
    const filters: ListingFilters = {
      organizationId: orgId
    };
    
    if (searchParams.get("area")) {
      filters.area = searchParams.get("area")!;
    }
    if (searchParams.get("municipality")) {
      filters.municipality = searchParams.get("municipality")!;
    }
    if (searchParams.get("minPrice")) {
      filters.minPrice = parseInt(searchParams.get("minPrice")!, 10);
    }
    if (searchParams.get("maxPrice")) {
      filters.maxPrice = parseInt(searchParams.get("maxPrice")!, 10);
    }
    if (searchParams.get("minSize")) {
      filters.minSize = parseInt(searchParams.get("minSize")!, 10);
    }
    if (searchParams.get("maxSize")) {
      filters.maxSize = parseInt(searchParams.get("maxSize")!, 10);
    }
    if (searchParams.get("bedrooms")) {
      filters.bedrooms = parseInt(searchParams.get("bedrooms")!, 10);
    }
    if (searchParams.get("propertyType")) {
      filters.propertyType = searchParams.get("propertyType")!;
    }
    if (searchParams.get("transactionType")) {
      filters.transactionType = searchParams.get("transactionType") as 'sale' | 'rent';
    }
    if (searchParams.get("platform")) {
      filters.platform = searchParams.get("platform")!;
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search")!;
    }

    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const sortBy = searchParams.get("sortBy") || "last_seen_at";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as 'asc' | 'desc';

    const result = await getCompetitorListings(filters, {
      page,
      limit,
      sortBy,
      sortOrder
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Listings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market-intel/listings/areas
 * Get distinct areas for filtering
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const areas = await getDistinctAreas(orgId);
    return NextResponse.json({ areas });
  } catch (error) {
    console.error("Areas API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
