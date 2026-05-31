"use client";

import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Settings2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardConfig } from "@/lib/dashboard";
import { WIDGET_REGISTRY, WIDGET_IDS } from "@/lib/dashboard/widget-registry";

interface WidgetRowProps {
  readonly widgetId: string;
  readonly isVisible: boolean;
  readonly onToggleVisibility: (id: string, visible: boolean) => void;
}

function WidgetRow({
  widgetId,
  isVisible,
  onToggleVisibility,
}: WidgetRowProps) {
  const t = useTranslations("dashboard");
  const metadata = WIDGET_REGISTRY[widgetId];

  if (!metadata) return null;

  const IconComponent =
    (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[
      metadata.icon
    ] || Settings2;
  const widgetName = t(metadata.nameKey as Parameters<typeof t>[0]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-background border rounded-lg",
        !isVisible && "opacity-60 bg-muted/30"
      )}
    >
      <div className="flex-shrink-0">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium truncate block",
          !isVisible && "text-muted-foreground"
        )}>
          {widgetName}
        </span>
      </div>

      <Switch
        checked={isVisible}
        onCheckedChange={(checked) => onToggleVisibility(widgetId, checked)}
        className="flex-shrink-0"
      />
    </div>
  );
}

interface WidgetSettingsPanelProps {
  readonly trigger?: ReactNode;
}

/**
 * WidgetSettingsPanel
 *
 * A sheet panel for managing dashboard widget visibility.
 * Drag-and-drop reordering is done directly on the grid in Edit Layout mode.
 */
export function WidgetSettingsPanel({ trigger }: WidgetSettingsPanelProps) {
  const t = useTranslations("dashboard");
  const {
    config,
    updateWidgetVisibility,
    resetToDefault,
    isLoading,
  } = useDashboardConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleVisibilityChange = async (widgetId: string, visible: boolean) => {
    await updateWidgetVisibility(widgetId, visible);
  };

  const handleReset = async () => {
    setIsResetting(true);
    await resetToDefault();
    setIsResetting(false);
  };

  const totalCount = WIDGET_IDS.length;
  const visibleCount = Object.values(config.widgets).filter(w => w.visible).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            {t("customize.button")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("customize.title")}
          </SheetTitle>
          <SheetDescription>
            {t("customize.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between py-2">
          <Badge variant="secondary" className="text-xs">
            {t("customize.widgetCount", { visible: visibleCount, total: totalCount })}
          </Badge>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4 space-y-2">
            {WIDGET_IDS.map((widgetId) => (
              <WidgetRow
                key={widgetId}
                widgetId={widgetId}
                isVisible={config.widgets[widgetId]?.visible ?? false}
                onToggleVisibility={handleVisibilityChange}
              />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <SheetFooter className="pt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="text-muted-foreground"
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {t("customize.reset")}
            </Button>
            <SheetClose asChild>
              <Button size="sm">
                {t("customize.done")}
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
