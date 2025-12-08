"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
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
  /** Custom className */
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
  actionHref,
  actionLabel,
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
    (typeof value === "string" && /^[€$£]?0(\.0+)?[MKB]?$/i.test(value.trim()));

  const hasAction = actionHref || onAction;

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (actionHref && !isZeroState) {
      return (
        <Link href={actionHref} className="block group">
          {children}
        </Link>
      );
    }
    return <>{children}</>;
  };

  return (
    <CardWrapper>
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          hasAction && !isZeroState && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
          isZeroState && "border-dashed border-muted-foreground/30 bg-muted/30",
          className
        )}
      >
        {/* Subtle gradient overlay on hover for non-zero states */}
        {hasAction && !isZeroState && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={cn(
            "p-2 rounded-full transition-all duration-300",
            isZeroState 
              ? "bg-muted text-muted-foreground" 
              : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        
        <CardContent>
          {isZeroState ? (
            // Zero-state UI with CTA
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-muted-foreground/60">{value}</span>
                {hasAction && (
                  <Sparkles className="h-4 w-4 text-amber-500/70 animate-pulse" />
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {emptyMessage || description || "Get started by adding your first item"}
              </p>
              
              {hasAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-2 border-dashed hover:border-solid hover:bg-primary hover:text-primary-foreground transition-all duration-200 group/btn"
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
            </div>
          ) : (
            // Normal state with value
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {hasAction && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                )}
              </div>
              
              {(description || trend) && (
                <p className="text-xs text-muted-foreground">
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
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}






