"use client";

import * as React from "react";
import { AlignCenter, Maximize2 } from "lucide-react";
import { useLayoutPreference } from "@/lib/layout-preference";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * LayoutToggle Component
 * 
 * Toggle button for switching between DEFAULT (centered) and WIDE (expanded) layouts.
 * Shows the current layout state and allows users to toggle with a single click.
 * Hydration-safe: uses isHydrated from context to prevent mismatch.
 */
export function LayoutToggle() {
  const { layout, setLayout, isLoading, isHydrated } = useLayoutPreference();

  const toggleLayout = React.useCallback(() => {
    setLayout(layout === "DEFAULT" ? "WIDE" : "DEFAULT");
  }, [layout, setLayout]);

  // Always render the same structure to avoid hydration mismatch
  // Use the layout value which is consistent between server and client on initial render
  const isWide = layout === "WIDE";
  const Icon = isWide ? Maximize2 : AlignCenter;
  const tooltipText = isWide ? "Switch to centered layout" : "Switch to wide layout";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLayout}
            disabled={isLoading || !isHydrated}
            className="h-8 w-8"
            aria-label={tooltipText}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{tooltipText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default LayoutToggle;
