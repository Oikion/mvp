/**
 * Widget Registry
 *
 * Central registry of all available dashboard widgets with their metadata.
 * Used by the dashboard system to render widgets and manage configuration.
 */

import {
  type WidgetMetadata,
  type DashboardConfig,
  type ResponsiveLayouts,
  type GridPosition,
  type WidgetSettings,
} from "./types";


// All available widgets with their metadata
// 48-column grid system on desktop, scales down to 12 columns on mobile
// minW is content-based but mobile-friendly (max 12 for full-width on mobile)
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  "quick-actions": {
    id: "quick-actions",
    nameKey: "widgets.quickActions.name",
    descriptionKey: "widgets.quickActions.description",
    icon: "Zap",
    w: 24, h: 2, minW: 12, minH: 2, maxW: 48, maxH: 4,
    category: "actions",
    dataKeys: [],
  },
  "revenue-stats": {
    id: "revenue-stats",
    nameKey: "widgets.revenueStats.name",
    descriptionKey: "widgets.revenueStats.description",
    icon: "DollarSign",
    w: 12, h: 2, minW: 6, minH: 2, maxW: 24, maxH: 4,
    category: "metrics",
    dataKeys: ["totalRevenue", "revenueTrend"],
  },
  "clients-stats": {
    id: "clients-stats",
    nameKey: "widgets.clientsStats.name",
    descriptionKey: "widgets.clientsStats.description",
    icon: "Users",
    w: 12, h: 2, minW: 6, minH: 2, maxW: 24, maxH: 4,
    category: "metrics",
    dataKeys: ["clientsCount", "accountsTrend"],
  },
  "properties-stats": {
    id: "properties-stats",
    nameKey: "widgets.propertiesStats.name",
    descriptionKey: "widgets.propertiesStats.description",
    icon: "Building2",
    w: 12, h: 2, minW: 6, minH: 2, maxW: 24, maxH: 4,
    category: "metrics",
    dataKeys: ["propertiesCount", "propertiesTrend"],
  },
  "active-users-stats": {
    id: "active-users-stats",
    nameKey: "widgets.activeUsersStats.name",
    descriptionKey: "widgets.activeUsersStats.description",
    icon: "UserCheck",
    w: 12, h: 2, minW: 6, minH: 2, maxW: 24, maxH: 4,
    category: "metrics",
    dataKeys: ["activeUsersCount", "activeUsersTrend"],
  },
  "activity-chart": {
    id: "activity-chart",
    nameKey: "widgets.activityChart.name",
    descriptionKey: "widgets.activityChart.description",
    icon: "TrendingUp",
    w: 48, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 8,
    category: "charts",
    dataKeys: ["clientsByMonth", "propertiesByMonth"],
  },
  "activity-feed": {
    id: "activity-feed",
    nameKey: "widgets.activityFeed.name",
    descriptionKey: "widgets.activityFeed.description",
    icon: "Activity",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "lists",
    dataKeys: ["recentActivities"],
  },
  "upcoming-events": {
    id: "upcoming-events",
    nameKey: "widgets.upcomingEvents.name",
    descriptionKey: "widgets.upcomingEvents.description",
    icon: "Calendar",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "lists",
    dataKeys: ["upcomingEvents"],
  },
  "recent-messages": {
    id: "recent-messages",
    nameKey: "widgets.recentMessages.name",
    descriptionKey: "widgets.recentMessages.description",
    icon: "MessageSquare",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "communication",
    dataKeys: ["conversations"],
  },
  "clients-status-chart": {
    id: "clients-status-chart",
    nameKey: "widgets.clientsStatusChart.name",
    descriptionKey: "widgets.clientsStatusChart.description",
    icon: "PieChart",
    w: 16, h: 3, minW: 12, minH: 3, maxW: 24, maxH: 6,
    category: "charts",
    dataKeys: ["clientsByStatus"],
  },
  "properties-status-chart": {
    id: "properties-status-chart",
    nameKey: "widgets.propertiesStatusChart.name",
    descriptionKey: "widgets.propertiesStatusChart.description",
    icon: "PieChart",
    w: 16, h: 3, minW: 12, minH: 3, maxW: 24, maxH: 6,
    category: "charts",
    dataKeys: ["propertiesByStatus"],
  },
  "recent-clients": {
    id: "recent-clients",
    nameKey: "widgets.recentClients.name",
    descriptionKey: "widgets.recentClients.description",
    icon: "UserPlus",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "lists",
    dataKeys: ["recentClients"],
  },
  "recent-properties": {
    id: "recent-properties",
    nameKey: "widgets.recentProperties.name",
    descriptionKey: "widgets.recentProperties.description",
    icon: "Home",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "lists",
    dataKeys: ["recentProperties"],
  },
  "documents": {
    id: "documents",
    nameKey: "widgets.documents.name",
    descriptionKey: "widgets.documents.description",
    icon: "FileText",
    w: 24, h: 4, minW: 12, minH: 3, maxW: 48, maxH: 12,
    category: "lists",
    dataKeys: ["recentDocuments"],
  },
};

// Ordered list of widget IDs for iteration
export const WIDGET_IDS = Object.keys(WIDGET_REGISTRY);

/**
 * Helper to convert 48-column layout to 24-column layout (tablet)
 */
function generateSmallLayout(lgLayout: GridPosition[], targetCols: number): GridPosition[] {
  return lgLayout.map(item => {
    const scaledW = Math.min(Math.ceil(item.w / 2), targetCols);
    const scaledX = Math.floor(item.x / 2);

    return {
      ...item,
      x: scaledX,
      w: scaledW,
      ...(scaledX + scaledW > targetCols && { x: 0, w: targetCols }),
    };
  });
}

/**
 * Helper to convert layout to single-column (mobile)
 */
function generateMobileLayout(lgLayout: GridPosition[], targetCols: number): GridPosition[] {
  let currentY = 0;

  return lgLayout.map(item => {
    const result = {
      ...item,
      x: 0,
      w: targetCols,
      y: currentY,
    };
    currentY += item.h;
    return result;
  });
}

/**
 * Helper to generate default layout for a set of widgets
 * Creates an intelligent, non-overlapping layout optimized for the 48-column grid
 */
function generateDefaultLayouts(widgetIds: string[]): ResponsiveLayouts {
  const lg: GridPosition[] = [];

  // Predefined optimized layout for 48-column grid with perfectly aligned rows
  const defaultPositions: Record<string, { x: number; y: number; w: number; h: number }> = {
    // Row 1 (y=0): 4 metric cards
    "revenue-stats":      { x: 0,  y: 0, w: 12, h: 2 },
    "clients-stats":      { x: 12, y: 0, w: 12, h: 2 },
    "properties-stats":   { x: 24, y: 0, w: 12, h: 2 },
    "active-users-stats": { x: 36, y: 0, w: 12, h: 2 },

    // Row 2 (y=2): Full-width chart
    "activity-chart":     { x: 0,  y: 2, w: 48, h: 4 },

    // Row 3 (y=6): Quick actions + Upcoming events
    "quick-actions":      { x: 0,  y: 6, w: 24, h: 2 },
    "upcoming-events":    { x: 24, y: 6, w: 24, h: 4 },

    // Row 4 (y=8): Activity feed + Recent messages
    "activity-feed":      { x: 0,  y: 8, w: 24, h: 4 },
    "recent-messages":    { x: 24, y: 10, w: 24, h: 4 },

    // Row 5 (y=12): Recent clients + Recent properties
    "recent-clients":     { x: 0,  y: 12, w: 24, h: 4 },
    "recent-properties":  { x: 24, y: 14, w: 24, h: 4 },

    // Row 6 (y=16): Documents + Status charts
    "documents":               { x: 0,  y: 16, w: 24, h: 4 },
    "clients-status-chart":    { x: 24, y: 18, w: 12, h: 3 },
    "properties-status-chart": { x: 36, y: 18, w: 12, h: 3 },
  };

  let maxY = 21;

  for (const id of widgetIds) {
    const meta = WIDGET_REGISTRY[id];
    if (!meta) continue;

    const predefined = defaultPositions[id];
    if (predefined) {
      lg.push({
        i: id,
        x: predefined.x,
        y: predefined.y,
        w: predefined.w,
        h: predefined.h,
        minW: meta.minW,
        maxW: meta.maxW,
        minH: meta.minH,
        maxH: meta.maxH,
      });
    } else {
      lg.push({
        i: id,
        x: 0,
        y: maxY,
        w: meta.w,
        h: meta.h,
        minW: meta.minW,
        maxW: meta.maxW,
        minH: meta.minH,
        maxH: meta.maxH,
      });
      maxY += meta.h;
    }
  }

  const md = lg.map(item => ({ ...item }));
  const sm = generateSmallLayout(lg, 24);
  const xs = generateMobileLayout(lg, 12);
  const xxs = xs.map(item => ({ ...item }));

  return { lg, md, sm, xs, xxs };
}

// Default widgets list
const DEFAULT_WIDGET_IDS = [
  "quick-actions",
  "revenue-stats",
  "clients-stats",
  "properties-stats",
  "active-users-stats",
  "activity-chart",
  "activity-feed",
  "upcoming-events",
  "recent-messages",
  "clients-status-chart",
  "properties-status-chart",
  "recent-clients",
  "recent-properties",
  "documents",
];

// Default dashboard configuration for new users
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  layouts: generateDefaultLayouts(DEFAULT_WIDGET_IDS),
  widgets: DEFAULT_WIDGET_IDS.reduce((acc, id) => {
    acc[id] = { visible: true };
    return acc;
  }, {} as Record<string, WidgetSettings>),
  updatedAt: new Date().toISOString(),
};

/**
 * Get widget metadata by ID
 */
export function getWidgetMetadata(widgetId: string): WidgetMetadata | undefined {
  return WIDGET_REGISTRY[widgetId];
}

/**
 * Validate and normalize a dashboard configuration.
 * Handles migration from V1 (size/order) to V2 (layouts/widgets).
 */
export function normalizeDashboardConfig(
  config: Partial<DashboardConfig> | null | undefined
): DashboardConfig {
  if (!config || !config.layouts || !config.widgets) {
    return { ...DEFAULT_DASHBOARD_CONFIG, updatedAt: new Date().toISOString() };
  }

  const currentConfig = config as DashboardConfig;
  const widgets = currentConfig.widgets || {};
  const layouts = currentConfig.layouts || { lg: [], md: [], sm: [], xs: [], xxs: [] };

  // Detect broken configs with suspiciously small widget widths
  const lgLayout = layouts.lg || [];
  if (lgLayout.length > 0) {
    const avgWidth = lgLayout.reduce((sum, item) => sum + item.w, 0) / lgLayout.length;
    if (avgWidth < 8) {
      console.warn("[Dashboard] Detected broken config (avg width:", avgWidth, "), resetting to defaults");
      return { ...DEFAULT_DASHBOARD_CONFIG, updatedAt: new Date().toISOString() };
    }
  }

  // Detect invalid widget dimensions
  for (const item of lgLayout) {
    if (item.w < 4 || item.w > 48 || item.h < 1 || item.h > 20) {
      console.warn("[Dashboard] Invalid widget dimensions for", item.i, ", resetting to defaults");
      return { ...DEFAULT_DASHBOARD_CONFIG, updatedAt: new Date().toISOString() };
    }
  }

  // Add missing widgets to configuration
  for (const id of WIDGET_IDS) {
    if (!widgets[id]) {
      widgets[id] = { visible: false };
    }
  }

  // Add missing visible widgets to lg layout
  const visibleIds = Object.keys(widgets).filter(id => widgets[id].visible);
  const layoutIds = new Set(layouts.lg?.map(l => l.i) || []);
  const newLg = [...(layouts.lg || [])];
  let newItemsAdded = false;

  for (const id of visibleIds) {
    if (!layoutIds.has(id)) {
      const meta = WIDGET_REGISTRY[id];
      if (meta) {
        newLg.push({
          i: id,
          x: 0,
          y: Infinity,
          w: meta.w,
          h: meta.h,
          minW: meta.minW,
          maxW: meta.maxW,
          minH: meta.minH,
          maxH: meta.maxH,
        });
        newItemsAdded = true;
      }
    }
  }

  if (newItemsAdded) {
    layouts.lg = newLg;
  }

  return {
    widgets,
    layouts,
    updatedAt: currentConfig.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get visible widget IDs
 */
export function getVisibleWidgetIds(config: DashboardConfig): string[] {
  return Object.keys(config.widgets).filter(id => config.widgets[id].visible);
}

/**
 * Get all data keys needed for visible widgets
 */
export function getRequiredDataKeys(config: DashboardConfig): string[] {
  const keys = new Set<string>();
  const visibleIds = getVisibleWidgetIds(config);

  for (const id of visibleIds) {
    const metadata = WIDGET_REGISTRY[id];
    if (metadata) {
      for (const key of metadata.dataKeys) {
        keys.add(key);
      }
    }
  }
  return Array.from(keys);
}
