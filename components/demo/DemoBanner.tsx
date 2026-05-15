"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useDemoMode } from "@/components/demo/DemoModeProvider";

export function DemoBanner() {
  const { isDemoMode, tourStep } = useDemoMode();
  const locale = useLocale();

  if (!isDemoMode) return null;

  const isGreek = locale === "el";
  const inTour = tourStep >= 0;

  return (
    <div className="sticky top-[var(--nav-height,56px)] z-40 flex items-center justify-between gap-4 border-b bg-muted/60 px-4 py-2 text-sm backdrop-blur-sm">
      <span className="text-muted-foreground">
        {isGreek
          ? inTour
            ? "Demo χώρος εργασίας · Τα δεδομένα δεν αποθηκεύονται."
            : "Demo χώρος εργασίας"
          : inTour
            ? "Demo workspace · Your data is not saved."
            : "Demo workspace"}
      </span>
      <Link
        href={`/${locale}/app/create-organization`}
        data-tour="demo-banner-cta"
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {isGreek ? "Δημιούργησε τον οργανισμό σου →" : "Create my agency →"}
      </Link>
    </div>
  );
}
