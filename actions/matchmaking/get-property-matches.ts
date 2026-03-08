"use server";

import type {
  MatchResultWithClient,
  MatchOptions,
} from "@/lib/matchmaking";

/**
 * Get matching clients for a specific property
 *
 * DEPRECATED: Client preferences (intent, purpose, areas_of_interest, budget_min,
 * budget_max, property_preferences, etc.) have been moved to the Mandate model.
 * Client-based matching now returns empty results. Use mandate-based matching
 * (getMandateMatches) instead.
 */
export async function getPropertyMatches(
  _propertyId: string,
  _options: MatchOptions = {}
): Promise<MatchResultWithClient[]> {
  // Client preferences have been moved to mandates — return empty results.
  // Use getMandateMatches from get-mandate-matches.ts for property matching.
  return [];
}

/**
 * Get a quick match count for a property
 *
 * DEPRECATED: Returns zeros since client preferences are now on mandates.
 */
export async function getPropertyMatchCount(
  _propertyId: string,
  _minScore: number = 50
): Promise<{ total: number; excellent: number; good: number; fair: number }> {
  return { total: 0, excellent: 0, good: 0, fair: 0 };
}
