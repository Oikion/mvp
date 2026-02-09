import { describe, expect, it } from "vitest";

import {
  estimatePropertyValue,
  type PropertyValuationInput,
} from "@/lib/ai/property-valuation-engine";

describe("property-valuation-engine", () => {
  it("estimates value based on price per sqm", () => {
    const input: PropertyValuationInput = {
      sizeNetSqm: 80,
      avgPricePerSqm: 4000,
    };

    const result = estimatePropertyValue(input);

    expect(result.estimatedValue).toBe(320000);
    expect(result.confidenceScore).toBeGreaterThan(0);
  });
});
