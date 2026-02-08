"use client";

import { useCallback, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  RotateCcw,
  Settings2,
  Minimize2,
  Maximize2,
  Square,
  Loader2,
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
import { WIDGET_REGISTRY } from "@/lib/dashboard/widget-registry";
import type { WidgetConfig, WidgetSize } from "@/lib/dashboard/types";

// Size button config
const SIZE_BUTTONS: { value: WidgetSize; icon: ReactNode; label: string }[] = [
  { value: "sm", icon: <Minimize2 className="h-3 w-3" />, label: "S" },
  { value: "md", icon: <Square className="h-3 w-3" />, label: "M" },
  { value: "lg", icon: <Maximize2 className="h-3 w-3" />, label: "L" },
];

interface SortableWidgetRowProps {
  readonly widget: WidgetConfig;
  readonly onToggleVisibility: (id: string, visible: boolean) => void;
  readonly onSizeChange: (id: string, size: WidgetSize) => void;
}

function SortableWidgetRow({
  widget,
  onToggleVisibility,
  onSizeChange,
}: SortableWidgetRowProps) {
  const t = useTranslations("dashboard");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const metadata = WIDGET_REGISTRY[widget.id];
  if (!metadata) return null;

  // Get the icon component dynamically
  const IconComponent =
    (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[
      metadata.icon
    ] || Settings2;
  const widgetName = t(metadata.nameKey);

  // Check if size is allowed
  const canResize = (size: WidgetSize): boolean => {
    const sizeOrder: WidgetSize[] = ["sm", "md", "lg"];
    const minIndex = sizeOrder.indexOf(metadata.minSize);
    const maxIndex = sizeOrder.indexOf(metadata.maxSize);
    const targetIndex = sizeOrder.indexOf(size);
    return targetIndex >= minIndex && targetIndex <= maxIndex;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-background border rounded-lg",
        isDragging && "opacity-50 shadow-lg",
        !widget.visible && "opacity-60 bg-muted/30"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Widget icon */}
      <div className="flex-shrink-0">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Widget name */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium truncate block",
          !widget.visible && "text-muted-foreground"
        )}>
          {widgetName}
        </span>
      </div>

      {/* Size selector */}
      <div className="flex items-center gap-0.5 border rounded-md p-0.5">
        {SIZE_BUTTONS.map((btn) => {
          const isAllowed = canResize(btn.value);
          const isActive = widget.size === btn.value;
          
          return (
            <button
              key={btn.value}
              type="button"
              onClick={() => isAllowed && onSizeChange(widget.id, btn.value)}
              disabled={!isAllowed || !widget.visible}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                (!isAllowed || !widget.visible) && "opacity-50 cursor-not-allowed"
              )}
              title={`Size: ${btn.label}`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Visibility toggle */}
      <Switch
        checked={widget.visible}
        onCheckedChange={(checked) => onToggleVisibility(widget.id, checked)}
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
 * A sheet panel for managing dashboard widget configuration.
 * Supports reordering, visibility toggles, and size changes.
 */
export function WidgetSettingsPanel({ trigger }: WidgetSettingsPanelProps) {
  const t = useTranslations("dashboard");
  const {
    config,
    updateWidgetVisibility,
    updateWidgetSize,
    reorderWidgets,
    resetToDefault,
    isLoading,
    setIsEditMode,
  } = useDashboardConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all widgets sorted by current order
  const sortedWidgets = [...config.widgets].sort((a, b) => a.order - b.order);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortedWidgets.findIndex((w) => w.id === active.id);
        const newIndex = sortedWidgets.findIndex((w) => w.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(sortedWidgets, oldIndex, newIndex);
          await reorderWidgets(newOrder.map((w) => w.id));
        }
      }
    },
    [sortedWidgets, reorderWidgets]
  );

  const handleVisibilityChange = useCallback(
    async (widgetId: string, visible: boolean) => {
      await updateWidgetVisibility(widgetId, visible);
    },
    [updateWidgetVisibility]
  );

  const handleSizeChange = useCallback(
    async (widgetId: string, size: WidgetSize) => {
      await updateWidgetSize(widgetId, size);
    },
    [updateWidgetSize]
  );

  const handleReset = async () => {
    setIsResetting(true);
    await resetToDefault();
    setIsResetting(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Enable edit mode when panel is open
    setIsEditMode(open);
  };

  // Count visible widgets
  const visibleCount = config.widgets.filter((w) => w.visible).length;
  const totalCount = config.widgets.length;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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

        {/* Widget count badge */}
        <div className="flex items-center justify-between py-2">
          <Badge variant="secondary" className="text-xs">
            {t("customize.widgetCount", { visible: visibleCount, total: totalCount })}
          </Badge>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Separator />

        {/* Sortable widget list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedWidgets.map((widget) => (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      onToggleVisibility={handleVisibilityChange}
                      onSizeChange={handleSizeChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer with reset button */}
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
