import { describe, it, expect } from "vitest";

import { normalizeDashboardConfig } from "@/lib/dashboard/widget-registry";

describe("normalizeDashboardConfig", () => {
  it("adds responsive layouts when missing", () => {
    const config = normalizeDashboardConfig({
      widgets: [
        { id: "quick-actions", visible: true, size: "sm", order: 0 },
        { id: "activity-chart", visible: true, size: "lg", order: 1 },
      ],
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(config.layouts).toBeDefined();
    expect(config.layouts?.lg).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ i: "quick-actions" }),
        expect.objectContaining({ i: "activity-chart" }),
      ])
    );

    const quickActions = config.layouts?.lg.find((item) => item.i === "quick-actions");
    const activityChart = config.layouts?.lg.find((item) => item.i === "activity-chart");

    expect(quickActions?.w).toBeGreaterThan(0);
    expect(quickActions?.h).toBeGreaterThan(0);
    expect(activityChart?.w).toBeGreaterThan(0);
    expect(activityChart?.h).toBeGreaterThan(0);
  });

  it("fills in missing layout items", () => {
    const config = normalizeDashboardConfig({
      widgets: [
        { id: "quick-actions", visible: true, size: "sm", order: 0 },
        { id: "activity-chart", visible: true, size: "lg", order: 1 },
      ],
      layouts: {
        lg: [{ i: "quick-actions", x: 0, y: 0, w: 4, h: 4 }],
        md: [{ i: "quick-actions", x: 0, y: 0, w: 4, h: 4 }],
        sm: [{ i: "quick-actions", x: 0, y: 0, w: 4, h: 4 }],
      },
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    const activityChart = config.layouts?.lg.find((item) => item.i === "activity-chart");
    expect(activityChart).toBeTruthy();
  });
});
