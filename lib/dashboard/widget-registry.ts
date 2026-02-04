// @ts-nocheck
// TODO: Fix type errors
/**
 * Widget Registry
 * 
 * Central registry of all available dashboard widgets with their metadata.
 * Used by the dashboard system to render widgets and manage configuration.
 */

import {
  type WidgetMetadata,
  type DashboardConfig,
  type WidgetConfig,
  DASHBOARD_CONFIG_VERSION,
} from "./types";

// All available widgets with their metadata
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  "quick-actions": {
    id: "quick-actions",
    nameKey: "widgets.quickActions.name",
    descriptionKey: "widgets.quickActions.description",
    icon: "Zap",
    defaultSize: "sm",
    minSize: "sm",
    maxSize: "md",
    category: "actions",
    dataKeys: [],
  },
  "revenue-stats": {
    id: "revenue-stats",
    nameKey: "widgets.revenueStats.name",
    descriptionKey: "widgets.revenueStats.description",
    icon: "DollarSign",
    defaultSize: "sm",
    minSize: "sm",
    maxSize: "sm",
    category: "metrics",
    dataKeys: ["totalRevenue", "revenueTrend"],
  },
  "clients-stats": {
    id: "clients-stats",
    nameKey: "widgets.clientsStats.name",
    descriptionKey: "widgets.clientsStats.description",
    icon: "Users",
    defaultSize: "sm",
    minSize: "sm",
    maxSize: "sm",
    category: "metrics",
    dataKeys: ["clientsCount", "accountsTrend"],
  },
  "properties-stats": {
    id: "properties-stats",
    nameKey: "widgets.propertiesStats.name",
    descriptionKey: "widgets.propertiesStats.description",
    icon: "Building2",
    defaultSize: "sm",
    minSize: "sm",
    maxSize: "sm",
    category: "metrics",
    dataKeys: ["propertiesCount", "propertiesTrend"],
  },
  "active-users-stats": {
    id: "active-users-stats",
    nameKey: "widgets.activeUsersStats.name",
    descriptionKey: "widgets.activeUsersStats.description",
    icon: "UserCheck",
    defaultSize: "sm",
    minSize: "sm",
    maxSize: "sm",
    category: "metrics",
    dataKeys: ["activeUsersCount", "activeUsersTrend"],
  },
  "activity-chart": {
    id: "activity-chart",
    nameKey: "widgets.activityChart.name",
    descriptionKey: "widgets.activityChart.description",
    icon: "TrendingUp",
    defaultSize: "lg",
    minSize: "md",
    maxSize: "lg",
    category: "charts",
    dataKeys: ["clientsByMonth", "propertiesByMonth"],
  },
  "activity-feed": {
    id: "activity-feed",
    nameKey: "widgets.activityFeed.name",
    descriptionKey: "widgets.activityFeed.description",
    icon: "Activity",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "lists",
    dataKeys: ["recentActivities"],
  },
  "upcoming-events": {
    id: "upcoming-events",
    nameKey: "widgets.upcomingEvents.name",
    descriptionKey: "widgets.upcomingEvents.description",
    icon: "Calendar",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "lists",
    dataKeys: ["upcomingEvents"],
  },
  "recent-messages": {
    id: "recent-messages",
    nameKey: "widgets.recentMessages.name",
    descriptionKey: "widgets.recentMessages.description",
    icon: "MessageSquare",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "communication",
    dataKeys: ["conversations"],
  },
  "clients-status-chart": {
    id: "clients-status-chart",
    nameKey: "widgets.clientsStatusChart.name",
    descriptionKey: "widgets.clientsStatusChart.description",
    icon: "PieChart",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "md",
    category: "charts",
    dataKeys: ["clientsByStatus"],
  },
  "properties-status-chart": {
    id: "properties-status-chart",
    nameKey: "widgets.propertiesStatusChart.name",
    descriptionKey: "widgets.propertiesStatusChart.description",
    icon: "PieChart",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "md",
    category: "charts",
    dataKeys: ["propertiesByStatus"],
  },
  "recent-clients": {
    id: "recent-clients",
    nameKey: "widgets.recentClients.name",
    descriptionKey: "widgets.recentClients.description",
    icon: "UserPlus",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "lists",
    dataKeys: ["recentClients"],
  },
  "recent-properties": {
    id: "recent-properties",
    nameKey: "widgets.recentProperties.name",
    descriptionKey: "widgets.recentProperties.description",
    icon: "Home",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "lists",
    dataKeys: ["recentProperties"],
  },
  "documents": {
    id: "documents",
    nameKey: "widgets.documents.name",
    descriptionKey: "widgets.documents.description",
    icon: "FileText",
    defaultSize: "md",
    minSize: "sm",
    maxSize: "lg",
    category: "lists",
    dataKeys: ["recentDocuments"],
  },
};

// Ordered list of widget IDs for iteration
export const WIDGET_IDS = Object.keys(WIDGET_REGISTRY);

// Default dashboard configuration for new users
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  version: DASHBOARD_CONFIG_VERSION,
  widgets: [
    { id: "quick-actions", visible: true, size: "sm", order: 0 },
    { id: "revenue-stats", visible: true, size: "sm", order: 1 },
    { id: "clients-stats", visible: true, size: "sm", order: 2 },
    { id: "properties-stats", visible: true, size: "sm", order: 3 },
    { id: "active-users-stats", visible: true, size: "sm", order: 4 },
    { id: "activity-chart", visible: true, size: "lg", order: 5 },
    { id: "activity-feed", visible: true, size: "md", order: 6 },
    { id: "upcoming-events", visible: true, size: "md", order: 7 },
    { id: "recent-messages", visible: true, size: "md", order: 8 },
    { id: "clients-status-chart", visible: true, size: "md", order: 9 },
    { id: "properties-status-chart", visible: true, size: "md", order: 10 },
    { id: "recent-clients", visible: true, size: "md", order: 11 },
    { id: "recent-properties", visible: true, size: "md", order: 12 },
    { id: "documents", visible: true, size: "md", order: 13 },
  ],
  updatedAt: new Date().toISOString(),
};

/**
 * Get widget metadata by ID
 */
export function getWidgetMetadata(widgetId: string): WidgetMetadata | undefined {
  return WIDGET_REGISTRY[widgetId];
}

/**
 * Validate and normalize a dashboard configuration
 * Ensures all widgets exist and adds any missing ones
 */
export function normalizeDashboardConfig(
  config: Partial<DashboardConfig> | null | undefined
): DashboardConfig {
  if (!config?.widgets) {
    return { ...DEFAULT_DASHBOARD_CONFIG, updatedAt: new Date().toISOString() };
  }

  // Create a map of existing widget configs
  const existingWidgets = new Map<string, WidgetConfig>();
  for (const widget of config.widgets) {
    if (WIDGET_REGISTRY[widget.id]) {
      existingWidgets.set(widget.id, widget);
    }
  }

  // Build normalized config with all widgets
  const normalizedWidgets: WidgetConfig[] = [];
  let order = 0;

  // First, add existing widgets in their saved order
  const sortedExisting = [...existingWidgets.values()].sort(
    (a, b) => a.order - b.order
  );
  for (const widget of sortedExisting) {
    normalizedWidgets.push({ ...widget, order: order++ });
  }

  // Then, add any missing widgets at the end
  for (const widgetId of WIDGET_IDS) {
    if (!existingWidgets.has(widgetId)) {
      const metadata = WIDGET_REGISTRY[widgetId];
      normalizedWidgets.push({
        id: widgetId,
        visible: true,
        size: metadata.defaultSize,
        order: order++,
      });
    }
  }

  return {
    version: DASHBOARD_CONFIG_VERSION,
    widgets: normalizedWidgets,
    updatedAt: config.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get visible widgets sorted by order
 */
export function getVisibleWidgets(config: DashboardConfig): WidgetConfig[] {
  return config.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all data keys needed for visible widgets
 */
export function getRequiredDataKeys(config: DashboardConfig): string[] {
  const keys = new Set<string>();
  for (const widget of config.widgets) {
    if (widget.visible) {
      const metadata = WIDGET_REGISTRY[widget.id];
      if (metadata) {
        for (const key of metadata.dataKeys) {
          keys.add(key);
        }
      }
    }
  }
  return [...keys];
}
