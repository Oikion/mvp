type ContractRisk = {
  type: "early_termination_penalty" | "non_refundable_deposit" | "unclear_maintenance";
  description: string;
  severity: "low" | "medium" | "high";
};

function analyzeContractRisks(text: string): ContractRisk[] {
  const normalized = text.toLowerCase();
  const risks: ContractRisk[] = [];

  if (normalized.includes("penalty") && normalized.includes("termination")) {
    risks.push({
      type: "early_termination_penalty",
      description: "Contract includes penalties for early termination.",
      severity: "medium",
    });
  }

  if (normalized.includes("non-refundable") || normalized.includes("non refundable")) {
    risks.push({
      type: "non_refundable_deposit",
      description: "Deposit is marked as non-refundable.",
      severity: "high",
    });
  }

  if (normalized.includes("maintenance") && normalized.includes("tenant")) {
    risks.push({
      type: "unclear_maintenance",
      description: "Maintenance responsibilities appear to fall on tenant.",
      severity: "low",
    });
  }

  return risks;
}

export { analyzeContractRisks };
export type { ContractRisk };
