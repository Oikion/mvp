import { NextRequest, NextResponse } from "next/server";
import { getTrustScore } from "@/actions/trust-score/get-trust-score";

/**
 * GET /api/trust-score/[entityType]/[entityId]
 * Get trust score for an agent or agency
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;

    if (entityType !== "AGENT" && entityType !== "AGENCY") {
      return NextResponse.json(
        { error: "Invalid entity type. Must be AGENT or AGENCY" },
        { status: 400 }
      );
    }

    const trustScore = await getTrustScore(entityType, entityId);

    if (!trustScore) {
      return NextResponse.json(
        { error: "Trust score not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: trustScore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET_TRUST_SCORE_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
