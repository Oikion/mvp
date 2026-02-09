type LeadScoringInput = {
  status?: "LEAD" | "ACTIVE" | "INACTIVE" | "CONVERTED" | "LOST";
  intent?: "BUY" | "RENT" | "SELL" | "LEASE" | "INVEST";
  budgetMin?: number;
  budgetMax?: number;
  timeline?: "IMMEDIATE" | "ONE_THREE_MONTHS" | "THREE_SIX_MONTHS" | "SIX_PLUS_MONTHS";
  hasRecentActivity?: boolean;
};

type LeadScoreFactor = {
  label: string;
  points: number;
};

type LeadScoreResult = {
  score: number;
  factors: LeadScoreFactor[];
};

function calculateLeadScore(input: LeadScoringInput): LeadScoreResult {
  const factors: LeadScoreFactor[] = [];
  let score = 20;

  if (input.status === "ACTIVE") {
    score += 10;
    factors.push({ label: "Active status", points: 10 });
  }

  if (input.hasRecentActivity) {
    score += 10;
    factors.push({ label: "Recent activity", points: 10 });
  }

  if (input.intent) {
    const intentPoints = ["BUY", "SELL", "INVEST"].includes(input.intent) ? 10 : 5;
    score += intentPoints;
    factors.push({ label: "Intent clarity", points: intentPoints });
  }

  if (input.budgetMin || input.budgetMax) {
    const budgetPoints = input.budgetMin && input.budgetMax ? 15 : 10;
    score += budgetPoints;
    factors.push({ label: "Budget provided", points: budgetPoints });
  }

  if (input.timeline) {
    const timelinePoints =
      input.timeline === "IMMEDIATE" || input.timeline === "ONE_THREE_MONTHS"
        ? 15
        : input.timeline === "THREE_SIX_MONTHS"
        ? 8
        : 4;
    score += timelinePoints;
    factors.push({ label: "Timeline urgency", points: timelinePoints });
  }

  score = Math.min(100, score);

  return { score, factors };
}

export { calculateLeadScore };
export type { LeadScoringInput, LeadScoreResult, LeadScoreFactor };
