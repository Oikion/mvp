import { describe, expect, it, vi } from "vitest";

import { schedulePropertyShowing } from "@/actions/ai/tools/showing-scheduler";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    properties: {
      findFirst: vi.fn(),
    },
    clients: {
      findFirst: vi.fn(),
    },
    calendarEvent: {
      create: vi.fn(),
    },
  },
}));

describe("schedulePropertyShowing", () => {
  it("creates a showing event for client and property", async () => {
    const { prismadb } = await import("@/lib/prisma");
    (prismadb.properties.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "property-1",
    });
    (prismadb.clients.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "client-1",
    });
    (prismadb.calendarEvent.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "event-1",
      startTime: new Date("2026-02-10T10:00:00Z"),
      endTime: new Date("2026-02-10T10:30:00Z"),
    });

    const result = await schedulePropertyShowing({
      propertyId: "property-1",
      clientId: "client-1",
      preferredDates: ["2026-02-10T10:00:00Z"],
      duration: 30,
      _toolContext: {
        organizationId: "org-1",
        source: "ADMIN_TEST",
        testMode: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.eventId).toBe("event-1");
  });
});
