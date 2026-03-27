"use client";

import { Shield, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { ScreenshotProtectionToggle } from "./ScreenshotProtectionToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * ScreenshotProtectionSettings Component
 * 
 * Full settings panel for screenshot protection configuration.
 * Displays current status, toggle control, and information about protection.
 * 
 * Usage:
 * ```tsx
 * <ScreenshotProtectionSettings />
 * ```
 */

export function ScreenshotProtectionSettings() {
  const t = useTranslations("common");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle>{t("security.screenshotProtection.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("security.screenshotProtection.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            {t("security.screenshotProtection.alertInfo")}
          </AlertDescription>
        </Alert>

        <ScreenshotProtectionToggle
          showIcon={true}
          showDescription={true}
        />

        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t("security.screenshotProtection.whatIsProtected")}</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>{t("security.screenshotProtection.protectedKeyboard")}</li>
            <li>{t("security.screenshotProtection.protectedContextMenu")}</li>
            <li>{t("security.screenshotProtection.protectedCanvas")}</li>
            <li>{t("security.screenshotProtection.protectedPrint")}</li>
            <li>{t("security.screenshotProtection.protectedDragDrop")}</li>
          </ul>

          <p className="font-medium text-foreground mt-4">{t("security.screenshotProtection.importantNotes")}</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>{t("security.screenshotProtection.noteAutoEnabled")}</li>
            <li>{t("security.screenshotProtection.noteToggle")}</li>
            <li>{t("security.screenshotProtection.notePhysical")}</li>
            <li>{t("security.screenshotProtection.noteAudit")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
