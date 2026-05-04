/**
 * Matchmaking Rate Limiting Configuration
 * Used by matchmaking API routes to prevent excessive re-computation.
 */

// Minimum time between full-org matchmaking runs (10 minutes)
export const MATCHMAKING_RATE_LIMIT_MS = 10 * 60 * 1000;

// Minimum time between individual request matchmaking runs (same as org limit)
export const REQUEST_MATCHMAKING_RATE_LIMIT_MS = MATCHMAKING_RATE_LIMIT_MS;
