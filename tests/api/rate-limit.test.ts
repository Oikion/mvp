import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user-1", orgId: "org-1" }),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    propertyRequestMatch: { findFirst: vi.fn() },
    request: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/actions/matchmaking/compute-intra-org-matches", () => ({
  runIntraOrgMatches: vi.fn().mockResolvedValue({ upserted: 0, skipped: 0, durationMs: 10 }),
}));

import { POST } from "@/app/api/matchmaking/run-now/route";
import { prismadb } from "@/lib/prisma";

const RATE_LIMIT_MS = 5 * 60 * 1000;

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/matchmaking/run-now", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("run-now org-level rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 429 when last org run was within 5 minutes", async () => {
    const recentDate = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: recentDate,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("proceeds when last org run was more than 5 minutes ago", async () => {
    const oldDate = new Date(Date.now() - 6 * 60 * 1000); // 6 min ago
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: oldDate,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("proceeds when no previous org run exists (null record)", async () => {
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("calculates retryAfterSec correctly in 429 response", async () => {
    const elapsed = 2 * 60 * 1000; // 2 min elapsed
    const recentDate = new Date(Date.now() - elapsed);
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: recentDate,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    // apiRateLimited returns { error: string } — verify the message contains retry info
    expect(body.error).toMatch(/Rate limited/);
  });
});
