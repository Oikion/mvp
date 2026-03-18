"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface E2EEAnnouncementBannerProps {
  isAdmin: boolean;
}

const DISMISS_KEY = "e2ee-announcement-dismissed";

export function E2EEAnnouncementBanner({ isAdmin }: E2EEAnnouncementBannerProps) {
  const t = useTranslations("encryption.banner");
  const locale = useLocale();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // hidden by default until hydration

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (dismissed) return null;

  return (
    <Alert variant="default" className="border-blue-500/80 bg-blue-50 dark:bg-blue-500/5 dark:border-blue-400/60">
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 dark:text-blue-200">
        {t("title")}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm text-blue-700 dark:text-blue-300">
          {isAdmin ? t("descriptionAdmin") : t("descriptionMember")}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/${locale}/app/settings/security`)}
            >
              {t("learnMore")}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "true");
              setDismissed(true);
            }}
          >
            {t("dismiss")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
