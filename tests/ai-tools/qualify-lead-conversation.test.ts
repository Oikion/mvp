import { describe, expect, it, vi } from "vitest";

import { qualifyLeadConversation } from "@/actions/ai/tools/lead-qualification";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    clients: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("qualifyLeadConversation", () => {
  it("returns qualification details for a client", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.clients.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "client-1",
      communication_notes: null,
    });
    (prismadb.clients.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const result = await qualifyLeadConversation({
      clientId: "client-1",
      conversationText: "Budget 300k, looking next month.",
      updateClient: true,
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.readiness).toBe("HIGH");
  });
});
