import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleGuardError } from "@/lib/permissions/action-guards";
import { deleteReview } from "@/actions/trust-score/delete-review";

/**
 * DELETE /api/trust-score/review/[reviewId]
 * Delete a review (agent or agency)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    // Auth check
    const authGuard = await requireAuth();
    if (authGuard) {
      return handleGuardError(authGuard);
    }

    const { searchParams } = new URL(request.url);
    const reviewType = searchParams.get("type");

    if (!reviewType || (reviewType !== "agent" && reviewType !== "agency")) {
      return NextResponse.json(
        { error: "Invalid review type. Must be 'agent' or 'agency' in query param" },
        { status: 400 }
      );
    }

    const { reviewId } = await params;
    const result = await deleteReview({
      reviewType: reviewType as "agent" | "agency",
      reviewId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete review" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DELETE_REVIEW_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
