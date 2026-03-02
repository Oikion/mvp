"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { calculateTrustScore } from "./calculate-trust-score";

export interface DeleteReviewInput {
  reviewType: "agent" | "agency";
  reviewId: string;
}

/**
 * Delete a review (agent or agency)
 * Only the reviewer can delete their own review
 */
export async function deleteReview(
  input: DeleteReviewInput
): Promise<ActionResponse<void>> {
  try {
    const currentUser = await getCurrentUser();

    if (input.reviewType === "agent") {
      // Find the review
      const review = await prismadb.agentReview.findUnique({
        where: { id: input.reviewId },
        select: {
          id: true,
          reviewerId: true,
          revieweeId: true,
        },
      });

      if (!review) {
        return actionError("Review not found");
      }

      // Verify ownership
      if (review.reviewerId !== currentUser.id) {
        return actionError("You can only delete your own reviews");
      }

      // Delete the review
      await prismadb.agentReview.delete({
        where: { id: input.reviewId },
      });

      // Recalculate trust score for the reviewee
      await calculateTrustScore({
        entityType: "AGENT",
        entityId: review.revieweeId,
      });

      revalidatePath("/agent/[slug]", "page");
    } else if (input.reviewType === "agency") {
      // Find the review
      const review = await prismadb.agencyReview.findUnique({
        where: { id: input.reviewId },
        select: {
          id: true,
          reviewerId: true,
          revieweeOrgId: true,
        },
      });

      if (!review) {
        return actionError("Review not found");
      }

      // Verify ownership
      if (review.reviewerId !== currentUser.id) {
        return actionError("You can only delete your own reviews");
      }

      // Delete the review
      await prismadb.agencyReview.delete({
        where: { id: input.reviewId },
      });

      // Recalculate trust score for the agency
      await calculateTrustScore({
        entityType: "AGENCY",
        entityId: review.revieweeOrgId,
      });

      revalidatePath("/agency/[slug]", "page");
    } else {
      return actionError("Invalid review type");
    }

    revalidatePath("/app/social", "page");

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[DELETE_REVIEW]", error);
    return actionError("Failed to delete review", error);
  }
}
