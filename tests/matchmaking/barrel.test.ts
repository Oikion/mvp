import { describe, it, expectTypeOf } from "vitest";
import type * as MatchmakingActions from "@/actions/matchmaking";

/**
 * Barrel-export type checks for actions/matchmaking/index.ts
 *
 * These tests verify at the TypeScript type level that all v2 functions are
 * exported from the barrel. No runtime Prisma/Clerk calls are made — the
 * import is a type-only import evaluated by the TypeScript compiler during
 * vitest's type-check pass.
 */
describe("actions/matchmaking barrel exports — v2 functions", () => {
  // ── v2: Request-based matching ──────────────────────────────────────────
  it("exports getRequestMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getRequestMatches>().toBeFunction();
  });

  it("exports getRequestMatchAnalytics as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getRequestMatchAnalytics>().toBeFunction();
  });

  // ── v2: Intra-org matching ──────────────────────────────────────────────
  it("exports triggerIntraOrgMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.triggerIntraOrgMatches>().toBeFunction();
  });

  it("exports runIntraOrgMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.runIntraOrgMatches>().toBeFunction();
  });

  // ── v2: Summary ─────────────────────────────────────────────────────────
  it("exports getMatchmakingSummary as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getMatchmakingSummary>().toBeFunction();
  });

  // ── Supporting functions ─────────────────────────────────────────────────
  it("exports getPersistedMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getPersistedMatches>().toBeFunction();
  });

  it("exports strikeDeal as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.strikeDeal>().toBeFunction();
  });

  // ── Legacy v1 stubs (backward-compat) ───────────────────────────────────
  it("exports getClientMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getClientMatches>().toBeFunction();
  });

  it("exports getPropertyMatches as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getPropertyMatches>().toBeFunction();
  });

  it("exports getMatchScore as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getMatchScore>().toBeFunction();
  });

  it("exports getMatchAnalytics as a function type", () => {
    expectTypeOf<typeof MatchmakingActions.getMatchAnalytics>().toBeFunction();
  });
});
