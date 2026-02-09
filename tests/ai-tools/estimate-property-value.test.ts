import { describe, expect, it, vi } from "vitest";

import { estimatePropertyValueTool } from "@/actions/ai/tools/property-valuation";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    properties: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("estimatePropertyValueTool", () => {
  it("returns estimated value and confidence", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.properties.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "property-1",
      organizationId: "org-1",
      size_net_sqm: 80,
      municipality: "Athens",
      property_type: "APARTMENT",
      transaction_type: "SALE",
    });
    (prismadb.properties.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { price: 320000, size_net_sqm: 80 },
      { price: 300000, size_net_sqm: 75 },
    ]);

    const result = await estimatePropertyValueTool({
      propertyId: "property-1",
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.estimatedValue).toBeGreaterThan(0);
    expect(result.data?.confidenceScore).toBeGreaterThan(0);
  });
});
