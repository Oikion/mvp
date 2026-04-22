import { describe, it, expect } from "vitest";

describe("org-level rate limit helper", () => {
  it("reports within-window when elapsed < RATE_LIMIT_MS", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const lastRunAt = new Date(Date.now() - 2 * 60 * 1000);
    const elapsed = Date.now() - lastRunAt.getTime();
    expect(elapsed < RATE_LIMIT_MS).toBe(true);
  });

  it("reports outside-window when elapsed >= RATE_LIMIT_MS", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const lastRunAt = new Date(Date.now() - 6 * 60 * 1000);
    const elapsed = Date.now() - lastRunAt.getTime();
    expect(elapsed < RATE_LIMIT_MS).toBe(false);
  });

  it("calculates retryAfterSec correctly", () => {
    const RATE_LIMIT_MS = 5 * 60 * 1000;
    const elapsed = 2 * 60 * 1000;
    const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
    expect(retryAfterSec).toBe(180);
  });
});
