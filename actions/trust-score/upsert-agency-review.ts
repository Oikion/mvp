"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { calculateTrustScore } from "./calculate-trust-score";
import { clerkClient } from "@clerk/nextjs/server";
import type { AgencyReview } from "@prisma/client";

/**
 * Check if a user is eligible to review an agency
 * Eligibility: Must have an ACCEPTED connection with at least one agent from the target agency
 */
async function canReviewAgency(reviewerId: string, targetOrgId: string): Promise<boolean> {
  try {
    // Get all users in target organization from Clerk
    const clerk = await clerkClient();
    const orgMembers = await clerk.organizations.getOrganizationMembershipList({
      organizationId: targetOrgId,
    });
    
    if (!orgMembers.data || orgMembers.data.length === 0) {
      return false;
    }

    const targetUserIds = orgMembers.data.map(m => m.publicUserData?.userId).filter((id): id is string => !!id);

    // Check if reviewer has ACCEPTED connection with any of them
    const connection = await prismadb.agentConnection.findFirst({
      where: {
        followerId: reviewerId,
        followingId: { in: targetUserIds },
        status: "ACCEPTED",
      },
    });

    return connection !== null;
  } catch (error) {
    console.error("[CAN_REVIEW_AGENCY]", error);
    return false;
  }
}

export interface UpsertAgencyReviewInput {
  revieweeOrgId: string;
  overallScore: number;
  professionalismScore: number;
  responsivenessScore: number;
  reliabilityScore: number;
  comment?: string;
}

/**
 * Create or update an agency review
 */
export async function upsertAgencyReview(
  input: UpsertAgencyReviewInput
): Promise<ActionResponse<AgencyReview>> {
  try {
    const currentUser = await getCurrentUser();
    const reviewerOrgId = await getCurrentOrgId();

    // Cannot review own organization
    if (reviewerOrgId === input.revieweeOrgId) {
      return actionError("You cannot review your own organization");
    }

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

    // Check eligibility - must be connected to at least one agent in the target agency
    const isEligible = await canReviewAgency(currentUser.id, input.revieweeOrgId);
    if (!isEligible) {
      return actionError("You must be connected to at least one agent from this agency to leave a review");
    }

    // Upsert the review
    const review = await prismadb.agencyReview.upsert({
      where: {
        reviewerId_revieweeOrgId: {
          reviewerId: currentUser.id,
          revieweeOrgId: input.revieweeOrgId,
        },
      },
      create: {
        reviewerId: currentUser.id,
        revieweeOrgId: input.revieweeOrgId,
        reviewerOrgId,
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

    // Recalculate trust score for the agency
    await calculateTrustScore({
      entityType: "AGENCY",
      entityId: input.revieweeOrgId,
    });

    // Revalidate paths
    revalidatePath("/agency/[slug]", "page");
    revalidatePath("/app/social", "page");

    return actionSuccess(review);
  } catch (error) {
    console.error("[UPSERT_AGENCY_REVIEW]", error);
    return actionError("Failed to submit review", error);
  }
}
