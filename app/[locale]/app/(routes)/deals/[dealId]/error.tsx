"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function DealError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error("[DEAL_ERROR]", error);
  }, [error]);

  const errorId = error.digest;

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
          {errorId && (
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded inline-block">
              Error ID: {errorId}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Button onClick={reset} className="w-full" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("tryAgain")}
          </Button>
          <Button variant="outline" asChild size="lg" className="w-full">
            <a href="/app" className="inline-flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t("backToDashboard")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
