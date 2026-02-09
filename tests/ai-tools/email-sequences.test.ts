import { describe, expect, it } from "vitest";

import { generateEmailSequence } from "@/lib/ai/email-sequences";

describe("email-sequences", () => {
  it("generates a multi-step sequence", () => {
    const sequence = generateEmailSequence({
      clientName: "Maria",
      sequenceType: "new_lead",
      emailCount: 3,
      daysBetween: 2,
    });

    expect(sequence.length).toBe(3);
    expect(sequence[0].subject).toContain("Maria");
  });
});
