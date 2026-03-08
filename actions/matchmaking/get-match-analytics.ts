"use server";

import type { MatchAnalytics } from "@/lib/matchmaking";

/**
 * Get comprehensive match analytics for the dashboard
 *
 * DEPRECATED: Client preferences (intent, purpose, areas_of_interest, budget_min,
 * budget_max, property_preferences, etc.) have been moved to the Mandate model.
 * Client-based analytics now returns empty results. Use mandate-based matching
 * (getMandateMatches / getMandateMatchAnalytics) instead.
 */
export async function getMatchAnalytics(): Promise<MatchAnalytics> {
  return getEmptyAnalytics();
}

/**
 * Get summary stats for quick dashboard display
 *
 * DEPRECATED: Returns zeros since client preferences are now on mandates.
 */
export async function getMatchSummaryStats(): Promise<{
  totalClients: number;
  totalProperties: number;
  matchesAbove50: number;
  matchesAbove80: number;
  averageScore: number;
}> {
  return {
    totalClients: 0,
    totalProperties: 0,
    matchesAbove50: 0,
    matchesAbove80: 0,
    averageScore: 0,
  };
}

function getEmptyAnalytics(): MatchAnalytics {
  return {
    topMatches: [],
    matchDistribution: [
      { range: "0-25%", min: 0, max: 25, count: 0 },
      { range: "26-50%", min: 26, max: 50, count: 0 },
      { range: "51-70%", min: 51, max: 70, count: 0 },
      { range: "71-85%", min: 71, max: 85, count: 0 },
      { range: "86-100%", min: 86, max: 100, count: 0 },
    ],
    unmatchedClients: [],
    hotProperties: [],
    totalClients: 0,
    totalProperties: 0,
    averageMatchScore: 0,
    clientsWithMatches: 0,
  };
}
