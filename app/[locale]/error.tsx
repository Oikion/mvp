"use client";

/**
 * Locale Error Boundary
 * Catches errors in page components within this locale segment
 * Provides a user-friendly error UI with recovery options
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LayoutDashboard, Globe, Heart } from "lucide-react";

export default function LocaleError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error("[LOCALE_ERROR]", error);
  }, [error]);

  const errorId = error.digest;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full space-y-6">

        {/* Error icon + heading */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
          {errorId && (
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded inline-block">
              Error ID: {errorId}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("tryAgain")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild size="lg">
              <a href="/app" className="inline-flex items-center justify-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                {t("backToDashboard")}
              </a>
            </Button>
            <Button variant="outline" asChild size="lg">
              <a href="/" className="inline-flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" />
                {t("backToWebsite")}
              </a>
            </Button>
          </div>
        </div>

        {/* Beta notice card */}
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Heart className="w-4 h-4 text-destructive flex-shrink-0" />
            {t("betaTitle")}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("betaDescription")}
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {t("contactSupport")}
        </p>
      </div>
    </div>
  );
}
