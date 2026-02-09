import { describe, expect, it } from "vitest";

import {
  calculateLeadScore,
  type LeadScoringInput,
} from "@/lib/ai/lead-scoring-engine";

describe("lead-scoring-engine", () => {
  it("scores higher for well-qualified leads", () => {
    const qualified: LeadScoringInput = {
      status: "LEAD",
      intent: "BUY",
      budgetMin: 250000,
      budgetMax: 400000,
      timeline: "ONE_THREE_MONTHS",
      hasRecentActivity: true,
    };

    const lowQuality: LeadScoringInput = {
      status: "LEAD",
      intent: "BUY",
      hasRecentActivity: false,
    };

    const qualifiedScore = calculateLeadScore(qualified);
    const lowScore = calculateLeadScore(lowQuality);

    expect(qualifiedScore.score).toBeGreaterThan(lowScore.score);
    expect(qualifiedScore.score).toBeGreaterThanOrEqual(70);
  });
});
