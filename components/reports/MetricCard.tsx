"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  suffix?: string;
  prefix?: string;
  className?: string;
  helpText?: string;
  benchmark?: string;
  chart?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  suffix,
  prefix,
  className,
  helpText,
  benchmark,
  chart,
  size = "md",
}: MetricCardProps) {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const valueSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2", sizeClasses[size])}>
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-full bg-primary/10">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="text-lg text-muted-foreground">{prefix}</span>
          )}
          <span className={cn("font-bold tracking-tight", valueSizes[size])}>
            {formatValue(value)}
          </span>
          {suffix && (
            <span className="text-lg text-muted-foreground">{suffix}</span>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : trend.direction === "down" ? (
              <TrendingDown className="h-4 w-4 text-destructive" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-destructive",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground ml-1">
                {trend.label}
              </span>
            )}
          </div>
        )}

        {description && (
          <CardDescription className="mt-2 text-xs">
            {description}
          </CardDescription>
        )}

        {benchmark && (
          <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Benchmark:</span> {benchmark}
          </div>
        )}

        {chart && (
          <div className="mt-4 -mx-2">
            {chart}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function MetricCardGroup({ children, columns = 4 }: MetricCardGroupProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}
