/**
 * Dashboard widget customization types
 */

// Widget size options
export type WidgetSize = "sm" | "md" | "lg";

// Configuration for a single widget
export interface WidgetConfig {
  id: string;
  visible: boolean;
  size: WidgetSize;
  order: number;
}

// Complete dashboard configuration stored in database
export interface DashboardConfig {
  version: number;
  widgets: WidgetConfig[];
  updatedAt: string;
}

// Widget metadata for the registry
export interface WidgetMetadata {
  id: string;
  nameKey: string; // Translation key for widget name
  descriptionKey: string; // Translation key for description
  icon: string; // Lucide icon name
  defaultSize: WidgetSize;
  minSize: WidgetSize;
  maxSize: WidgetSize;
  category: WidgetCategory;
  dataKeys: string[]; // Keys for data dependencies
}

// Widget categories for organization
export type WidgetCategory = 
  | "metrics" 
  | "charts" 
  | "lists" 
  | "actions" 
  | "communication";

// Size to grid column span mapping
export const SIZE_TO_COLS: Record<WidgetSize, number> = {
  sm: 1,
  md: 2,
  lg: 3,
};

// Current configuration version
export const DASHBOARD_CONFIG_VERSION = 1;
