"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: string;
  trendUp?: boolean;
  /** CTA link for zero-state or clickable card */
  actionHref?: string;
  /** CTA label for zero-state */
  actionLabel?: string;
  /** Optional onClick handler for custom actions */
  onAction?: () => void;
  /** Zero-state message when value is 0 */
  emptyMessage?: string;
  /** Link to view all items (shown when non-zero) */
  viewHref?: string;
  /** Label for view all button */
  viewLabel?: string;
  /** Link to add new item (shown when non-zero) */
  addHref?: string;
  /** Label for add new button */
  addLabel?: string;
  /** Custom className */
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  trendUp,
  actionHref,
  actionLabel,
  onAction,
  emptyMessage,
  viewHref,
  viewLabel,
  addHref,
  addLabel,
  className,
}: StatsCardProps) {
  // Determine if we're in a zero-state (value is 0 or "0" or "€0.0M" etc.)
  const isZeroState = 
    value === 0 || 
    value === "0" || 
    value === "€0.0M" ||
    value === "€0M" ||
    value === "€0.00" ||
    (typeof value === "string" && /^[€$£]?0(\.0+)?[MKB]?$/i.test(value.trim()));

  const hasAction = actionHref || onAction;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 h-full flex flex-col",
        isZeroState && "border-dashed border-muted-foreground/30 bg-muted/30",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(
          "p-2 rounded-full transition-all duration-300",
          isZeroState 
            ? "bg-muted text-muted-foreground" 
            : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Value and trend section - consistent height */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              isZeroState && "text-muted-foreground/60"
            )}>
              {value}
            </span>
            {isZeroState && hasAction && (
              <Sparkles className="h-4 w-4 text-warning/70 animate-pulse" />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {isZeroState ? (
              emptyMessage || description || "Get started by adding your first item"
            ) : (
              <>
                {trend && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 mr-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    trendUp === true && "bg-success/10 text-success dark:text-green-400",
                    trendUp === false && "bg-destructive/10 text-destructive dark:text-red-400"
                  )}>
                    {trend}
                  </span>
                )}
                {description}
              </>
            )}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="mt-3 pt-2 min-h-[36px]">
          {isZeroState && hasAction && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed hover:border-solid hover:bg-primary hover:text-primary-foreground transition-all duration-200 group/btn"
              onClick={(e) => {
                if (onAction) {
                  e.preventDefault();
                  onAction();
                }
              }}
              asChild={!!actionHref && !onAction}
            >
              {actionHref && !onAction ? (
                <Link href={actionHref}>
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover/btn:rotate-90" />
                  {actionLabel || "Add First"}
                </Link>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover/btn:rotate-90" />
                  {actionLabel || "Add First"}
                </>
              )}
            </Button>
          )}
          {!isZeroState && (viewHref || addHref) && (
            <div className="flex items-center justify-end gap-2">
              {viewHref && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href={viewHref}>
                    <Eye className="h-3 w-3 mr-1" />
                    {viewLabel || "View All"}
                  </Link>
                </Button>
              )}
              {addHref && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href={addHref}>
                    <Plus className="h-3 w-3 mr-1" />
                    {addLabel || "Add New"}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}






