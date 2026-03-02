/**
 * PostHog server-side client
 *
 * Singleton Node.js client used in Server Actions and API routes to:
 * - Track server-side events
 * - Evaluate feature flags without a browser round-trip
 * - Run A/B experiment assignments on the server (no flicker)
 *
 * Set POSTHOG_API_KEY in your environment variables.
 * Get the key from: https://app.posthog.com/project/settings
 */

import { PostHog } from "posthog-node";

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let _client: PostHog | null = null;

/**
 * Returns a PostHog Node.js client singleton.
 * Returns null if POSTHOG_API_KEY is not configured (analytics is optional).
 */
export function getPostHogClient(): PostHog | null {
  if (!POSTHOG_API_KEY) {
    return null;
  }

  _client ??= new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    // Flush events immediately in serverless environments so they are not
    // lost when the function shuts down between requests.
    flushAt: 1,
    flushInterval: 0,
  });

  return _client;
}

/**
 * Evaluate a feature flag for a specific user on the server side.
 * Returns the variant string or boolean, or null if PostHog is not configured.
 *
 * @example
 * const variant = await getFeatureFlag('onboarding-cta', userId);
 * // variant === 'control' | 'variant-a' | null
 */
export async function getFeatureFlag(
  flagKey: string,
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<string | boolean | null> {
  const client = getPostHogClient();
  if (!client) return null;

  try {
    const value = await client.getFeatureFlag(flagKey, distinctId, {
      personProperties: properties as Record<string, string>,
    });
    return value ?? null;
  } catch {
    return null;
  }
}

/**
 * Track a server-side event.
 * Fire-and-forget; does not throw on failure.
 *
 * @example
 * trackEvent(userId, 'property_created', { propertyType: 'apartment', organizationId });
 */
export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({ distinctId, event, properties: properties ?? {} });
}
