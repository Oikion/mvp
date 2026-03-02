"use server";

// @auth-exempt: public trust-score data — reviews and scores for agents/agencies
// are visible to anyone on the platform (social proof feature). The revieweeId and
// revieweeOrgId are public Clerk user/org IDs, not secrets. No private org data exposed.

import { prismadb } from "@/lib/prisma";
import type { AgentReview, AgencyReview } from "@prisma/client";

export interface AgentReviewWithReviewer extends AgentReview {
  Reviewer: {
    id: string;
    name: string | null;
    avatar: string | null;
    AgentProfile: {
      slug: string;
    } | null;
  };
}

export interface AgencyReviewWithReviewer extends AgencyReview {
  Reviewer: {
    id: string;
    name: string | null;
    avatar: string | null;
    AgentProfile: {
      slug: string;
    } | null;
  };
}

export interface GetReviewsOptions {
  limit?: number;
  offset?: number;
}

/**
 * Get agent reviews with pagination
 */
export async function getAgentReviews(
  agentId: string,
  options: GetReviewsOptions = {}
): Promise<AgentReviewWithReviewer[]> {
  const { limit = 20, offset = 0 } = options;

  const reviews = await prismadb.agentReview.findMany({
    where: { revieweeId: agentId },
    include: {
      Reviewer: {
        select: {
          id: true,
          name: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return reviews;
}

/**
 * Get agency reviews with pagination
 */
export async function getAgencyReviews(
  orgId: string,
  options: GetReviewsOptions = {}
): Promise<AgencyReviewWithReviewer[]> {
  const { limit = 20, offset = 0 } = options;

  const reviews = await prismadb.agencyReview.findMany({
    where: { revieweeOrgId: orgId },
    include: {
      Reviewer: {
        select: {
          id: true,
          name: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return reviews;
}

/**
 * Get a specific agent review by the current user
 */
export async function getMyAgentReview(
  reviewerId: string,
  revieweeId: string
): Promise<AgentReview | null> {
  const review = await prismadb.agentReview.findUnique({
    where: {
      reviewerId_revieweeId: {
        reviewerId,
        revieweeId,
      },
    },
  });

  return review;
}

/**
 * Get a specific agency review by the current user
 */
export async function getMyAgencyReview(
  reviewerId: string,
  revieweeOrgId: string
): Promise<AgencyReview | null> {
  const review = await prismadb.agencyReview.findUnique({
    where: {
      reviewerId_revieweeOrgId: {
        reviewerId,
        revieweeOrgId,
      },
    },
  });

  return review;
}
