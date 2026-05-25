"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/navigation";

interface DataOwnershipBannerProps {
  needsSelection: boolean;
  isAdmin: boolean;
}

export function DataOwnershipBanner({
  needsSelection,
  isAdmin,
}: DataOwnershipBannerProps) {
  const t = useTranslations("dataOwnership.banner");
  const router = useRouter();
  if (!needsSelection) return null;

  return (
    <Alert variant="default" className="border-warning/60 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">
        {t("title")}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm text-warning/80">
          {t("description")}
        </span>
        {isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/app/settings/data-control")}
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
