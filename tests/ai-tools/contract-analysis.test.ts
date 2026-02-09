import { describe, expect, it } from "vitest";

import { analyzeContractRisks } from "@/lib/ai/contract-analysis";

describe("contract-analysis", () => {
  it("flags common risk clauses", () => {
    const text =
      "The tenant agrees to a penalty for early termination. The deposit is non-refundable.";

    const risks = analyzeContractRisks(text);

    expect(risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "early_termination_penalty" }),
        expect.objectContaining({ type: "non_refundable_deposit" }),
      ])
    );
  });
});
