/**
 * Route Utilities for Navigation
 *
 * Provides consistent route matching for navigation active states.
 *
 * @example
 * ```tsx
 * import { isRouteActive, normalizePath } from "@/lib/navigation/route-utils";
 *
 * // In navigation config
 * isActive: isRouteActive(pathname, "/app/mls", locale)
 *
 * // For exact match (e.g., dashboard)
 * isActive: isRouteActive(pathname, "/app", locale, { exact: true })
 * ```
 */

/**
 * Normalize a pathname by removing locale prefix and trailing slashes
 *
 * @param pathname - The current pathname (e.g., "/el/app/mls/properties")
 * @param locale - The current locale (e.g., "el")
 * @returns Normalized path without locale or trailing slash (e.g., "/app/mls/properties")
 */
export function normalizePath(pathname: string, locale: string): string {
  let normalized = pathname;

  // Remove locale prefix if present
  const localePrefix = `/${locale}`;
  if (normalized.startsWith(localePrefix)) {
    normalized = normalized.slice(localePrefix.length);
  }

  // Ensure path starts with /
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export interface RouteActiveOptions {
  /**
   * If true, requires exact path match.
   * If false (default), matches if pathname starts with route.
   */
  exact?: boolean;
}

/**
 * Check if a route is active based on the current pathname
 *
 * Default behavior (exact: false):
 * - Returns true if the normalized pathname starts with the route
 * - Prevents partial matches (e.g., "/app/ml" won't match "/app/mls")
 *
 * Exact mode (exact: true):
 * - Returns true only if paths match exactly
 * - Used for root/dashboard routes
 *
 * @param pathname - The current pathname from router
 * @param route - The route to check (without locale, e.g., "/app/mls")
 * @param locale - The current locale
 * @param options - Optional settings for matching behavior
 * @returns true if the route should be marked as active
 *
 * @example
 * ```tsx
 * // Prefix match (default)
 * isRouteActive("/el/app/mls/properties/123", "/app/mls", "el") // true
 * isRouteActive("/el/app/crm", "/app/mls", "el") // false
 *
 * // Exact match
 * isRouteActive("/el/app", "/app", "el", { exact: true }) // true
 * isRouteActive("/el/app/mls", "/app", "el", { exact: true }) // false
 * ```
 */
export function isRouteActive(
  pathname: string,
  route: string,
  locale: string,
  options: RouteActiveOptions = {}
): boolean {
  const { exact = false } = options;

  const normalizedPathname = normalizePath(pathname, locale);
  const normalizedRoute = normalizePath(route, locale);

  if (exact) {
    return normalizedPathname === normalizedRoute;
  }

  // Prefix match with boundary check
  // Ensures "/app/ml" doesn't match "/app/mls"
  if (normalizedPathname === normalizedRoute) {
    return true;
  }

  // Check if pathname starts with route followed by a path separator
  return normalizedPathname.startsWith(`${normalizedRoute}/`);
}

/**
 * Check if any of the given routes are active
 *
 * @param pathname - The current pathname
 * @param routes - Array of routes to check
 * @param locale - The current locale
 * @returns true if any route matches
 */
export function isAnyRouteActive(
  pathname: string,
  routes: string[],
  locale: string
): boolean {
  return routes.some((route) => isRouteActive(pathname, route, locale));
}

/**
 * Get the active route from a list of routes
 *
 * Returns the most specific (longest) matching route
 *
 * @param pathname - The current pathname
 * @param routes - Array of routes to check
 * @param locale - The current locale
 * @returns The matching route or undefined
 */
export function getActiveRoute(
  pathname: string,
  routes: string[],
  locale: string
): string | undefined {
  const matches = routes.filter((route) =>
    isRouteActive(pathname, route, locale)
  );

  if (matches.length === 0) return undefined;

  // Return the most specific (longest) match
  return matches.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    matches[0]
  );
}
