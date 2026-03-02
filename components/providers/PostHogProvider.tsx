"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

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
 * Initialises posthog-js in the browser, identifies the Clerk user,
 * and tracks client-side page views.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_POSTHOG_KEY   — PostHog project API key
 *   NEXT_PUBLIC_POSTHOG_HOST  — PostHog host (default: https://eu.i.posthog.com)
 *
 * When NEXT_PUBLIC_POSTHOG_KEY is not set, the provider renders children
 * without initialising PostHog (safe no-op in local development).
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

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
  }, []);

  if (!POSTHOG_KEY) {
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
