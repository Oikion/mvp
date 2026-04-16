"use server";

import type {
  MatchResultWithProperty,
  MatchOptions,
} from "@/lib/matchmaking";

/**
 * Get matching properties for a specific client
 *
 * DEPRECATED: Client preferences (intent, purpose, areas_of_interest, budget_min,
 * budget_max, property_preferences, etc.) have been moved to the Request model.
 * Client-based matching now returns empty results. Use request-based matching
 * (getRequestMatches) instead.
 */
export async function getClientMatches(
  _clientId: string,
  _options: MatchOptions = {}
): Promise<MatchResultWithProperty[]> {
  // Client preferences have been moved to requests — return empty results.
  // Use getRequestMatches from get-request-matches.ts for property matching.
  return [];
}

/**
 * Get a quick match count for a client
 *
 * DEPRECATED: Returns zeros since client preferences are now on requests.
 */
export async function getClientMatchCount(
  _clientId: string,
  _minScore: number = 50
): Promise<{ total: number; excellent: number; good: number; fair: number }> {
  return { total: 0, excellent: 0, good: 0, fair: 0 };
}
