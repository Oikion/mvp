"use client";

import { useTranslations } from "next-intl";
import { EyeOff, Lock, Unlock, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/dashboard/types";
import type { ReactNode } from "react";
import { useState } from "react";

interface PhysicsWidgetWrapperProps {
  widget: WidgetConfig;
  children: ReactNode;
  isEditMode: boolean;
  onHide: () => void;
  onLock: () => void;
  // Props passed by react-grid-layout
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

export function PhysicsWidgetWrapper({
  widget,
  children,
  isEditMode,
  onHide,
  onLock,
  style,
  className,
  onMouseDown,
  onMouseUp,
  onTouchEnd,
  ...props
}: PhysicsWidgetWrapperProps) {
  const t = useTranslations("dashboard");
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={style}
      className={cn(
        "relative h-full transition-shadow duration-200",
        className,
        isEditMode && "ring-1 ring-border/50 hover:ring-primary/50 rounded-lg",
        isEditMode && widget.static && "ring-muted hover:ring-muted"
      )}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Edit Mode Overlay & Controls */}
      {isEditMode && (
        <>
          {/* Drag Handle - Top Bar */}
          <div
            className={cn(
              "widget-drag-handle absolute top-0 left-0 right-0 h-8 z-20",
              "flex items-center justify-between px-2",
              "bg-background/80 backdrop-blur-sm border-b rounded-t-lg",
              "transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-70",
              widget.static ? "cursor-not-allowed" : "cursor-move"
            )}
          >
            <div className="flex items-center gap-2">
              {!widget.static && <GripVertical className="h-4 w-4 text-muted-foreground" />}
              <span className="text-xs font-medium text-muted-foreground">
                {widget.static ? t("widgets.locked") : t("widgets.drag")}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onLock();
                }}
                title={widget.static ? t("widgets.unlock") : t("widgets.lock")}
              >
                {widget.static ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onHide();
                }}
                title={t("widgets.hide")}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Locked Overlay */}
          {widget.static && (
            <div className="absolute inset-0 bg-background/5 rounded-lg pointer-events-none z-10 border-2 border-dashed border-muted" />
          )}
        </>
      )}

      {/* Content */}
      <div className="h-full w-full overflow-hidden rounded-lg bg-card">
        {children}
      </div>
    </div>
  );
}
