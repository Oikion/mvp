/**
 * User Agent Parser Utility
 *
 * Uses Bowser (MIT licensed) for reliable user agent parsing.
 * Provides a unified interface for extracting browser, OS, and device information.
 */

import Bowser from "bowser";

export interface ParsedUserAgent {
  browserName: string | undefined;
  browserVersion: string | undefined;
  osName: string | undefined;
  osVersion: string | undefined;
  deviceType: string | undefined;
}

/**
 * Parse user agent string to extract browser, OS, and device info
 * Uses Bowser (MIT licensed) for reliable parsing
 *
 * @param userAgent - The user agent string to parse
 * @returns Parsed user agent information
 */
export function parseUserAgent(userAgent: string | undefined): ParsedUserAgent {
  if (!userAgent) {
    return {
      browserName: undefined,
      browserVersion: undefined,
      osName: undefined,
      osVersion: undefined,
      deviceType: undefined,
    };
  }

  const parsed = Bowser.parse(userAgent);

  // Determine device type
  let deviceType = "desktop";
  if (parsed.platform.type) {
    deviceType = parsed.platform.type; // mobile, tablet, desktop
  } else if (
    parsed.os.name?.toLowerCase().includes("android") ||
    parsed.os.name?.toLowerCase().includes("ios")
  ) {
    deviceType = "mobile";
  }

  return {
    browserName: parsed.browser.name || undefined,
    browserVersion: parsed.browser.version || undefined,
    osName: parsed.os.name || undefined,
    osVersion: parsed.os.version || undefined,
    deviceType,
  };
}
