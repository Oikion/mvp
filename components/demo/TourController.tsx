"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "@/navigation";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import {
  getTourSteps,
  getRealUserTourSteps,
  ACTION_REQUIRED_STEPS,
  REAL_USER_ACTION_REQUIRED_STEPS,
} from "@/lib/demo/tour-steps";
import type { Config, Driver } from "driver.js";

/**
 * When Next is clicked on these demo-mode steps, the tour navigates to the
 * corresponding route before advancing. The element on each step is a sidebar
 * nav link — instead of requiring a click on the link itself, Next acts as the
 * navigation trigger so the UX stays linear.
 */
const DEMO_NAV_STEPS: Record<number, string> = {
  1: "/app/import/add",
  4: "/app/matchmaking",
  6: "/app/network/feed",
};

/**
 * Waits for a CSS selector to appear in the DOM, up to `timeout` ms.
 * Used for demo-mode steps that follow a page navigation — the RSC page content
 * may stream in slightly after the pathname change commits.
 */
function waitForElement(selector: string, timeout = 500): Promise<boolean> {
  if (document.querySelector(selector)) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, timeout);
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function TourController() {
  const {
    isDemoMode,
    tourStep,
    advanceTour,
    completeTour,
    skipTour,
    markActionComplete,
    isActionComplete,
  } = useDemoMode();
  const { isLoaded: isOrgLoaded } = useOrganization();
  const locale = useLocale() as "el" | "en";
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);

  // Always-current refs — read inside async callbacks and cleanups without
  // making them effect dependencies.
  const tourStepRef = useRef(tourStep);
  tourStepRef.current = tourStep;
  const isDemoModeRef = useRef(isDemoMode);
  isDemoModeRef.current = isDemoMode;
  const routerRef = useRef(router);
  routerRef.current = router;

  // When true, the cleanup should NOT destroy the driver — a d.moveNext() call
  // already advanced it smoothly and the driver should survive the re-render.
  const isAdvancingRef = useRef(false);

  // Incremented when restartTour() resets the step to 0 — triggers the main
  // driver effect to reinitialise even if pathname/locale/mode didn't change.
  const [reinitKey, setReinitKey] = useState(0);
  const prevTourStepRef = useRef(tourStep);

  // ─── Monitor tourStep for lifecycle events ─────────────────────────────────
  useEffect(() => {
    const prev = prevTourStepRef.current;
    prevTourStepRef.current = tourStep;

    if (tourStep < 0) {
      // Tour ended (completed or skipped) — destroy driver immediately.
      isAdvancingRef.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
    } else if (tourStep === 0 && prev !== 0 && isOrgLoaded) {
      // Tour restarted — trigger main effect reinit.
      setReinitKey((k) => k + 1);
    }
    // Normal step advances (prev → prev+1) are handled by d.moveNext() and
    // don't need a reinit — isAdvancingRef gates the cleanup.
  }, [tourStep, isOrgLoaded]);

  // ─── Main driver effect ────────────────────────────────────────────────────
  // Does NOT depend on tourStep — step changes go through d.moveNext() without
  // tearing down and recreating the driver (which causes the visible flicker).
  // Reinitialises when: page navigates (demo-mode elements change), locale
  // or isDemoMode switches, org loads, or the tour is restarted (reinitKey).
  useEffect(() => {
    if (!isOrgLoaded) return;
    if (tourStepRef.current < 0) return;

    // Driver survived a step advance (isAdvancingRef was true in previous cleanup).
    // Just re-attach action listeners for the new step — no full reinit needed.
    if (driverRef.current) {
      const abortController = new AbortController();
      if (isDemoModeRef.current) {
        setupDemoActionListeners(markActionComplete, abortController.signal);
      }
      return () => {
        if (!isAdvancingRef.current) {
          driverRef.current?.destroy();
          driverRef.current = null;
        }
        isAdvancingRef.current = false;
        abortController.abort();
      };
    }

    // Full initialisation path.
    let destroyed = false;
    const abortController = new AbortController();

    async function initDriver() {
      const { driver } = await import("driver.js");
      // CSS is imported statically in globals.css — dynamic CSS imports are unreliable under Turbopack

      if (destroyed) return;

      const step = tourStepRef.current;
      if (step < 0) return;

      const steps = isDemoModeRef.current
        ? getTourSteps(locale)
        : getRealUserTourSteps(locale);
      const actionRequiredSteps = isDemoModeRef.current
        ? (ACTION_REQUIRED_STEPS as readonly number[])
        : (REAL_USER_ACTION_REQUIRED_STEPS as readonly number[]);

      // For demo-mode steps that follow a navigation, wait briefly for RSC
      // content to commit before querying the element.
      const targetElement = steps[step]?.element;
      if (targetElement && isDemoModeRef.current) {
        await waitForElement(targetElement);
      }

      if (destroyed) return;

      driverRef.current?.destroy();

      // For the real-user tour, degrade any step whose target element isn't
      // in the DOM (e.g. user lacks access to matchmaking/network/import)
      // to a fullscreen step rather than a broken centred highlight.
      const configSteps = steps.map((s) => ({
        element:
          isDemoModeRef.current || !s.element || document.querySelector(s.element)
            ? s.element
            : undefined,
        popover: {
          ...s.popover,
          showButtons: ["next", "previous", "close"] as (
            | "next"
            | "previous"
            | "close"
          )[],
        },
      }));

      const config: Config = {
        showProgress: true,
        allowClose: true,
        steps: configSteps,
        // Scroll the highlighted element into view before the popover positions.
        // Uses "instant" so the scroll completes synchronously — smooth scrolling
        // would let the popover position before the element is in the viewport.
        onHighlightStarted: (element) => {
          element?.scrollIntoView({ block: "center", behavior: "instant" });
        },
        onNextClick: (_el, _step, { driver: d }) => {
          // d.getActiveIndex() can return undefined when the step's element
          // wasn't found — fall back to our own ref which is always accurate.
          const current = d.getActiveIndex() ?? tourStepRef.current;
          const isActionRequired =
            actionRequiredSteps.includes(current) && !isActionComplete(current);
          if (isActionRequired) {
            const btn = document.querySelector(
              ".driver-popover-next-btn"
            ) as HTMLElement | null;
            btn?.classList.add("animate-shake");
            setTimeout(() => btn?.classList.remove("animate-shake"), 400);
            return;
          }

          // For demo-mode nav steps, Next navigates to the target route so the
          // user doesn't need to click the sidebar link manually.
          if (isDemoModeRef.current && current in DEMO_NAV_STEPS) {
            const route = DEMO_NAV_STEPS[current];
            if (route) routerRef.current.push(route as Parameters<typeof routerRef.current.push>[0]);
          }

          if (current >= steps.length - 1) {
            completeTour();
            d.destroy();
          } else {
            // Signal cleanup to preserve the driver — d.moveNext() handles
            // the visual transition without a destroy/recreate cycle.
            isAdvancingRef.current = true;
            advanceTour();
            d.moveNext();
          }
        },
        onCloseClick: (_el, _step, { driver: d }) => {
          skipTour();
          d.destroy();
        },
      };

      const d = driver(config);
      driverRef.current = d;
      d.drive(step);

      if (isDemoModeRef.current) {
        setupDemoActionListeners(markActionComplete, abortController.signal);
      }
    }

    initDriver();

    return () => {
      destroyed = true;
      if (!isAdvancingRef.current) {
        driverRef.current?.destroy();
        driverRef.current = null;
      }
      isAdvancingRef.current = false;
      abortController.abort();
    };
    // tourStep deliberately excluded — d.moveNext() advances the driver in-place.
    // reinitKey fires when restartTour() resets the step while on the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale, isDemoMode, isOrgLoaded, reinitKey]);

  return null;
}

function setupDemoActionListeners(
  markActionComplete: (step: number) => void,
  signal: AbortSignal
) {
  // Step 2: user selects a file in the upload zone (the only genuine action gate)
  const fileInput = document.querySelector(
    "[data-tour='import-upload-zone'] input[type='file']"
  ) as HTMLInputElement | null;
  fileInput?.addEventListener("change", () => markActionComplete(2), {
    once: true,
    signal,
  });
}
