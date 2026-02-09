import { describe, expect, it } from "vitest";

import {
  buildCmaSummary,
  type CmaComparable,
  type CmaSubject,
} from "@/lib/ai/cma-generator";

describe("cma-generator", () => {
  it("builds CMA summary with comparable averages", () => {
    const subject: CmaSubject = {
      propertyName: "Metro Flat",
      price: 300000,
      sizeNetSqm: 75,
    };
    const comparables: CmaComparable[] = [
      { price: 280000, sizeNetSqm: 70 },
      { price: 320000, sizeNetSqm: 80 },
      { price: 310000, sizeNetSqm: 78 },
    ];

    const summary = buildCmaSummary(subject, comparables);

    expect(summary.avgComparablePrice).toBe(303333);
    expect(summary.avgComparablePricePerSqm).toBe(4000);
    expect(summary.recommendedPriceRange.min).toBeLessThan(subject.price);
    expect(summary.recommendedPriceRange.max).toBeGreaterThan(subject.price);
  });
});
