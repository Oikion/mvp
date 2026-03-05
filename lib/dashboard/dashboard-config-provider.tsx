"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  type DashboardConfig,
  type ResponsiveLayouts,
} from "./types";
import {
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
  updateLayouts: (layouts: ResponsiveLayouts) => Promise<void>;
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [config, setConfig] = useState<DashboardConfig>(() =>
    normalizeDashboardConfig(initialConfig)
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      const stored = getStoredConfig();
      if (stored) {
        const storedTime = new Date(stored.updatedAt).getTime();
        const currentTime = new Date(config.updatedAt).getTime();
        if (storedTime > currentTime) {
          setConfig(stored);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  const updateConfig = useCallback(async (newConfig: DashboardConfig) => {
    const previousConfig = config;
    const configWithTimestamp = {
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };

    setConfig(configWithTimestamp);
    saveStoredConfig(configWithTimestamp);
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardConfig: configWithTimestamp }),
      });

      if (!response.ok) {
        throw new Error("Failed to update dashboard config");
      }
    } catch (error) {
      console.error("Failed to save dashboard config:", error);
      setConfig(previousConfig);
      saveStoredConfig(previousConfig);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const updateWidgetVisibility = useCallback(
    async (widgetId: string, visible: boolean) => {
      const newWidgets = { ...config.widgets };
      newWidgets[widgetId] = { ...newWidgets[widgetId], visible };
      await updateConfig({ ...config, widgets: newWidgets });
    },
    [config, updateConfig]
  );

  const updateLayouts = useCallback(
    async (layouts: ResponsiveLayouts) => {
      await updateConfig({ ...config, layouts });
    },
    [config, updateConfig]
  );

  const resetToDefault = useCallback(async () => {
    if (globalThis.window !== undefined) {
      try {
        globalThis.localStorage.removeItem(DASHBOARD_CONFIG_KEY);
        Object.keys(globalThis.localStorage)
          .filter(key => key.startsWith('dashboard-') || key.includes('widget'))
          .forEach(key => {
            try { globalThis.localStorage.removeItem(key); } catch (e) { console.warn(`Failed to remove ${key}:`, e); }
          });
      } catch (error) {
        console.error("Failed to clear dashboard cache:", error);
      }
    }
    const freshConfig = normalizeDashboardConfig(null);
    await updateConfig(freshConfig);
  }, [updateConfig]);

  const value = useMemo(
    () => ({
      config,
      isLoading,
      isHydrated,
      isEditMode,
      setIsEditMode,
      updateConfig,
      updateWidgetVisibility,
      updateLayouts,
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
      updateLayouts,
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
