"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { checkReviewEligibility } from "./check-review-eligibility";
import { calculateTrustScore } from "./calculate-trust-score";
import type { AgentReview } from "@prisma/client";

export interface UpsertAgentReviewInput {
  revieweeId: string;
  overallScore: number;
  professionalismScore: number;
  responsivenessScore: number;
  reliabilityScore: number;
  comment?: string;
}

/**
 * Create or update an agent review
 */
export async function upsertAgentReview(
  input: UpsertAgentReviewInput
): Promise<ActionResponse<AgentReview>> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Permission check is not needed since eligibility check ensures proper access
    // Reviews are only between connected agents who have shared properties

    // Validate scores (must be 1-5)
    const scores = [
      input.overallScore,
      input.professionalismScore,
      input.responsivenessScore,
      input.reliabilityScore,
    ];

    for (const score of scores) {
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return actionError("All scores must be integers between 1 and 5");
      }
    }

    // Check eligibility
    const eligibility = await checkReviewEligibility(input.revieweeId);
    if (!eligibility.eligible) {
      return actionError(eligibility.reason || "You are not eligible to review this user");
    }

    // Check if reviewee exists
    const reviewee = await prismadb.users.findUnique({
      where: { id: input.revieweeId },
      select: { id: true, name: true },
    });

    if (!reviewee) {
      return actionError("User not found");
    }

    // Upsert the review
    const review = await prismadb.agentReview.upsert({
      where: {
        reviewerId_revieweeId: {
          reviewerId: currentUser.id,
          revieweeId: input.revieweeId,
        },
      },
      create: {
        reviewerId: currentUser.id,
        revieweeId: input.revieweeId,
        organizationId,
        overallScore: input.overallScore,
        professionalismScore: input.professionalismScore,
        responsivenessScore: input.responsivenessScore,
        reliabilityScore: input.reliabilityScore,
        comment: input.comment,
      },
      update: {
        overallScore: input.overallScore,
        professionalismScore: input.professionalismScore,
        responsivenessScore: input.responsivenessScore,
        reliabilityScore: input.reliabilityScore,
        comment: input.comment,
      },
    });

    // Recalculate trust score for the reviewee
    await calculateTrustScore({
      entityType: "AGENT",
      entityId: input.revieweeId,
    });

    // Send notification to reviewee
    await createNotification({
      userId: input.revieweeId,
      organizationId,
      type: "REVIEW_RECEIVED",
      title: "New Trust Score Review",
      message: `${currentUser.name || "Someone"} left you a ${input.overallScore}-star review`,
      metadata: {
        reviewId: review.id,
        reviewerId: currentUser.id,
        overallScore: input.overallScore,
      },
    });

    // Revalidate paths
    revalidatePath("/agent/[slug]", "page");
    revalidatePath("/app/social", "page");

    return actionSuccess(review);
  } catch (error) {
    console.error("[UPSERT_AGENT_REVIEW]", error);
    return actionError("Failed to submit review", error);
  }
}
