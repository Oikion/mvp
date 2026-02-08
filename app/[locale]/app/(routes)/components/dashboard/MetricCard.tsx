"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number // percentage
    label: string // e.g. "from last month"
    direction?: "up" | "down" | "neutral"
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <div className="mt-4 flex flex-col gap-1">
             {trend && (
                <div className={cn("flex items-center text-sm", 
                    trend.direction === "up" && "text-green-500",
                    trend.direction === "down" && "text-red-500",
                    trend.direction === "neutral" && "text-muted-foreground"
                )}>
                    {trend.direction === "up" && <TrendingUp className="mr-1 h-4 w-4" />}
                    {trend.direction === "down" && <TrendingDown className="mr-1 h-4 w-4" />}
                    <span className="font-medium">{trend.value > 0 ? "+" : ""}{trend.value}%</span>
                </div>
             )}
             {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

