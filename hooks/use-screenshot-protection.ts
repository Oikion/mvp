"use client";

import { useEffect, useState } from "react";

/**
 * Hook to manage screenshot protection based on user preferences and organization settings
 * 
 * This hook provides:
 * - Dynamic screenshot protection toggle
 * - User preference persistence
 * - Organization-level policy enforcement
 * - Route-based protection rules
 */

interface ScreenshotProtectionConfig {
  /**
   * Is screenshot protection enabled?
   */
  enabled: boolean;
  
  /**
   * Can the user toggle protection?
   */
  userCanToggle: boolean;
  
  /**
   * Show warnings when screenshot attempts are detected?
   */
  showWarnings: boolean;
  
  /**
   * Block print functionality?
   */
  blockPrint: boolean;
  
  /**
   * Block canvas/WebGL capture?
   */
  blockCanvas: boolean;
  
  /**
   * Detect DevTools?
   */
  detectDevTools: boolean;
}

interface UseScreenshotProtectionOptions {
  /**
   * Force enable protection regardless of user preference
   */
  forceEnable?: boolean;
  
  /**
   * Routes where protection should always be enabled
   */
  protectedRoutes?: string[];
  
  /**
   * Routes where protection should be disabled
   */
  unprotectedRoutes?: string[];
}

const STORAGE_KEY = "oikion:screenshot-protection";

/**
 * Get default protection config based on environment
 */
function getDefaultConfig(): ScreenshotProtectionConfig {
  // Check environment variables for forced protection
  const forceProtection =
    process.env.NEXT_PUBLIC_FORCE_SCREENSHOT_PROTECTION === "true";
  const showWarnings =
    process.env.NEXT_PUBLIC_SCREENSHOT_PROTECTION_WARNINGS !== "false";
  
  // In production, enable by default
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    enabled: forceProtection || isProduction,
    userCanToggle: !forceProtection && !isProduction, // Allow toggle in dev unless forced
    showWarnings,
    blockPrint: true,
    blockCanvas: true,
    detectDevTools: false, // Can be annoying during development
  };
}

/**
 * Check if current route requires protection
 */
function shouldProtectRoute(
  pathname: string,
  protectedRoutes?: string[],
  unprotectedRoutes?: string[]
): boolean | null {
  // Check unprotected routes first (explicit disable)
  if (unprotectedRoutes) {
    for (const route of unprotectedRoutes) {
      if (pathname.startsWith(route)) {
        return false;
      }
    }
  }
  
  // Check protected routes (explicit enable)
  if (protectedRoutes) {
    for (const route of protectedRoutes) {
      if (pathname.startsWith(route)) {
        return true;
      }
    }
  }
  
  // No explicit rule, return null to use default
  return null;
}

export function useScreenshotProtection(
  options: UseScreenshotProtectionOptions = {}
): ScreenshotProtectionConfig & {
  toggleProtection: () => void;
  setProtection: (enabled: boolean) => void;
} {
  const [config, setConfig] = useState<ScreenshotProtectionConfig>(getDefaultConfig());
  const [pathname, setPathname] = useState("");

  // Get current pathname
  useEffect(() => {
    setPathname(globalThis.window.location.pathname);
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    if (globalThis.window === undefined) return;

    try {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userPrefs = JSON.parse(stored);
        setConfig((prev) => ({
          ...prev,
          ...userPrefs,
        }));
      }
    } catch (error) {
      console.error("[SCREENSHOT_PROTECTION] Failed to load preferences:", error);
    }
  }, []);

  // Apply route-based rules
  useEffect(() => {
    const routeProtection = shouldProtectRoute(
      pathname,
      options.protectedRoutes,
      options.unprotectedRoutes
    );

    if (routeProtection !== null) {
      setConfig((prev) => ({
        ...prev,
        enabled: routeProtection,
      }));
    }
  }, [pathname, options.protectedRoutes, options.unprotectedRoutes]);

  // Apply force enable
  useEffect(() => {
    if (options.forceEnable) {
      setConfig((prev) => ({
        ...prev,
        enabled: true,
        userCanToggle: false,
      }));
    }
  }, [options.forceEnable]);

  // Toggle protection
  const toggleProtection = () => {
    if (!config.userCanToggle) {
      console.warn("[SCREENSHOT_PROTECTION] Protection is enforced and cannot be toggled");
      return;
    }

    setConfig((prev) => {
      const newConfig = {
        ...prev,
        enabled: !prev.enabled,
      };

      // Save to localStorage
      try {
        globalThis.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            enabled: newConfig.enabled,
          })
        );
      } catch (error) {
        console.error("[SCREENSHOT_PROTECTION] Failed to save preference:", error);
      }

      return newConfig;
    });
  };

  // Set protection explicitly
  const setProtection = (enabled: boolean) => {
    if (!config.userCanToggle) {
      console.warn("[SCREENSHOT_PROTECTION] Protection is enforced and cannot be changed");
      return;
    }

    setConfig((prev) => {
      const newConfig = {
        ...prev,
        enabled,
      };

      // Save to localStorage
      try {
        globalThis.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            enabled: newConfig.enabled,
          })
        );
      } catch (error) {
        console.error("[SCREENSHOT_PROTECTION] Failed to save preference:", error);
      }

      return newConfig;
    });
  };

  return {
    ...config,
    toggleProtection,
    setProtection,
  };
}

/**
 * Predefined route configurations for common use cases
 */
export const PROTECTED_ROUTES = {
  // Always protect sensitive areas
  ALWAYS_PROTECTED: [
    "/app/crm/clients",
    "/app/crm/contacts",
    "/app/crm/accounts",
    "/app/documents",
    "/app/network/messages",
    "/app/reports",
    "/app/admin",
    "/app/platform-admin",
  ],
  
  // Never protect public areas
  NEVER_PROTECTED: [
    "/sign-in",
    "/sign-up",
    "/register",
    "/legal",
    "/",
  ],
};
