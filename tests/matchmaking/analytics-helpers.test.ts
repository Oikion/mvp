import { describe, it, expect } from "vitest";
import { convertMatchScore } from "@/actions/matchmaking/get-request-matches";

describe("convertMatchScore", () => {
  it("converts Decimal 0.75 to integer 75", () => {
    expect(convertMatchScore(0.75)).toBe(75);
  });

  it("converts Decimal 1.0 to 100", () => {
    expect(convertMatchScore(1.0)).toBe(100);
  });

  it("converts Decimal 0.0 to 0", () => {
    expect(convertMatchScore(0.0)).toBe(0);
  });

  it("rounds 0.555 to 56 (not 55)", () => {
    expect(convertMatchScore(0.555)).toBe(56);
  });

  it("converts 0.5 to 50", () => {
    expect(convertMatchScore(0.5)).toBe(50);
  });
});
