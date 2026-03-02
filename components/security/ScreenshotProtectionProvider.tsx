"use client";

import { ScreenshotBlocker } from "./ScreenshotBlocker";
import { useScreenshotProtection, PROTECTED_ROUTES } from "@/hooks/use-screenshot-protection";

/**
 * ScreenshotProtectionProvider Component
 * 
 * Wraps the ScreenshotBlocker with user preference management and route-based rules.
 * 
 * Usage:
 * ```tsx
 * <ScreenshotProtectionProvider>
 *   {children}
 * </ScreenshotProtectionProvider>
 * ```
 * 
 * Or with custom options:
 * ```tsx
 * <ScreenshotProtectionProvider
 *   forceEnable={true}
 *   protectedRoutes={["/sensitive-area"]}
 * />
 * ```
 */

interface ScreenshotProtectionProviderProps {
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
  
  /**
   * Show warnings when screenshot attempts are detected
   */
  showWarnings?: boolean;
  
  /**
   * Custom warning message
   */
  warningMessage?: string;
}

export function ScreenshotProtectionProvider({
  forceEnable,
  protectedRoutes = PROTECTED_ROUTES.ALWAYS_PROTECTED,
  unprotectedRoutes = PROTECTED_ROUTES.NEVER_PROTECTED,
  showWarnings = true,
  warningMessage = "Screenshots are not allowed in this area for security and privacy reasons.",
}: ScreenshotProtectionProviderProps) {
  const config = useScreenshotProtection({
    forceEnable,
    protectedRoutes,
    unprotectedRoutes,
  });

  return (
    <ScreenshotBlocker
      enabled={config.enabled}
      showWarnings={showWarnings && config.showWarnings}
      warningMessage={warningMessage}
      blockPrint={config.blockPrint}
      blockCanvas={config.blockCanvas}
      detectDevTools={config.detectDevTools}
    />
  );
}
