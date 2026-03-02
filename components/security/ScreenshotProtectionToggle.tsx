"use client";

import { Shield, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useScreenshotProtection } from "@/hooks/use-screenshot-protection";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ScreenshotProtectionToggle Component
 * 
 * Provides a UI control for users to toggle screenshot protection
 * (only works when protection is not enforced)
 * 
 * Usage:
 * ```tsx
 * <ScreenshotProtectionToggle />
 * ```
 */

interface ScreenshotProtectionToggleProps {
  /**
   * Show as inline control (default: false, shows as card)
   */
  inline?: boolean;
  
  /**
   * Show icon
   */
  showIcon?: boolean;
  
  /**
   * Show description
   */
  showDescription?: boolean;
}

export function ScreenshotProtectionToggle({
  inline = false,
  showIcon = true,
  showDescription = true,
}: ScreenshotProtectionToggleProps) {
  const t = useTranslations("common");
  const { enabled, userCanToggle, toggleProtection } = useScreenshotProtection();

  if (!userCanToggle) {
    // Don't show toggle if protection is enforced
    return null;
  }

  const content = (
    <div className={inline ? "flex items-center gap-3" : "flex items-start gap-4"}>
      {showIcon && (
        <div className="flex-shrink-0">
          {enabled ? (
            <Shield className="h-5 w-5 text-success" aria-hidden="true" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      )}
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="screenshot-protection"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("security.screenshotProtection.title")}
          </Label>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    id="screenshot-protection"
                    checked={enabled}
                    onCheckedChange={toggleProtection}
                    aria-label={t("security.screenshotProtection.toggle")}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {enabled
                    ? t("security.screenshotProtection.disableTooltip")
                    : t("security.screenshotProtection.enableTooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {showDescription && (
          <p className="text-sm text-muted-foreground">
          {enabled
            ? t("security.screenshotProtection.enabledDescription")
            : t("security.screenshotProtection.disabledDescription")}
          </p>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      {content}
    </div>
  );
}
