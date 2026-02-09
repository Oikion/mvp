import { describe, expect, it, vi } from "vitest";

import { generateCmaReport } from "@/actions/ai/tools/cma-generation";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    properties: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/export", () => ({
  generateTablePDF: vi.fn(async () => ({
    blob: new Blob(["pdf"]),
    filename: "cma-report.pdf",
    contentType: "application/pdf",
  })),
  CMA_COLUMNS: [],
}));

const subjectProperty = {
  id: "property-1",
  property_name: "Metro Flat",
  property_type: "APARTMENT",
  transaction_type: "SALE",
  municipality: "Athens",
  area: "Pangrati",
  price: 300000,
  bedrooms: 2,
  bathrooms: 1,
  size_net_sqm: 75,
};

const comparableProperties = [
  {
    id: "property-2",
    property_name: "Comparable 1",
    property_type: "APARTMENT",
    transaction_type: "SALE",
    municipality: "Athens",
    area: "Pangrati",
    price: 280000,
    bedrooms: 2,
    bathrooms: 1,
    size_net_sqm: 70,
  },
];

describe("generateCmaReport", () => {
  it("returns CMA summary in test mode", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.properties.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      subjectProperty
    );
    (prismadb.properties.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      comparableProperties
    );

    const result = await generateCmaReport({
      propertyId: "property-1",
      outputFormat: "json",
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.summary).toBeDefined();
    expect(result.data?.comparables?.length).toBe(1);
  });
});
