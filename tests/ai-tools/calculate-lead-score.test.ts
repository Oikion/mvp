import { describe, expect, it, vi } from "vitest";

import { calculateLeadScoreTool } from "@/actions/ai/tools/lead-scoring";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    clients: {
      findFirst: vi.fn(),
    },
  },
}));

describe("calculateLeadScoreTool", () => {
  it("returns score and factors for a client", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.clients.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      client_status: "LEAD",
      intent: "BUY",
      budget_min: 200000,
      budget_max: 350000,
      timeline: "ONE_THREE_MONTHS",
      last_activity: new Date().toISOString(),
    });

    const result = await calculateLeadScoreTool({
      clientId: "client-1",
      includeDetails: true,
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.score).toBeGreaterThan(0);
    expect(result.data?.factors?.length).toBeGreaterThan(0);
  });
});
