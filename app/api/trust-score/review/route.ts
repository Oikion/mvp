import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleGuardError } from "@/lib/permissions/action-guards";
import { upsertAgentReview } from "@/actions/trust-score/upsert-agent-review";
import { upsertAgencyReview } from "@/actions/trust-score/upsert-agency-review";

/**
 * POST /api/trust-score/review
 * Create or update a review (agent or agency)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authGuard = await requireAuth();
    if (authGuard) {
      return handleGuardError(authGuard);
    }

    const body = await request.json();
    const { reviewType, ...reviewData } = body;

    if (!reviewType || (reviewType !== "agent" && reviewType !== "agency")) {
      return NextResponse.json(
        { error: "Invalid review type. Must be 'agent' or 'agency'" },
        { status: 400 }
      );
    }

    let result;

    if (reviewType === "agent") {
      result = await upsertAgentReview(reviewData);
    } else {
      result = await upsertAgencyReview(reviewData);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to submit review" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST_REVIEW_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
