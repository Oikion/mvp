"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { 
  GripVertical, 
  Settings2,
  Maximize2,
  Minimize2,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDashboardConfig } from "@/lib/dashboard";
import { WIDGET_REGISTRY } from "@/lib/dashboard/widget-registry";
import type { WidgetConfig, WidgetSize } from "@/lib/dashboard/types";

interface WidgetWrapperProps {
  readonly widgetConfig: WidgetConfig;
  readonly children: ReactNode;
  readonly className?: string;
}

const SIZE_ORDER: WidgetSize[] = ["sm", "md", "lg"];

// Size options with labels
const SIZE_OPTIONS: { value: WidgetSize; labelKey: string; icon: ReactNode }[] = [
  { value: "sm", labelKey: "widgets.size.small", icon: <Minimize2 className="h-3.5 w-3.5" /> },
  { value: "md", labelKey: "widgets.size.medium", icon: null },
  { value: "lg", labelKey: "widgets.size.large", icon: <Maximize2 className="h-3.5 w-3.5" /> },
];

/**
 * WidgetWrapper
 * 
 * Wraps dashboard widgets with edit mode controls.
 * Provides drag handle, resize options, and hide functionality.
 */
export function WidgetWrapper({
  widgetConfig,
  children,
  className,
}: WidgetWrapperProps) {
  const t = useTranslations("dashboard");
  const { isEditMode, updateWidgetSize, updateWidgetVisibility } = useDashboardConfig();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const metadata = WIDGET_REGISTRY[widgetConfig.id];
  const widgetName = metadata ? t(metadata.nameKey) : widgetConfig.id;

  const handleSizeChange = async (newSize: WidgetSize) => {
    await updateWidgetSize(widgetConfig.id, newSize);
    setIsMenuOpen(false);
  };

  const handleHide = async () => {
    await updateWidgetVisibility(widgetConfig.id, false);
    setIsMenuOpen(false);
  };

  // Check if size change is allowed based on widget constraints
  const canResize = (size: WidgetSize): boolean => {
    if (!metadata) return true;
    const minIndex = SIZE_ORDER.indexOf(metadata.minSize);
    const maxIndex = SIZE_ORDER.indexOf(metadata.maxSize);
    const targetIndex = SIZE_ORDER.indexOf(size);
    return targetIndex >= minIndex && targetIndex <= maxIndex;
  };

  return (
    <div className={cn("relative group h-full", className)}>
      {/* Edit mode controls */}
      {isEditMode && (
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Drag handle indicator */}
          <div className="bg-background/95 backdrop-blur border rounded-md px-1.5 py-1 shadow-sm flex items-center gap-1">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {t("widgets.drag")}
            </span>
          </div>

          {/* Settings dropdown */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 shadow-sm"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {widgetName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Size options */}
              <DropdownMenuLabel className="text-xs">
                {t("widgets.size.label")}
              </DropdownMenuLabel>
              {SIZE_OPTIONS.map((option) => {
                const isAllowed = canResize(option.value);
                const isActive = widgetConfig.size === option.value;
                
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => isAllowed && handleSizeChange(option.value)}
                    disabled={!isAllowed}
                    className={cn(
                      "flex items-center gap-2",
                      isActive && "bg-accent"
                    )}
                  >
                    {option.icon || <div className="w-3.5" />}
                    <span>{t(option.labelKey)}</span>
                    {isActive && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />

              {/* Hide option */}
              <DropdownMenuItem
                onClick={handleHide}
                className="text-muted-foreground"
              >
                <EyeOff className="h-3.5 w-3.5 mr-2" />
                {t("widgets.hide")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Widget content with edit mode styling */}
      <div
        className={cn(
          "h-full transition-all duration-200",
          isEditMode && "ring-2 ring-transparent hover:ring-primary/20 rounded-lg cursor-grab active:cursor-grabbing"
        )}
      >
        {children}
      </div>
    </div>
  );
}
