"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import { LayoutPreference } from "@prisma/client";

// Storage key for localStorage
const LAYOUT_PREFERENCE_KEY = "oikion-layout-preference";

// Types
export type LayoutPreferenceValue = LayoutPreference;

interface LayoutPreferenceContextValue {
  layout: LayoutPreferenceValue;
  setLayout: (layout: LayoutPreferenceValue) => Promise<void>;
  isLoading: boolean;
  isHydrated: boolean;
}

// Context
const LayoutPreferenceContext = createContext<LayoutPreferenceContextValue | null>(null);

// Provider props
interface LayoutPreferenceProviderProps {
  readonly children: React.ReactNode;
  readonly initialLayout?: LayoutPreferenceValue;
}

// Helper to safely get localStorage value
function getStoredLayout(): LayoutPreferenceValue | null {
  if (globalThis.window === undefined) return null;
  const stored = globalThis.localStorage.getItem(LAYOUT_PREFERENCE_KEY);
  if (stored === "DEFAULT" || stored === "WIDE") {
    return stored;
  }
  return null;
}

/**
 * LayoutPreferenceProvider
 * 
 * Provides layout preference state to the application.
 * - Accepts an initial value from server-side data
 * - Persists changes to localStorage for instant feedback
 * - Syncs changes to the database via API
 * - Uses useSyncExternalStore for hydration-safe localStorage access
 */
export function LayoutPreferenceProvider({
  children,
  initialLayout = "DEFAULT",
}: LayoutPreferenceProviderProps) {
  // Track hydration state
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the server-provided initial value as the canonical source
  // Only switch to localStorage after hydration is complete
  const [layout, setLayoutState] = useState<LayoutPreferenceValue>(initialLayout);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // After hydration, check localStorage for any cached preference
  // This runs only once after hydration to sync with any locally stored value
  useEffect(() => {
    if (isHydrated) {
      const stored = getStoredLayout();
      if (stored && stored !== layout) {
        setLayoutState(stored);
      }
    }
    // Only run when isHydrated changes, not when layout changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Set layout with optimistic update and API sync
  const setLayout = useCallback(async (newLayout: LayoutPreferenceValue) => {
    const previousLayout = layout;
    
    // Optimistic update
    setLayoutState(newLayout);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem(LAYOUT_PREFERENCE_KEY, newLayout);
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ layoutPreference: newLayout }),
      });

      if (!response.ok) {
        throw new Error("Failed to update layout preference");
      }
    } catch (error) {
      // Rollback on error
      console.error("Failed to save layout preference:", error);
      setLayoutState(previousLayout);
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(LAYOUT_PREFERENCE_KEY, previousLayout);
      }
    } finally {
      setIsLoading(false);
    }
  }, [layout]);

  // Memoize context value
  const value = useMemo(
    () => ({
      layout,
      setLayout,
      isLoading,
      isHydrated,
    }),
    [layout, setLayout, isLoading, isHydrated]
  );

  return (
    <LayoutPreferenceContext.Provider value={value}>
      {children}
    </LayoutPreferenceContext.Provider>
  );
}

/**
 * useLayoutPreference
 * 
 * Hook to access and modify the user's layout preference.
 * Must be used within a LayoutPreferenceProvider.
 * 
 * @returns {LayoutPreferenceContextValue} The layout preference context value
 * @throws {Error} If used outside of LayoutPreferenceProvider
 * 
 * @example
 * const { layout, setLayout, isLoading, isHydrated } = useLayoutPreference();
 * 
 * // Toggle layout
 * const toggleLayout = () => {
 *   setLayout(layout === "DEFAULT" ? "WIDE" : "DEFAULT");
 * };
 */
export function useLayoutPreference(): LayoutPreferenceContextValue {
  const context = useContext(LayoutPreferenceContext);
  
  if (!context) {
    throw new Error(
      "useLayoutPreference must be used within a LayoutPreferenceProvider"
    );
  }
  
  return context;
}

/**
 * Helper to get CSS classes for the current layout
 */
export function getLayoutClasses(layout: LayoutPreferenceValue): string {
  if (layout === "WIDE") {
    return "w-full";
  }
  // DEFAULT - centered with max-width
  return "max-w-7xl mx-auto";
}
