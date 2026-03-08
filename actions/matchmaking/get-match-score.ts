"use server";

import type { MatchResult } from "@/lib/matchmaking";

/**
 * Get match score between a specific client and property
 *
 * DEPRECATED: Client preferences (intent, purpose, areas_of_interest, budget_min,
 * budget_max, property_preferences, etc.) have been moved to the Mandate model.
 * Client-based scoring now returns null. Use mandate-based matching instead.
 */
export async function getMatchScore(
  _clientId: string,
  _propertyId: string
): Promise<MatchResult | null> {
  // Client preferences have been moved to mandates — return null.
  return null;
}

/**
 * Get match scores for multiple client-property pairs
 *
 * DEPRECATED: Returns empty array since client preferences are now on mandates.
 */
export async function getBatchMatchScores(
  _pairs: Array<{ clientId: string; propertyId: string }>
): Promise<MatchResult[]> {
  return [];
}
