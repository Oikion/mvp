import { describe, it, expect, expectTypeOf } from "vitest";
import type { MatchAnalytics } from "@/lib/matchmaking/types";

describe("MatchAnalytics type shape", () => {
  it("accepts requestsWithMatches as optional number", () => {
    const a: MatchAnalytics = {} as MatchAnalytics;
    expectTypeOf(a.requestsWithMatches).toEqualTypeOf<number | undefined>();
  });

  it("accepts totalRequests as optional number", () => {
    const a: MatchAnalytics = {} as MatchAnalytics;
    expectTypeOf(a.totalRequests).toEqualTypeOf<number | undefined>();
  });

  it("accepts unmatchedRequests as optional number", () => {
    const a: MatchAnalytics = {} as MatchAnalytics;
    expectTypeOf(a.unmatchedRequests).toEqualTypeOf<number | undefined>();
  });

  it("MatchAnalytics object with all three fields is valid", () => {
    const analytics: MatchAnalytics = {
      requestsWithMatches: 5,
      totalRequests: 10,
      unmatchedRequests: 5,
    } as MatchAnalytics;
    expect(analytics.requestsWithMatches).toBe(5);
  });
});
