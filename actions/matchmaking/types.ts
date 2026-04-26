import type { MatchAnalytics } from "@/lib/matchmaking";

export interface RequestMatchStats {
  totalRequests: number;
  activeRequests: number;
  requestsWithMatches: number;
  avgMatchScore: number;
}

export interface RequestMatchAnalytics extends MatchAnalytics {
  requestStats: RequestMatchStats;
}
