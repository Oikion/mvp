import { describe, expect, it, vi } from "vitest";

import { analyzeContractTerms } from "@/actions/ai/tools/contract-analysis";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    documents: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/documents/text-extractor", () => ({
  getDocumentText: vi.fn(async () => "Penalty for termination. Deposit is non-refundable."),
}));

vi.mock("@/lib/documents/document-analyzer", () => ({
  analyzeDocument: vi.fn(async () => ({
    summary: "Lease agreement summary.",
    keyPoints: [],
    documentType: "contract",
    entities: { people: [], organizations: [], locations: [], dates: [], amounts: [] },
    metadata: { wordCount: 10, language: "en" },
  })),
}));

describe("analyzeContractTerms", () => {
  it("returns summary and risk flags", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.documents.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "doc-1",
      document_name: "Lease.pdf",
      document_file_url: "https://example.com/lease.pdf",
    });

    const result = await analyzeContractTerms({
      documentId: "doc-1",
      analysisType: "risk",
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.risks?.length).toBeGreaterThan(0);
    expect(result.data?.summary).toContain("Lease");
  });
});
