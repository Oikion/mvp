/**
 * Centralized App Version Configuration
 * 
 * This file provides a single source of truth for the app version.
 * All components should import from here instead of directly accessing
 * the environment variable.
 * 
 * To change the version:
 * 1. Set NEXT_PUBLIC_APP_V in your .env.local file
 * 2. The package.json version will automatically sync when you run dev/build/start
 * 3. Or update the DEFAULT_VERSION constant below for development
 * 
 * Version format: MAJOR.MINOR.PATCH-STAGE
 * Examples: "0.1.0-alpha", "1.0.0-beta", "2.0.0"
 * 
 * Note: The package.json version is automatically synced from NEXT_PUBLIC_APP_V
 * via scripts/sync-version.js before running dev/build/start commands.
 */

// Default version used when NEXT_PUBLIC_APP_V is not set
const DEFAULT_VERSION = "0.1.0-alpha";

/**
 * The current app version, read from NEXT_PUBLIC_APP_V environment variable
 * Falls back to DEFAULT_VERSION if not set
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_V || DEFAULT_VERSION;

/**
 * Formats the version string for display
 * Handles edge cases like extra spaces or dots
 */
export function formatVersion(version: string = APP_VERSION): string {
  // Replace spaces with dots and clean up multiple dots
  return version.replace(/\s+/g, ".").replace(/\.+/g, ".");
}

/**
 * Returns the version with a 'v' prefix (e.g., "v0.1.0-alpha")
 */
export function getVersionWithPrefix(): string {
  return `v${APP_VERSION}`;
}

/**
 * Parses version into its components
 */
export function parseVersion(version: string = APP_VERSION): {
  major: number;
  minor: number;
  patch: number;
  stage: string | null;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, stage: null };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    stage: match[4] || null,
  };
}
