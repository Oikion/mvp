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
          Manage screenshot and screen recording protection for sensitive data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Screenshot protection helps prevent unauthorized capture of sensitive information
            displayed in the application. This includes client data, property details, and
            confidential documents.
          </AlertDescription>
        </Alert>

        <ScreenshotProtectionToggle
          showIcon={true}
          showDescription={true}
        />

        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What is protected:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Keyboard shortcuts (Print Screen, Cmd+Shift+3/4/5, Win+Shift+S)</li>
            <li>Right-click context menu</li>
            <li>Canvas and WebGL capture APIs</li>
            <li>Print functionality for protected pages</li>
            <li>Drag and drop of sensitive content</li>
          </ul>

          <p className="font-medium text-foreground mt-4">Important notes:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              Protection is automatically enabled in sensitive areas (CRM, Documents, Reports)
            </li>
            <li>
              You can toggle protection in non-sensitive areas when enabled by your organization
            </li>
            <li>
              Physical cameras and OS-level screenshot tools cannot be blocked by browser-based
              protection
            </li>
            <li>
              All access to sensitive data is logged for security auditing
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
