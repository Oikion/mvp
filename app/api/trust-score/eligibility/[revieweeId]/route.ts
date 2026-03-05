import { NextRequest, NextResponse } from "next/server";
import { checkReviewEligibility } from "@/actions/trust-score/check-review-eligibility";
import { requireAuth } from "@/lib/permissions/action-guards";

/**
 * GET /api/trust-score/eligibility/[revieweeId]
 * Check if current user is eligible to review another user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ revieweeId: string }> }
) {
  try {
    // Auth check
    const authGuard = await requireAuth();
    if (authGuard) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { revieweeId } = await params;
    const eligibility = await checkReviewEligibility(revieweeId);

    return NextResponse.json({
      data: eligibility,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CHECK_ELIGIBILITY_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
