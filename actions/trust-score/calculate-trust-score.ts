"use server";

import { prismadb } from "@/lib/prisma";
import type { TrustScore } from "@prisma/client";

export interface CalculateTrustScoreInput {
  entityType: "AGENT" | "AGENCY";
  entityId: string;
}

/**
 * Calculate and cache trust score for an agent or agency.
 *
 * @auth-exempt: internal computation function — always called from authenticated
 * callers (getTrustScore, upsert-*-review). Trust scores are cross-org by design:
 * any user can view any agent/agency's score; the entityId parameter is a public
 * Clerk userId or orgId, not a secret.
 */
export async function calculateTrustScore(
  input: CalculateTrustScoreInput
): Promise<TrustScore> {
  if (input.entityType === "AGENT") {
    // Aggregate all agent reviews for this user
    const reviews = await prismadb.agentReview.findMany({
      where: { revieweeId: input.entityId },
      select: {
        overallScore: true,
        professionalismScore: true,
        responsivenessScore: true,
        reliabilityScore: true,
      },
    });

    if (reviews.length === 0) {
      // No reviews yet - create/update with zeros
      const trustScore = await prismadb.trustScore.upsert({
        where: {
          entityType_entityId: {
            entityType: input.entityType,
            entityId: input.entityId,
          },
        },
        create: {
          entityType: input.entityType,
          entityId: input.entityId,
          averageOverall: 0,
          averageProfessionalism: 0,
          averageResponsiveness: 0,
          averageReliability: 0,
          totalReviews: 0,
        },
        update: {
          averageOverall: 0,
          averageProfessionalism: 0,
          averageResponsiveness: 0,
          averageReliability: 0,
          totalReviews: 0,
        },
      });

      return trustScore;
    }

    // Calculate averages
    const totalReviews = reviews.length;
    const averageOverall =
      reviews.reduce((sum, r) => sum + r.overallScore, 0) / totalReviews;
    const averageProfessionalism =
      reviews.reduce((sum, r) => sum + r.professionalismScore, 0) / totalReviews;
    const averageResponsiveness =
      reviews.reduce((sum, r) => sum + r.responsivenessScore, 0) / totalReviews;
    const averageReliability =
      reviews.reduce((sum, r) => sum + r.reliabilityScore, 0) / totalReviews;

    // Upsert trust score
    const trustScore = await prismadb.trustScore.upsert({
      where: {
        entityType_entityId: {
          entityType: input.entityType,
          entityId: input.entityId,
        },
      },
      create: {
        entityType: input.entityType,
        entityId: input.entityId,
        averageOverall,
        averageProfessionalism,
        averageResponsiveness,
        averageReliability,
        totalReviews,
      },
      update: {
        averageOverall,
        averageProfessionalism,
        averageResponsiveness,
        averageReliability,
        totalReviews,
      },
    });

    return trustScore;
  } else {
    // AGENCY: Aggregate both direct agency reviews AND agent reviews
    // Weighting: Agency reviews (80%) + Agent reviews (20%)
    
    // Get direct agency reviews
    const agencyReviews = await prismadb.agencyReview.findMany({
      where: { revieweeOrgId: input.entityId },
      select: {
        overallScore: true,
        professionalismScore: true,
        responsivenessScore: true,
        reliabilityScore: true,
      },
    });

    // Get all agent reviews for agents in this organization
    let agentReviews: typeof agencyReviews = [];
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const orgMembers = await clerk.organizations.getOrganizationMembershipList({
        organizationId: input.entityId,
      });
      
      if (orgMembers.data && orgMembers.data.length > 0) {
        const memberUserIds = orgMembers.data.map(m => m.publicUserData?.userId).filter((id): id is string => !!id);
        
        agentReviews = await prismadb.agentReview.findMany({
          where: { 
            revieweeId: { in: memberUserIds }
          },
          select: {
            overallScore: true,
            professionalismScore: true,
            responsivenessScore: true,
            reliabilityScore: true,
          },
        });
      }
    } catch (error) {
      console.error("[CALCULATE_TRUST_SCORE] Failed to fetch agent reviews:", error);
      // Continue with just agency reviews
    }

    // If no reviews at all, return zero scores
    if (agencyReviews.length === 0 && agentReviews.length === 0) {
      const trustScore = await prismadb.trustScore.upsert({
        where: {
          entityType_entityId: {
            entityType: input.entityType,
            entityId: input.entityId,
          },
        },
        create: {
          entityType: input.entityType,
          entityId: input.entityId,
          averageOverall: 0,
          averageProfessionalism: 0,
          averageResponsiveness: 0,
          averageReliability: 0,
          totalReviews: 0,
        },
        update: {
          averageOverall: 0,
          averageProfessionalism: 0,
          averageResponsiveness: 0,
          averageReliability: 0,
          totalReviews: 0,
        },
      });

      return trustScore;
    }

    // Calculate averages from agency reviews
    let agencyAvgOverall = 0;
    let agencyAvgProfessionalism = 0;
    let agencyAvgResponsiveness = 0;
    let agencyAvgReliability = 0;

    if (agencyReviews.length > 0) {
      agencyAvgOverall = agencyReviews.reduce((sum, r) => sum + r.overallScore, 0) / agencyReviews.length;
      agencyAvgProfessionalism = agencyReviews.reduce((sum, r) => sum + r.professionalismScore, 0) / agencyReviews.length;
      agencyAvgResponsiveness = agencyReviews.reduce((sum, r) => sum + r.responsivenessScore, 0) / agencyReviews.length;
      agencyAvgReliability = agencyReviews.reduce((sum, r) => sum + r.reliabilityScore, 0) / agencyReviews.length;
    }

    // Calculate averages from agent reviews
    let agentAvgOverall = 0;
    let agentAvgProfessionalism = 0;
    let agentAvgResponsiveness = 0;
    let agentAvgReliability = 0;

    if (agentReviews.length > 0) {
      agentAvgOverall = agentReviews.reduce((sum, r) => sum + r.overallScore, 0) / agentReviews.length;
      agentAvgProfessionalism = agentReviews.reduce((sum, r) => sum + r.professionalismScore, 0) / agentReviews.length;
      agentAvgResponsiveness = agentReviews.reduce((sum, r) => sum + r.responsivenessScore, 0) / agentReviews.length;
      agentAvgReliability = agentReviews.reduce((sum, r) => sum + r.reliabilityScore, 0) / agentReviews.length;
    }

    // Weighted average: 80% agency reviews, 20% agent reviews
    const AGENCY_WEIGHT = 0.8;
    const AGENT_WEIGHT = 0.2;

    const averageOverall = (agencyAvgOverall * AGENCY_WEIGHT) + (agentAvgOverall * AGENT_WEIGHT);
    const averageProfessionalism = (agencyAvgProfessionalism * AGENCY_WEIGHT) + (agentAvgProfessionalism * AGENT_WEIGHT);
    const averageResponsiveness = (agencyAvgResponsiveness * AGENCY_WEIGHT) + (agentAvgResponsiveness * AGENT_WEIGHT);
    const averageReliability = (agencyAvgReliability * AGENCY_WEIGHT) + (agentAvgReliability * AGENT_WEIGHT);

    // Total reviews count (agency reviews only, as they are the primary metric)
    const totalReviews = agencyReviews.length;

    // Upsert trust score
    const trustScore = await prismadb.trustScore.upsert({
      where: {
        entityType_entityId: {
          entityType: input.entityType,
          entityId: input.entityId,
        },
      },
      create: {
        entityType: input.entityType,
        entityId: input.entityId,
        averageOverall,
        averageProfessionalism,
        averageResponsiveness,
        averageReliability,
        totalReviews,
      },
      update: {
        averageOverall,
        averageProfessionalism,
        averageResponsiveness,
        averageReliability,
        totalReviews,
      },
    });

    return trustScore;
  }
}
