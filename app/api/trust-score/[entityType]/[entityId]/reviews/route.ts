import { NextRequest, NextResponse } from "next/server";
import { getAgentReviews, getAgencyReviews } from "@/actions/trust-score/get-reviews";

/**
 * GET /api/trust-score/[entityType]/[entityId]/reviews
 * Get reviews for an agent or agency with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (entityType !== "AGENT" && entityType !== "AGENCY") {
      return NextResponse.json(
        { error: "Invalid entity type. Must be AGENT or AGENCY" },
        { status: 400 }
      );
    }

    const reviews =
      entityType === "AGENT"
        ? await getAgentReviews(entityId, { limit, offset })
        : await getAgencyReviews(entityId, { limit, offset });

    return NextResponse.json({
      data: reviews,
      meta: {
        limit,
        offset,
        hasMore: reviews.length === limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET_REVIEWS_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
