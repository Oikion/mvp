/**
 * Dashboard widget customization types
 */

// Grid layout position
export interface GridPosition {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

// Responsive layouts for react-grid-layout
export interface ResponsiveLayouts {
  lg: GridPosition[];
  md: GridPosition[];
  sm: GridPosition[];
  xs: GridPosition[];
  xxs: GridPosition[];
}

// Widget settings (visibility, etc.)
export interface WidgetSettings {
  visible: boolean;
}

// Combined widget config with settings and metadata
export interface WidgetConfig extends WidgetSettings {
  id: string;
  metadata?: WidgetMetadata;
  static?: boolean;
}

// Dashboard Configuration
export interface DashboardConfig {
  layouts: ResponsiveLayouts;
  widgets: Record<string, WidgetSettings>;
  updatedAt: string;
}

// Widget metadata for the registry
export interface WidgetMetadata {
  id: string;
  nameKey: string; // Translation key for widget name
  descriptionKey: string; // Translation key for description
  icon: string; // Lucide icon name
  // Grid dimensions (48-column system)
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
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
