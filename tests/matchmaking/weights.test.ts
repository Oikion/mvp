import { describe, it, expect } from "vitest";
import {
  MATCH_WEIGHTS_V2,
  MATCH_WEIGHTS_V2_BASE_SUM,
  MATCH_WEIGHTS_V2_FINANCING_BONUS,
} from "@/lib/matchmaking/weights";

describe("MATCH_WEIGHTS_V2 constants", () => {
  it("MATCH_WEIGHTS_V2_BASE_SUM equals the actual sum of all weights", () => {
    const actualSum = Object.values(MATCH_WEIGHTS_V2).reduce((a, b) => a + b, 0);
    expect(MATCH_WEIGHTS_V2_BASE_SUM).toBe(actualSum);
  });

  it("MATCH_WEIGHTS_V2_FINANCING_BONUS is 5", () => {
    expect(MATCH_WEIGHTS_V2_FINANCING_BONUS).toBe(5);
  });

  it("max possible score (BASE_SUM + FINANCING_BONUS) does not exceed 109", () => {
    expect(MATCH_WEIGHTS_V2_BASE_SUM + MATCH_WEIGHTS_V2_FINANCING_BONUS).toBeLessThanOrEqual(109);
  });
});
