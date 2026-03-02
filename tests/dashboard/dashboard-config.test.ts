import { describe, it, expect } from "vitest";

import { normalizeDashboardConfig } from "@/lib/dashboard/widget-registry";

describe("normalizeDashboardConfig", () => {
  it("returns defaults when no config provided", () => {
    const config = normalizeDashboardConfig(null);

    expect(config.layouts).toBeDefined();
    expect(config.layouts.lg).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ i: "quick-actions" }),
        expect.objectContaining({ i: "activity-chart" }),
      ])
    );

    const quickActions = config.layouts.lg.find((item) => item.i === "quick-actions");
    const activityChart = config.layouts.lg.find((item) => item.i === "activity-chart");

    expect(quickActions?.w).toBeGreaterThan(0);
    expect(quickActions?.h).toBeGreaterThan(0);
    expect(activityChart?.w).toBeGreaterThan(0);
    expect(activityChart?.h).toBeGreaterThan(0);
  });

  it("fills in missing layout items for visible widgets", () => {
    const config = normalizeDashboardConfig({
      widgets: {
        "quick-actions": { visible: true },
        "activity-chart": { visible: true },
      },
      layouts: {
        lg: [{ i: "quick-actions", x: 0, y: 0, w: 24, h: 2 }],
        md: [{ i: "quick-actions", x: 0, y: 0, w: 24, h: 2 }],
        sm: [{ i: "quick-actions", x: 0, y: 0, w: 12, h: 2 }],
        xs: [{ i: "quick-actions", x: 0, y: 0, w: 12, h: 2 }],
        xxs: [{ i: "quick-actions", x: 0, y: 0, w: 12, h: 2 }],
      },
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    const activityChart = config.layouts.lg.find((item) => item.i === "activity-chart");
    expect(activityChart).toBeTruthy();
  });
});
