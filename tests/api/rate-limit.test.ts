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
import { MATCHMAKING_RATE_LIMIT_MS as RATE_LIMIT_MS } from "@/lib/matchmaking-constants";
import { prismadb } from "@/lib/prisma";

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
    const recentDate = new Date(Date.now() - RATE_LIMIT_MS / 2); // halfway through window
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: recentDate,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("proceeds when last org run was more than 5 minutes ago", async () => {
    const oldDate = new Date(Date.now() - RATE_LIMIT_MS * 1.2); // 20% past window
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
    const recentDate = new Date(Date.now() - RATE_LIMIT_MS / 2);
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: recentDate,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Rate limited/);
  });
});

describe("run-now requestId-level rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Org-level gate always open for these tests
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it("returns 404 when requestId does not belong to the org", async () => {
    (prismadb.request.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeRequest({ requestId: "claaaaaaaaaaaaaaaaaaaaaaa" }));
    expect(res.status).toBe(404);
  });

  it("returns 429 when request.lastMatchRunAt was within 5 minutes", async () => {
    const recentDate = new Date(Date.now() - RATE_LIMIT_MS / 2);
    (prismadb.request.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      lastMatchRunAt: recentDate,
    });
    (prismadb.request.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST(makeRequest({ requestId: "claaaaaaaaaaaaaaaaaaaaaaa" }));
    expect(res.status).toBe(429);
  });

  it("proceeds and updates lastMatchRunAt when request gate is clear", async () => {
    const oldDate = new Date(Date.now() - RATE_LIMIT_MS * 1.2);
    (prismadb.request.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      lastMatchRunAt: oldDate,
    });
    (prismadb.request.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST(makeRequest({ requestId: "claaaaaaaaaaaaaaaaaaaaaaa" }));
    expect(res.status).toBe(200);
    expect(prismadb.request.update).toHaveBeenCalledOnce();
  });

  it("org-level gate blocks requestId path too when org recently ran", async () => {
    const recentDate = new Date(Date.now() - RATE_LIMIT_MS / 2);
    // Override: org gate is closed
    (prismadb.propertyRequestMatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      updatedAt: recentDate,
    });

    const res = await POST(makeRequest({ requestId: "claaaaaaaaaaaaaaaaaaaaaaa" }));
    expect(res.status).toBe(429);
    // request.findFirst should never be reached — org gate fired first
    expect(prismadb.request.findFirst).not.toHaveBeenCalled();
  });
});
