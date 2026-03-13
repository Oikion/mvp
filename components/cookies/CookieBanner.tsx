"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import {
  getConsentPreferences,
  acceptAllCookies,
  rejectNonEssentialCookies,
  setConsentPreferences,
} from "@/lib/cookie-consent";

/**
 * GDPR-compliant cookie consent banner.
 *
 * Shows on first visit (no consent cookie found). Users can:
 * - Accept all cookies
 * - Accept only essential cookies
 * - Customize which categories to enable
 *
 * After choosing, the banner is dismissed and the choice stored in
 * `oikion_consent_prefs` cookie for 1 year.
 *
 * The banner re-emits a `cookie-consent-updated` CustomEvent on the
 * window so providers (e.g. PostHog) can react to consent changes
 * without a page reload.
 */
export function CookieBanner() {
  const t = useTranslations("cookies.banner");
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Don't show banner on legal/cookie-policy pages
    if (pathname?.includes("/legal/")) return;

    const prefs = getConsentPreferences();
    if (!prefs) {
      setVisible(true);
    }
  }, [pathname]);

  const emitConsentEvent = useCallback(() => {
    window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAllCookies();
    setVisible(false);
    emitConsentEvent();
  }, [emitConsentEvent]);

  const handleRejectAll = useCallback(() => {
    rejectNonEssentialCookies();
    setVisible(false);
    emitConsentEvent();
  }, [emitConsentEvent]);

  const handleSaveCustom = useCallback(() => {
    setConsentPreferences({ analytics: analyticsEnabled });
    setVisible(false);
    emitConsentEvent();
  }, [analyticsEnabled, emitConsentEvent]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
      <Card className="mx-auto max-w-lg border shadow-lg">
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">{t("title")}</h3>
          </div>

          {/* Description */}
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            {t("description")}{" "}
            <a
              href="/legal/cookie-policy"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("learnMore")} {t("cookiePolicy")}
            </a>
            .
          </p>

          {/* Expandable customization */}
          {expanded && (
            <div className="mb-4 space-y-3 rounded-md border p-3">
              {/* Essential — always on */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{t("essentialLabel")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("essentialDescription")}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t("alwaysOn")}
                </span>
              </div>

              {/* Analytics — toggleable */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{t("analyticsLabel")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("analyticsDescription")}
                  </p>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleAcceptAll}>
              {t("acceptAll")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRejectAll}>
              {t("rejectAll")}
            </Button>
            {!expanded ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(true)}
                className="ml-auto"
              >
                {t("customize")}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(false)}
                  className="ml-auto"
                >
                  <ChevronUp className="ml-1 h-3 w-3" />
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSaveCustom}>
                  {t("save")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
