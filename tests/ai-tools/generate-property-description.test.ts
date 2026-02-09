import { describe, expect, it, vi } from "vitest";

import { generatePropertyDescription } from "@/actions/ai/tools/property-descriptions";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    properties: {
      findFirst: vi.fn(),
    },
  },
}));

const mockProperty = {
  property_name: "City Loft",
  property_type: "APARTMENT",
  transaction_type: "SALE",
  municipality: "Athens",
  area: "Syntagma",
  price: 280000,
  bedrooms: 1,
  bathrooms: 1,
  size_net_sqm: 52,
};

describe("generatePropertyDescription", () => {
  it("returns a template description in test mode", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.properties.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProperty
    );

    const result = await generatePropertyDescription({
      propertyId: "property-1",
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.description).toContain("Call to action");
  });
});
