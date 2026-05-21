"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { useRouter } from "@/navigation";
import { useDemoMode } from "@/components/demo/DemoModeProvider";

export function TourTriggerButton() {
  const t = useTranslations("common");
  const { restartTour } = useDemoMode();
  const router = useRouter();

  const handleClick = async () => {
    // Navigate to dashboard first so step 0 starts in the right context.
    // restartTour() resets step to 0 and clears completed actions; the
    // TourController re-initialises the driver when the pathname changes.
    router.push("/app");
    await restartTour();
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors group-data-[collapsible=icon]:hidden"
      aria-label={t("buttons.startTour")}
    >
      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("buttons.startTour")}</span>
    </button>
  );
}
