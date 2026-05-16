"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useOrganization } from "@clerk/nextjs";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import { getTourSteps, getRealUserTourSteps, ACTION_REQUIRED_STEPS, REAL_USER_ACTION_REQUIRED_STEPS } from "@/lib/demo/tour-steps";
import type { Config, Driver } from "driver.js";

export function TourController() {
  const { isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete, isActionComplete } =
    useDemoMode();
  const { isLoaded: isOrgLoaded } = useOrganization();
  const locale = useLocale() as "el" | "en";
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    // Wait for Clerk organization to load before starting — isDemoMode derives from
    // organization.publicMetadata.isDemo. If we start before the org is known, the
    // effect runs with isDemoMode=false, then re-fires when the org loads and flips
    // isDemoMode to true, causing the wrong step-set to flash briefly.
    if (!isOrgLoaded) return;
    // Fire for any user with an active tour (tourStep >= 0), regardless of demo mode.
    // isDemoMode selects which step set to use, not whether the tour runs.
    if (tourStep < 0) return;

    let destroyed = false;
    // AbortController lets us clean up nav-click listeners when the effect re-runs.
    // Sidebar nav links are always in the DOM, so without abort() multiple handlers
    // would accumulate across pathname changes and fire advanceTour() multiple times.
    const abortController = new AbortController();

    async function initDriver() {
      const { driver } = await import("driver.js");
      // CSS is imported statically in globals.css — dynamic CSS imports are unreliable under Turbopack

      if (destroyed) return;

      const steps = isDemoMode ? getTourSteps(locale) : getRealUserTourSteps(locale);
      const actionRequiredSteps = isDemoMode
        ? (ACTION_REQUIRED_STEPS as readonly number[])
        : (REAL_USER_ACTION_REQUIRED_STEPS as readonly number[]);

      driverRef.current?.destroy();

      const config: Config = {
        showProgress: true,
        allowClose: true,
        steps: steps.map((s) => ({
          element: s.element,
          popover: {
            ...s.popover,
            showButtons: ["next", "previous", "close"] as ("next" | "previous" | "close")[],
          },
        })),
        onNextClick: (_el, _step, { driver: d }) => {
          const current = d.getActiveIndex() ?? 0;
          const isActionRequired =
            actionRequiredSteps.includes(current) &&
            !isActionComplete(current);
          if (isActionRequired) {
            const btn = document.querySelector(".driver-popover-next-btn") as HTMLElement | null;
            btn?.classList.add("animate-shake");
            setTimeout(() => btn?.classList.remove("animate-shake"), 400);
            return;
          }
          if (current >= steps.length - 1) {
            completeTour();
            d.destroy();
          } else {
            advanceTour();
            d.moveNext();
          }
        },
        onCloseClick: (_el, _step, { driver: d }) => {
          skipTour();
          d.destroy();
        },
        onDestroyStarted: (_el, _step, { driver: d }) => {
          if (!d.hasNextStep()) {
            completeTour();
          }
        },
      };

      const d = driver(config);
      driverRef.current = d;
      d.drive(tourStep);

      if (isDemoMode) {
        setupDemoActionListeners(markActionComplete, abortController.signal);
      } else {
        setupRealUserActionListeners(markActionComplete, advanceTour, tourStep, abortController.signal);
      }
    }

    initDriver();

    return () => {
      destroyed = true;
      driverRef.current?.destroy();
      abortController.abort();
    };
    // Re-run when pathname or isDemoMode changes so the correct step set / action gates are used.
    // isOrgLoaded prevents the double-fire race condition described above.
    // Other deps (advanceTour, completeTour, etc.) are stable useCallback refs — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep, pathname, locale, isDemoMode, isOrgLoaded]);

  return null;
}

/**
 * Real-user tour: clicking a nav link marks the action complete AND advances
 * the tour step so TourController reinitialises on the new page at the next step.
 * All listeners are tied to the AbortController signal so they're removed when
 * the effect re-runs (pathname change), preventing duplicate advanceTour() calls.
 */
function setupRealUserActionListeners(
  markActionComplete: (step: number) => void,
  advanceTour: () => void,
  currentStep: number,
  signal: AbortSignal
) {
  // Step 2 — import-nav: must navigate to the import page
  if (currentStep <= 2) {
    document.querySelector("[data-tour='import-nav']")?.addEventListener(
      "click",
      () => { markActionComplete(2); advanceTour(); },
      { once: true, signal }
    );
  }
  // Step 4 — network-nav: must navigate to the network page
  if (currentStep <= 4) {
    document.querySelector("[data-tour='network-nav']")?.addEventListener(
      "click",
      () => { markActionComplete(4); advanceTour(); },
      { once: true, signal }
    );
  }
  // Step 6 — matchmaking-nav: must navigate to the matchmaking page
  if (currentStep <= 6) {
    document.querySelector("[data-tour='matchmaking-nav']")?.addEventListener(
      "click",
      () => { markActionComplete(6); advanceTour(); },
      { once: true, signal }
    );
  }
}

function setupDemoActionListeners(markActionComplete: (step: number) => void, signal: AbortSignal) {
  document.querySelector("[data-tour='first-contact-row']")?.addEventListener(
    "click",
    () => markActionComplete(4),
    { once: true, signal }
  );

  document.querySelector("[data-tour='contact-edit-btn']")?.addEventListener(
    "click",
    () => markActionComplete(5),
    { once: true, signal }
  );

  const fileInput = document.querySelector(
    "[data-tour='import-upload-zone'] input[type='file']"
  ) as HTMLInputElement | null;
  fileInput?.addEventListener("change", () => markActionComplete(8), { once: true, signal });
}
