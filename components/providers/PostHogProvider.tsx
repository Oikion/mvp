"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { hasConsent } from "@/lib/cookie-consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// Browser-side traffic is proxied through /ingest to bypass ad blockers and
// avoid listing eu.i.posthog.com in the CSP connect-src.
// The ui_host still points directly to PostHog for the toolbar redirect.
const POSTHOG_INGEST_HOST = "/ingest";
const POSTHOG_UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

/**
 * Initialises posthog-js once and keeps the identified user in sync with Clerk.
 * Tracks page views on client-side navigation automatically.
 */
function PostHogInitialiser() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId, orgId } = useAuth();

  // Identify / reset user when auth state changes
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    if (userId) {
      posthog.identify(userId, {
        organizationId: orgId ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [userId, orgId]);

  // Track page views on navigation
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

interface PostHogProviderProps {
  readonly children: React.ReactNode;
}

/**
 * PostHog analytics provider.
 *
 * Initialises posthog-js in the browser ONLY after the user has granted
 * analytics cookie consent (GDPR). Listens for the `cookie-consent-updated`
 * CustomEvent emitted by CookieBanner so it can initialise mid-session
 * without requiring a page reload.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_POSTHOG_KEY   — PostHog project API key
 *   NEXT_PUBLIC_POSTHOG_HOST  — PostHog host (default: https://eu.posthog.com)
 *
 * When NEXT_PUBLIC_POSTHOG_KEY is not set, the provider renders children
 * without initialising PostHog (safe no-op in local development).
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const [analyticsConsented, setAnalyticsConsented] = useState(false);

  // Check consent on mount and listen for changes from CookieBanner
  useEffect(() => {
    const checkConsent = () => setAnalyticsConsented(hasConsent("analytics"));
    checkConsent();

    window.addEventListener("cookie-consent-updated", checkConsent);
    return () => window.removeEventListener("cookie-consent-updated", checkConsent);
  }, []);

  // Initialise PostHog only when analytics consent is granted
  useEffect(() => {
    if (!POSTHOG_KEY || !analyticsConsented) return;

    // Avoid re-initialising if already initialised
    if (posthog.__loaded) return;

    posthog.init(POSTHOG_KEY, {
      // Route all browser-side traffic through the /ingest reverse proxy so
      // ad blockers can't intercept it and we avoid external domains in CSP.
      api_host: POSTHOG_INGEST_HOST,
      // Toolbar redirect goes to the real PostHog UI, not the proxy.
      ui_host: POSTHOG_UI_HOST,
      // Capture page views manually (we fire them on navigation above).
      capture_pageview: false,
      // Respect browser Do Not Track setting.
      respect_dnt: true,
      // Disable session recording in development.
      disable_session_recording: process.env.NODE_ENV !== "production",
      // Cross-subdomain persistence (useful for oikion.gr + app.oikion.gr).
      persistence: "localStorage+cookie",
      // Ensure the session recorder lazy chunk is also fetched through the proxy.
      session_recording: {
        recordCrossOriginIframes: false,
      },
    });
  }, [analyticsConsented]);

  if (!POSTHOG_KEY || !analyticsConsented) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      {/* Suspense is required because PostHogInitialiser calls useSearchParams(),
          which opts out of static rendering for its subtree in the App Router. */}
      <Suspense fallback={null}>
        <PostHogInitialiser />
      </Suspense>
      {children}
    </PHProvider>
  );
}
