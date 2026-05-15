"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import { getTourSteps, ACTION_REQUIRED_STEPS } from "@/lib/demo/tour-steps";
import type { Config, Driver } from "driver.js";

export function TourController() {
  const { isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete, isActionComplete } =
    useDemoMode();
  const locale = useLocale() as "el" | "en";
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!isDemoMode || tourStep < 0) return;

    let destroyed = false;

    async function initDriver() {
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      if (destroyed) return;

      const steps = getTourSteps(locale);

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
            (ACTION_REQUIRED_STEPS as readonly number[]).includes(current) &&
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

      setupActionListeners(markActionComplete);
    }

    initDriver();

    return () => {
      destroyed = true;
      driverRef.current?.destroy();
    };
    // Re-run when pathname changes so Driver.js targets exist in the new page's DOM
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, pathname, locale]);

  return null;
}

function setupActionListeners(markActionComplete: (step: number) => void) {
  document.querySelector("[data-tour='first-contact-row']")?.addEventListener(
    "click",
    () => markActionComplete(4),
    { once: true }
  );

  document.querySelector("[data-tour='contact-edit-btn']")?.addEventListener(
    "click",
    () => markActionComplete(5),
    { once: true }
  );

  const fileInput = document.querySelector(
    "[data-tour='import-upload-zone'] input[type='file']"
  ) as HTMLInputElement | null;
  fileInput?.addEventListener("change", () => markActionComplete(8), { once: true });
}
