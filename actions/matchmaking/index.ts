"use server";

/**
 * Matchmaking Server Actions — v2 barrel
 *
 * Centralises all matchmaking exports so callers import from
 * "@/actions/matchmaking" rather than deep-linking individual files.
 */

// ── v2: Request-based matching ─────────────────────────────────────────────
export {
  getRequestMatches,
  getRequestMatchAnalytics,
} from "./get-request-matches";

// ── v2: Intra-org matching ────────────────────────────────────────────────
export {
  triggerIntraOrgMatches,
  runIntraOrgMatches,
} from "./compute-intra-org-matches";

// ── v2: Matchmaking summary (dashboard) ──────────────────────────────────
export { getMatchmakingSummary } from "./get-matchmaking-summary";

// ── Persisted / cached matches ────────────────────────────────────────────
export { getPersistedMatches } from "./get-persisted-matches";

// ── Deal creation from a match ────────────────────────────────────────────
export { strikeDeal } from "./strike-deal";

// ── Legacy v1 stubs (kept for backward-compat; prefer v2 equivalents above)
export { getClientMatches, getClientMatchCount } from "./get-client-matches";
export { getPropertyMatches, getPropertyMatchCount } from "./get-property-matches";
export { getMatchScore, getBatchMatchScores } from "./get-match-score";
export { getMatchAnalytics, getMatchSummaryStats } from "./get-match-analytics";
