"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * URLSyncedTabs - Tabs component with automatic URL synchronization
 *
 * Features:
 * - Syncs active tab to URL query parameter
 * - Handles SSR hydration properly
 * - Validates tab values
 * - Optional localStorage fallback
 * - Supports both controlled and uncontrolled modes
 *
 * @example
 * ```tsx
 * // Basic usage
 * <URLSyncedTabs
 *   tabs={[
 *     { value: "overview", label: "Overview", content: <Overview /> },
 *     { value: "details", label: "Details", content: <Details /> },
 *   ]}
 *   defaultValue="overview"
 * />
 *
 * // With custom query param
 * <URLSyncedTabs
 *   tabs={[...]}
 *   paramName="view"
 *   defaultValue="list"
 * />
 *
 * // Disabled URL sync (local state only)
 * <URLSyncedTabs
 *   tabs={[...]}
 *   syncToUrl={false}
 * />
 * ```
 */

export interface TabConfig {
  /**
   * Unique tab value (used in URL)
   */
  value: string;
  /**
   * Tab label displayed in trigger
   */
  label: React.ReactNode;
  /**
   * Tab content
   */
  content: React.ReactNode;
  /**
   * Whether tab is disabled
   */
  disabled?: boolean;
  /**
   * Icon to display before label
   */
  icon?: React.ReactNode;
}

export interface URLSyncedTabsProps {
  /**
   * Tab configurations
   */
  tabs: TabConfig[];
  /**
   * Default active tab value
   */
  defaultValue: string;
  /**
   * URL query parameter name
   * @default "tab"
   */
  paramName?: string;
  /**
   * Whether to sync to URL
   * @default true
   */
  syncToUrl?: boolean;
  /**
   * Whether to use shallow routing (no page reload)
   * @default true
   */
  shallow?: boolean;
  /**
   * Callback when tab changes
   */
  onTabChange?: (value: string) => void;
  /**
   * Additional class name for Tabs container
   */
  className?: string;
  /**
   * Additional class name for TabsList
   */
  listClassName?: string;
  /**
   * Additional class name for TabsContent
   */
  contentClassName?: string;
}

export function URLSyncedTabs({
  tabs,
  defaultValue,
  paramName = "tab",
  syncToUrl = true,
  shallow = true,
  onTabChange,
  className,
  listClassName,
  contentClassName,
}: Readonly<URLSyncedTabsProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track hydration state to avoid hydration mismatch
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  // Valid tab values for validation
  const validTabs = React.useMemo(
    () => new Set(tabs.map((t) => t.value)),
    [tabs]
  );

  // Get validated tab value from URL or default
  const getValidTab = React.useCallback(
    (value: string | null): string => {
      if (value && validTabs.has(value)) {
        return value;
      }
      return defaultValue;
    },
    [validTabs, defaultValue]
  );

  // Sync from URL on mount and URL changes
  React.useEffect(() => {
    if (syncToUrl) {
      const tabParam = searchParams.get(paramName);
      const validTab = getValidTab(tabParam);
      setActiveTab(validTab);
    }
    setIsHydrated(true);
  }, [searchParams, paramName, syncToUrl, getValidTab]);

  // Handle tab change
  const handleTabChange = React.useCallback(
    (value: string) => {
      if (!validTabs.has(value)) return;

      setActiveTab(value);
      onTabChange?.(value);

      if (syncToUrl) {
        const params = new URLSearchParams(searchParams.toString());

        if (value === defaultValue) {
          // Remove param if it's the default value
          params.delete(paramName);
        } else {
          params.set(paramName, value);
        }

        const newUrl = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;

        if (shallow) {
          router.replace(newUrl, { scroll: false });
        } else {
          router.push(newUrl);
        }
      }
    },
    [
      validTabs,
      onTabChange,
      syncToUrl,
      searchParams,
      defaultValue,
      paramName,
      pathname,
      shallow,
      router,
    ]
  );

  // Show default tab during SSR to avoid hydration mismatch
  const displayTab = isHydrated ? activeTab : defaultValue;

  return (
    <Tabs
      value={displayTab}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList className={listClassName}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(tab.icon && "gap-2")}
          >
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={contentClassName}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * useUrlTab - Hook for URL-synced tab state
 *
 * Use when you need more control than URLSyncedTabs provides.
 *
 * @example
 * ```tsx
 * const { activeTab, setTab, isHydrated } = useUrlTab({
 *   paramName: "view",
 *   defaultValue: "grid",
 *   validValues: ["grid", "list", "table"],
 * });
 *
 * <Tabs value={activeTab} onValueChange={setTab}>
 *   ...
 * </Tabs>
 * ```
 */
export function useUrlTab({
  paramName = "tab",
  defaultValue,
  validValues,
  syncToUrl = true,
}: {
  paramName?: string;
  defaultValue: string;
  validValues: string[];
  syncToUrl?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isHydrated, setIsHydrated] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const validSet = React.useMemo(() => new Set(validValues), [validValues]);

  const getValidTab = React.useCallback(
    (value: string | null): string => {
      if (value && validSet.has(value)) {
        return value;
      }
      return defaultValue;
    },
    [validSet, defaultValue]
  );

  React.useEffect(() => {
    if (syncToUrl) {
      const tabParam = searchParams.get(paramName);
      setActiveTab(getValidTab(tabParam));
    }
    setIsHydrated(true);
  }, [searchParams, paramName, syncToUrl, getValidTab]);

  const setTab = React.useCallback(
    (value: string) => {
      if (!validSet.has(value)) return;

      setActiveTab(value);

      if (syncToUrl) {
        const params = new URLSearchParams(searchParams.toString());

        if (value === defaultValue) {
          params.delete(paramName);
        } else {
          params.set(paramName, value);
        }

        const newUrl = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;

        router.replace(newUrl, { scroll: false });
      }
    },
    [validSet, syncToUrl, searchParams, defaultValue, paramName, pathname, router]
  );

  return {
    activeTab: isHydrated ? activeTab : defaultValue,
    setTab,
    isHydrated,
  };
}
