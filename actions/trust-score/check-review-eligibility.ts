"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export interface ReviewEligibilityDetails {
  isConnected: boolean;
  hasSharedProperty: boolean;
  connectedLongEnough: boolean;
  connectionDays?: number;
}

export interface ReviewEligibilityResult {
  eligible: boolean;
  reason?: string;
  details: ReviewEligibilityDetails;
}

/**
 * Check if the current user is eligible to review another user
 * Requirements:
 * 1. ACCEPTED connection exists
 * 2. At least one property has been shared between them
 * 3. Connected for at least 15 days
 */
export async function checkReviewEligibility(
  revieweeId: string
): Promise<ReviewEligibilityResult> {
  const currentUser = await getCurrentUser();

  // Cannot review yourself
  if (currentUser.id === revieweeId) {
    return {
      eligible: false,
      reason: "You cannot review yourself",
      details: {
        isConnected: false,
        hasSharedProperty: false,
        connectedLongEnough: false,
      },
    };
  }

  // Check 1: Is there an ACCEPTED connection?
  const connection = await prismadb.agentConnection.findFirst({
    where: {
      OR: [
        { followerId: currentUser.id, followingId: revieweeId },
        { followerId: revieweeId, followingId: currentUser.id },
      ],
      status: "ACCEPTED",
    },
    select: {
      id: true,
      updatedAt: true,
      status: true,
    },
  });

  if (!connection) {
    return {
      eligible: false,
      reason: "You are not connected with this user",
      details: {
        isConnected: false,
        hasSharedProperty: false,
        connectedLongEnough: false,
      },
    };
  }

  // Check 2: Has at least one property been shared?
  const sharedProperty = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "PROPERTY",
      OR: [
        { sharedById: currentUser.id, sharedWithId: revieweeId },
        { sharedById: revieweeId, sharedWithId: currentUser.id },
      ],
    },
    select: {
      id: true,
    },
  });

  const hasSharedProperty = !!sharedProperty;

  if (!hasSharedProperty) {
    return {
      eligible: false,
      reason: "You haven't shared any properties with this user",
      details: {
        isConnected: true,
        hasSharedProperty: false,
        connectedLongEnough: false,
      },
    };
  }

  // Check 3: Connected for at least 15 days?
  const connectionDate = new Date(connection.updatedAt);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - connectionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const connectedLongEnough = daysDiff >= 15;

  if (!connectedLongEnough) {
    return {
      eligible: false,
      reason: `You've been connected for ${daysDiff} days (15 required)`,
      details: {
        isConnected: true,
        hasSharedProperty: true,
        connectedLongEnough: false,
        connectionDays: daysDiff,
      },
    };
  }

  // All requirements met
  return {
    eligible: true,
    details: {
      isConnected: true,
      hasSharedProperty: true,
      connectedLongEnough: true,
      connectionDays: daysDiff,
    },
  };
}

/**
 * Check if the current user is eligible to review an agency
 * Requirements:
 * 1. Connected to at least one agent in the agency
 * 2. Shared at least one property with someone in the agency
 * 3. Been connected for 15+ days
 */
export async function checkAgencyReviewEligibility(
  _agencyOrgId: string
): Promise<ReviewEligibilityResult> {
  const _currentUser = await getCurrentUser();

  // Find all users in the target agency
  const _agencyUsers = await prismadb.users.findMany({
    where: {
      // Note: We need to query Clerk for org membership
      // For now, we'll check if they have any data with that organizationId
    },
    select: {
      id: true,
    },
  });

  // For now, return not implemented
  // This would require Clerk API calls to get org membership
  return {
    eligible: false,
    reason: "Agency review eligibility check not fully implemented",
    details: {
      isConnected: false,
      hasSharedProperty: false,
      connectedLongEnough: false,
    },
  };
}
