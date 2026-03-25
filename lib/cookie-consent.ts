/**
 * lib/cookie-consent.ts
 *
 * Cookie consent state management for GDPR compliance.
 * Stores consent preferences in a first-party cookie (`oikion_consent_prefs`).
 *
 * Categories:
 *  - essential: Always on (Clerk session, locale, sidebar state)
 *  - analytics: PostHog product analytics (opt-in)
 */

export type ConsentCategory = "essential" | "analytics";

export interface ConsentPreferences {
  essential: true; // always true, cannot be disabled
  analytics: boolean;
  /** ISO timestamp when consent was last updated */
  updatedAt: string;
}

const COOKIE_NAME = "oikion_consent_prefs";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true,
  analytics: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Read current consent preferences from the cookie.
 * Returns null if no consent has been given yet (banner should show).
 */
export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  try {
    const value = decodeURIComponent(match.split("=")[1]);
    const parsed = JSON.parse(value) as ConsentPreferences;
    // Ensure essential is always true regardless of stored value
    return { ...parsed, essential: true };
  } catch {
    return null;
  }
}

/**
 * Save consent preferences to cookie.
 */
export function setConsentPreferences(prefs: Omit<ConsentPreferences, "essential" | "updatedAt">): void {
  if (typeof document === "undefined") return;

  const preferences: ConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    updatedAt: new Date().toISOString(),
  };

  const value = encodeURIComponent(JSON.stringify(preferences));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Accept all cookie categories.
 */
export function acceptAllCookies(): ConsentPreferences {
  const prefs = { analytics: true };
  setConsentPreferences(prefs);
  return { essential: true, analytics: true, updatedAt: new Date().toISOString() };
}

/**
 * Accept only essential cookies (reject analytics).
 */
export function rejectNonEssentialCookies(): ConsentPreferences {
  const prefs = { analytics: false };
  setConsentPreferences(prefs);
  return { essential: true, analytics: false, updatedAt: new Date().toISOString() };
}

/**
 * Check if a specific consent category has been granted.
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === "essential") return true;
  const prefs = getConsentPreferences();
  if (!prefs) return false;
  return prefs[category] === true;
}

/**
 * Check if user has made any consent choice (banner already dismissed).
 */
export function hasConsentBeenGiven(): boolean {
  return getConsentPreferences() !== null;
}

export { DEFAULT_PREFERENCES };
