import { describe, expect, it } from "vitest";

import { qualifyLeadFromConversation } from "@/lib/ai/lead-qualification";

describe("lead-qualification", () => {
  it("extracts budget and timeline signals", () => {
    const conversation =
      "We are looking to buy in the next month. Budget is around 300k, maybe 320k.";

    const result = qualifyLeadFromConversation(conversation);

    expect(result.budgetRange?.min).toBe(300000);
    expect(result.timeline).toBe("ONE_THREE_MONTHS");
    expect(result.readiness).toBe("HIGH");
  });
});
