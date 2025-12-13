"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Sparkles } from "lucide-react";
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
  /** Label for the action button in non-zero state (defaults to "View All") */
  viewLabel?: string;
  /** Optional onClick handler for custom actions */
  onAction?: () => void;
  /** Zero-state message when value is 0 */
  emptyMessage?: string;
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
  viewLabel,
  onAction,
  emptyMessage,
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
              <Sparkles className="h-4 w-4 text-amber-500/70 animate-pulse" />
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
                    trendUp === true && "bg-green-500/10 text-green-600 dark:text-green-400",
                    trendUp === false && "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}>
                    {trend}
                  </span>
                )}
                {description}
              </>
            )}
          </p>
        </div>
        
        {/* Action button section - always present for consistent height */}
        <div className="mt-3 pt-2 min-h-[36px]">
          {hasAction && isZeroState && (
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
          {hasAction && !isZeroState && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 group/btn"
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
                  {viewLabel || "View All"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              ) : (
                <>
                  {viewLabel || "View All"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}






