"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import {
  type DashboardConfig,
  type WidgetConfig,
  type WidgetSize,
} from "./types";
import {
  DEFAULT_DASHBOARD_CONFIG,
  normalizeDashboardConfig,
} from "./widget-registry";

// Storage key for localStorage
const DASHBOARD_CONFIG_KEY = "oikion-dashboard-config";

// Context value type
interface DashboardConfigContextValue {
  config: DashboardConfig;
  isLoading: boolean;
  isHydrated: boolean;
  isEditMode: boolean;
  setIsEditMode: (editMode: boolean) => void;
  updateConfig: (config: DashboardConfig) => Promise<void>;
  updateWidgetVisibility: (widgetId: string, visible: boolean) => Promise<void>;
  updateWidgetSize: (widgetId: string, size: WidgetSize) => Promise<void>;
  reorderWidgets: (widgetIds: string[]) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

// Context
const DashboardConfigContext = createContext<DashboardConfigContextValue | null>(null);

// Provider props
interface DashboardConfigProviderProps {
  readonly children: ReactNode;
  readonly initialConfig?: DashboardConfig | null;
}

// Helper to safely get localStorage value
function getStoredConfig(): DashboardConfig | null {
  if (globalThis.window === undefined) return null;
  try {
    const stored = globalThis.localStorage.getItem(DASHBOARD_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return normalizeDashboardConfig(parsed);
    }
  } catch (error) {
    console.error("Failed to parse stored dashboard config:", error);
  }
  return null;
}

// Helper to save to localStorage
function saveStoredConfig(config: DashboardConfig): void {
  if (globalThis.window === undefined) return;
  try {
    globalThis.localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save dashboard config to localStorage:", error);
  }
}

/**
 * DashboardConfigProvider
 * 
 * Provides dashboard configuration state to the application.
 * - Accepts an initial value from server-side data
 * - Persists changes to localStorage for instant feedback
 * - Syncs changes to the database via API
 */
export function DashboardConfigProvider({
  children,
  initialConfig,
}: DashboardConfigProviderProps) {
  // Track hydration and loading state
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize with server-provided config or default
  const [config, setConfig] = useState<DashboardConfig>(() =>
    normalizeDashboardConfig(initialConfig)
  );

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // After hydration, check localStorage for any cached preference
  useEffect(() => {
    if (isHydrated) {
      const stored = getStoredConfig();
      if (stored) {
        // Use localStorage version if it's newer
        const storedTime = new Date(stored.updatedAt).getTime();
        const currentTime = new Date(config.updatedAt).getTime();
        if (storedTime > currentTime) {
          setConfig(stored);
        }
      }
    }
    // Only run when isHydrated changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Update config with optimistic update and API sync
  const updateConfig = useCallback(async (newConfig: DashboardConfig) => {
    const previousConfig = config;
    const configWithTimestamp = {
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setConfig(configWithTimestamp);
    saveStoredConfig(configWithTimestamp);
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dashboardConfig: configWithTimestamp }),
      });

      if (!response.ok) {
        throw new Error("Failed to update dashboard config");
      }
    } catch (error) {
      // Rollback on error
      console.error("Failed to save dashboard config:", error);
      setConfig(previousConfig);
      saveStoredConfig(previousConfig);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Update single widget visibility
  const updateWidgetVisibility = useCallback(
    async (widgetId: string, visible: boolean) => {
      const newWidgets = config.widgets.map((w) =>
        w.id === widgetId ? { ...w, visible } : w
      );
      await updateConfig({ ...config, widgets: newWidgets });
    },
    [config, updateConfig]
  );

  // Update single widget size
  const updateWidgetSize = useCallback(
    async (widgetId: string, size: WidgetSize) => {
      const newWidgets = config.widgets.map((w) =>
        w.id === widgetId ? { ...w, size } : w
      );
      await updateConfig({ ...config, widgets: newWidgets });
    },
    [config, updateConfig]
  );

  // Reorder widgets by providing new order of widget IDs
  const reorderWidgets = useCallback(
    async (widgetIds: string[]) => {
      const widgetMap = new Map<string, WidgetConfig>();
      for (const widget of config.widgets) {
        widgetMap.set(widget.id, widget);
      }

      const newWidgets: WidgetConfig[] = [];
      let order = 0;

      // Add widgets in new order
      for (const id of widgetIds) {
        const widget = widgetMap.get(id);
        if (widget) {
          newWidgets.push({ ...widget, order: order++ });
          widgetMap.delete(id);
        }
      }

      // Add any remaining widgets (shouldn't happen, but just in case)
      for (const widget of Array.from(widgetMap.values())) {
        newWidgets.push({ ...widget, order: order++ });
      }

      await updateConfig({ ...config, widgets: newWidgets });
    },
    [config, updateConfig]
  );

  // Reset to default configuration
  const resetToDefault = useCallback(async () => {
    await updateConfig({
      ...DEFAULT_DASHBOARD_CONFIG,
      updatedAt: new Date().toISOString(),
    });
  }, [updateConfig]);

  // Memoize context value
  const value = useMemo(
    () => ({
      config,
      isLoading,
      isHydrated,
      isEditMode,
      setIsEditMode,
      updateConfig,
      updateWidgetVisibility,
      updateWidgetSize,
      reorderWidgets,
      resetToDefault,
    }),
    [
      config,
      isLoading,
      isHydrated,
      isEditMode,
      setIsEditMode,
      updateConfig,
      updateWidgetVisibility,
      updateWidgetSize,
      reorderWidgets,
      resetToDefault,
    ]
  );

  return (
    <DashboardConfigContext.Provider value={value}>
      {children}
    </DashboardConfigContext.Provider>
  );
}

/**
 * useDashboardConfig
 * 
 * Hook to access and modify the user's dashboard configuration.
 * Must be used within a DashboardConfigProvider.
 */
export function useDashboardConfig(): DashboardConfigContextValue {
  const context = useContext(DashboardConfigContext);

  if (!context) {
    throw new Error(
      "useDashboardConfig must be used within a DashboardConfigProvider"
    );
  }

  return context;
}
