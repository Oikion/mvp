"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { useDashboardConfig } from "@/lib/dashboard";
import { getVisibleWidgets } from "@/lib/dashboard/widget-registry";
import type { WidgetConfig } from "@/lib/dashboard/types";
import { DashboardWidgetItem } from "./DashboardWidgetItem";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  // Render function for each widget
  readonly renderWidget: (widgetId: string, config: WidgetConfig) => React.ReactNode;
  readonly className?: string;
}

/**
 * DashboardGrid
 * 
 * A drag-and-drop enabled grid for dashboard widgets.
 * Uses @dnd-kit/sortable for reordering with smooth animations.
 */
export function DashboardGrid({ renderWidget, className }: DashboardGridProps) {
  const { config, reorderWidgets, isEditMode } = useDashboardConfig();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Get visible widgets sorted by order
  const visibleWidgets = getVisibleWidgets(config);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Small delay to distinguish between click and drag
        delay: isEditMode ? 0 : 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
        const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(visibleWidgets, oldIndex, newIndex);
          
          // Get all widget IDs in new order (including hidden ones at the end)
          const newWidgetIds = [
            ...newOrder.map((w) => w.id),
            ...config.widgets.filter((w) => !w.visible).map((w) => w.id),
          ];
          
          await reorderWidgets(newWidgetIds);
        }
      }
    },
    [visibleWidgets, config.widgets, reorderWidgets]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Get the active widget for the overlay
  const activeWidget = activeId
    ? visibleWidgets.find((w) => w.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={visibleWidgets.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className={cn(
            "grid gap-4",
            // Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            // Auto-rows for flexible height
            "auto-rows-auto",
            className
          )}
        >
          {visibleWidgets.map((widgetConfig) => (
            <DashboardWidgetItem
              key={widgetConfig.id}
              widgetConfig={widgetConfig}
              isDragging={activeId === widgetConfig.id}
            >
              {renderWidget(widgetConfig.id, widgetConfig)}
            </DashboardWidgetItem>
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay for visual feedback during drag */}
      <DragOverlay adjustScale>
        {activeWidget ? (
          <div className="opacity-80 shadow-xl rounded-lg">
            <DashboardWidgetItem
              widgetConfig={activeWidget}
              isDragging={false}
              isOverlay
            >
              {renderWidget(activeWidget.id, activeWidget)}
            </DashboardWidgetItem>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
