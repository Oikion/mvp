"use server";

// @auth-exempt: public trust-score data — trust scores (aggregated ratings) are
// visible to the entire platform as social proof for agents and agencies. The
// entityId is a public Clerk userId or orgId. No private org-scoped data exposed.

import { prismadb } from "@/lib/prisma";
import type { TrustScore } from "@prisma/client";
import { calculateTrustScore } from "./calculate-trust-score";

/**
 * Get trust score for an agent or agency.
 * Returns cached score if available, otherwise recalculates.
 */
export async function getTrustScore(
  entityType: "AGENT" | "AGENCY",
  entityId: string
): Promise<TrustScore | null> {
  // Try to get cached score
  const cached = await prismadb.trustScore.findUnique({
    where: {
      entityType_entityId: {
        entityType,
        entityId,
      },
    },
  });

  // If cached and recent (less than 1 hour old), return it
  if (cached) {
    const age = Date.now() - cached.lastCalculatedAt.getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (age < oneHour) {
      return cached;
    }
  }

  // Calculate fresh score
  try {
    const score = await calculateTrustScore({ entityType, entityId });
    return score;
  } catch (error) {
    console.error("[GET_TRUST_SCORE]", error);
    // Return cached even if stale, or null
    return cached || null;
  }
}
