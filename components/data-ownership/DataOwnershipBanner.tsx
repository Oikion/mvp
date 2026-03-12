"use client";

import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface DataOwnershipBannerProps {
  needsSelection: boolean;
  isAdmin: boolean;
}

export function DataOwnershipBanner({
  needsSelection,
  isAdmin,
}: DataOwnershipBannerProps) {
  const t = useTranslations("dataOwnership.banner");
  const locale = useLocale();
  const router = useRouter();
  if (!needsSelection) return null;

  return (
    <Alert variant="default" className="border-amber-500/80 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-400/60">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {t("title")}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm text-amber-700 dark:text-amber-300">
          {t("description")}
        </span>
        {isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/${locale}/app/settings/data-control`)}
            className="shrink-0"
          >
            {t("chooseNow")}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground shrink-0">
            {t("askAdmin")}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
