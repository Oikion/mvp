"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/dashboard/types";
import { SIZE_TO_COLS } from "@/lib/dashboard/types";

interface DashboardWidgetItemProps {
  widgetConfig: WidgetConfig;
  children: React.ReactNode;
  isDragging?: boolean;
  isOverlay?: boolean;
}

/**
 * DashboardWidgetItem
 * 
 * Sortable wrapper for individual dashboard widgets.
 * Handles drag-and-drop positioning and column spanning.
 */
export function DashboardWidgetItem({
  widgetConfig,
  children,
  isDragging = false,
  isOverlay = false,
}: DashboardWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: widgetConfig.id,
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine column span based on widget size
  const colSpan = SIZE_TO_COLS[widgetConfig.size];
  
  // Map column span to Tailwind classes
  const getColSpanClass = () => {
    switch (colSpan) {
      case 1:
        return "md:col-span-1";
      case 2:
        return "md:col-span-2 lg:col-span-2";
      case 3:
        return "md:col-span-2 lg:col-span-3";
      default:
        return "md:col-span-1";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        // Column spanning based on widget size
        getColSpanClass(),
        // Full width on mobile
        "col-span-1",
        // Visual feedback during drag
        isDragging || isSortableDragging ? "opacity-50 z-10" : "",
        // Overlay styling
        isOverlay ? "shadow-xl" : "",
        // Make the entire widget draggable area
        "touch-none",
      )}
    >
      {children}
    </div>
  );
}
