"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import type { Layout, LayoutItem, ResponsiveLayouts as RGLResponsiveLayouts } from "react-grid-layout/legacy";
import { useDashboardConfig } from "@/lib/dashboard";
import { PhysicsWidgetWrapper } from "./PhysicsWidgetWrapper";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { WidgetConfig, ResponsiveLayouts, GridPosition } from "@/lib/dashboard/types";
import "react-grid-layout/css/styles.css";

// Type alias for backward compatibility with v1 API
type Layouts = RGLResponsiveLayouts;

// Use WidthProvider to automatically calculate grid width
const ResponsiveGridLayout = WidthProvider(Responsive);

// Breakpoints and Columns configuration
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = {
  lg: 48,
  md: 48,
  sm: 24,
  xs: 12,
  xxs: 12,
};
const ROW_HEIGHT = 100;

interface PhysicsGridProps {
  renderWidget: (widgetId: string, config: WidgetConfig) => ReactNode;
  className?: string;
}

export function PhysicsGrid({ renderWidget, className }: PhysicsGridProps) {
  const { config, updateLayouts, isEditMode, updateWidgetVisibility } = useDashboardConfig();
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);

  const layoutBeforeDragRef = useRef<Layouts | null>(null);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert GridPosition[] to LayoutItem[] for each breakpoint, filtering by visibility
  const layouts = useMemo(() => {
    const convertToLayout = (positions: GridPosition[] | undefined): LayoutItem[] => {
      if (!positions) return [];
      return positions
        .filter((pos) => config.widgets[pos.i]?.visible)
        .map((pos) => ({
          i: pos.i,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          minW: pos.minW ?? 12,
          minH: pos.minH ?? 2,
          maxW: pos.maxW ?? 48,
          maxH: pos.maxH ?? 12,
          static: pos.static ?? false,
        }));
    };

    return {
      lg: convertToLayout(config.layouts.lg),
      md: convertToLayout(config.layouts.md),
      sm: convertToLayout(config.layouts.sm),
      xs: convertToLayout(config.layouts.xs),
      xxs: convertToLayout(config.layouts.xxs),
    } as unknown as Layouts;
  }, [config.layouts, config.widgets]);

  const latestLayoutsRef = useRef<Layouts>(layouts);

  useEffect(() => {
    latestLayoutsRef.current = layouts;
  }, [layouts]);

  // Handle Escape key to cancel drag
  useEffect(() => {
    if (!isDragging) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layoutBeforeDragRef.current) {
        e.preventDefault();
        isCancellingRef.current = true;
        setLayoutKey(prev => prev + 1);
        layoutBeforeDragRef.current = null;
        setIsDragging(false);
      }
    };

    globalThis.window.addEventListener("keydown", handleKeyDown);
    return () => globalThis.window.removeEventListener("keydown", handleKeyDown);
  }, [isDragging]);

  const onLayoutChangeInternal = useCallback((currentLayout: Layout, allLayouts: Layouts) => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    latestLayoutsRef.current = allLayouts;
  }, []);

  const persistLayouts = useCallback(() => {
    const allLayouts = latestLayoutsRef.current;
    const result: ResponsiveLayouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    const keys = ['lg', 'md', 'sm', 'xs', 'xxs'] as const;

    for (const bp of keys) {
      const layout = allLayouts[bp];
      const existingPositions = config.layouts[bp] || [];

      if (!layout) {
        result[bp] = existingPositions;
        continue;
      }

      const positionMap = new Map(existingPositions.map(pos => [pos.i, pos]));

      result[bp] = layout.map(item => {
        let basePosition = positionMap.get(item.i);
        if (!basePosition) {
          basePosition = config.layouts.lg.find(pos => pos.i === item.i);
        }
        if (!basePosition) return null;

        return {
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW ?? basePosition.minW,
          maxW: item.maxW ?? basePosition.maxW,
          minH: item.minH ?? basePosition.minH,
          maxH: item.maxH ?? basePosition.maxH,
          static: item.static ?? basePosition.static,
        } as GridPosition;
      }).filter((item): item is GridPosition => item !== null);
    }

    updateLayouts(result);
  }, [config.layouts, updateLayouts]);

  const handleDragStart = useCallback(() => {
    layoutBeforeDragRef.current = structuredClone(latestLayoutsRef.current);
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(() => {
    layoutBeforeDragRef.current = null;
    setIsDragging(false);
    persistLayouts();
  }, [persistLayouts]);

  if (!mounted) {
    return <div className={cn("h-screen w-full bg-muted/10 animate-pulse", className)} />;
  }

  return (
    <div className={cn("w-full h-full", className, isDragging && "select-none cursor-grabbing")}>
      <style jsx global>{`
        .react-grid-item > .react-resizable-handle {
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: none;
          cursor: se-resize;
          z-index: 10;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 6px;
          height: 6px;
          border-right: 2px solid hsl(var(--muted-foreground));
          border-bottom: 2px solid hsl(var(--muted-foreground));
          border-radius: 1px;
        }
      `}</style>

      <ResponsiveGridLayout
        key={layoutKey}
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={[12, 12]}
        containerPadding={[16, 16]}
        compactType="vertical"
        preventCollision={false}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".widget-drag-handle"
        resizeHandles={['se']}
        onLayoutChange={onLayoutChangeInternal}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleDragStart}
        onResizeStop={handleDragStop}
        useCSSTransforms={true}
        transformScale={1}
      >
        {config.layouts.lg
          .filter((layoutItem) => config.widgets[layoutItem.i]?.visible)
          .map((layoutItem) => {
            const widgetSettings = config.widgets[layoutItem.i];
            const widgetConfig: WidgetConfig = {
              id: layoutItem.i,
              visible: widgetSettings.visible,
              static: layoutItem.static,
            };

            return (
              <div key={layoutItem.i}>
                <PhysicsWidgetWrapper
                  widget={widgetConfig}
                  isEditMode={isEditMode}
                  onHide={() => updateWidgetVisibility(layoutItem.i, false)}
                  onLock={() => {
                    // Lock implementation placeholder
                  }}
                >
                  {renderWidget(layoutItem.i, widgetConfig)}
                </PhysicsWidgetWrapper>
              </div>
            );
          })}
      </ResponsiveGridLayout>
    </div>
  );
}
