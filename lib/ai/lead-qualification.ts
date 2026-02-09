type LeadQualificationResult = {
  budgetRange?: {
    min?: number;
    max?: number;
  };
  timeline?: "IMMEDIATE" | "ONE_THREE_MONTHS" | "THREE_SIX_MONTHS" | "SIX_PLUS_MONTHS";
  readiness: "LOW" | "MEDIUM" | "HIGH";
  nextAction: string;
};

function parseBudget(text: string): { min?: number; max?: number } | undefined {
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)(k|K)/g));
  if (matches.length === 0) {
    return undefined;
  }

  const values = matches.map((match) => Math.round(Number(match[1]) * 1000));
  if (values.length === 1) {
    return { min: values[0] };
  }

  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

function parseTimeline(text: string): LeadQualificationResult["timeline"] | undefined {
  if (/next month|1 month|within a month|in a month/i.test(text)) {
    return "ONE_THREE_MONTHS";
  }
  if (/three months|3 months|few months|next quarter/i.test(text)) {
    return "ONE_THREE_MONTHS";
  }
  if (/six months|6 months|half a year/i.test(text)) {
    return "THREE_SIX_MONTHS";
  }
  if (/year|12 months|next year/i.test(text)) {
    return "SIX_PLUS_MONTHS";
  }
  return undefined;
}

function qualifyLeadFromConversation(conversationText: string): LeadQualificationResult {
  const budgetRange = parseBudget(conversationText);
  const timeline = parseTimeline(conversationText);

  const readiness =
    budgetRange?.min && timeline && timeline !== "SIX_PLUS_MONTHS" ? "HIGH" : budgetRange ? "MEDIUM" : "LOW";

  const nextAction =
    readiness === "HIGH"
      ? "Schedule a viewing and confirm financing details."
      : readiness === "MEDIUM"
      ? "Clarify timeline and confirm decision-makers."
      : "Collect budget range and desired move-in timeline.";

  return {
    budgetRange,
    timeline,
    readiness,
    nextAction,
  };
}

export { qualifyLeadFromConversation };
export type { LeadQualificationResult };
