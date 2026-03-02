"use client";

import { PhysicsGrid } from "./PhysicsGrid";
import type { WidgetConfig } from "@/lib/dashboard/types";
import type { ReactNode } from "react";

interface DashboardGridProps {
  readonly renderWidget: (widgetId: string, config: WidgetConfig) => ReactNode;
  readonly className?: string;
}

/**
 * DashboardGrid
 *
 * Main grid container for the dashboard.
 * Uses PhysicsGrid (react-grid-layout) for 2D layout, drag and resize.
 */
export function DashboardGrid({ renderWidget, className }: DashboardGridProps) {
  return (
    <div className={className}>
      <PhysicsGrid renderWidget={renderWidget} />
    </div>
  );
}
