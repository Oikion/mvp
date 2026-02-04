"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type ActivityPoint = {
  date: string
  properties: number
  clients: number
}

interface VisitorsChartProps {
  title: string
  description?: string
  data: ActivityPoint[]
  propertiesLabel: string
  clientsLabel: string
  emptyTitle?: string
  emptyHint?: string
}

// Placeholder data for empty state - creates a natural looking curve
const placeholderData: ActivityPoint[] = [
  { date: "Jan", properties: 3, clients: 2 },
  { date: "Feb", properties: 5, clients: 4 },
  { date: "Mar", properties: 4, clients: 6 },
  { date: "Apr", properties: 7, clients: 5 },
  { date: "May", properties: 6, clients: 8 },
  { date: "Jun", properties: 9, clients: 7 },
]

export function VisitorsChart({
  title,
  description,
  data,
  propertiesLabel,
  clientsLabel,
  emptyTitle = "Gathering insights...",
  emptyHint = "Activity data will appear as you add clients and properties",
}: VisitorsChartProps) {
  const hasData = data && data.length > 0
  const chartData = hasData ? data : placeholderData

  const chartConfig = React.useMemo(
    () => ({
      properties: {
        label: propertiesLabel,
        color: "hsl(var(--chart-1))",
      },
      clients: {
        label: clientsLabel,
        color: "hsl(var(--chart-2))",
      },
    }),
    [propertiesLabel, clientsLabel]
  )

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <div className="relative h-full w-full">
          <ChartContainer 
            config={chartConfig} 
            className={`h-full w-full ${!hasData ? "opacity-20" : ""}`}
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <defs>
                <linearGradient id="fillProperties" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-properties)"
                    stopOpacity={hasData ? 0.8 : 0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-properties)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillClients" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-clients)"
                    stopOpacity={hasData ? 0.8 : 0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-clients)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              {hasData && (
                <>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <ChartLegend />
                </>
              )}
              <Area
                dataKey="properties"
                type="natural"
                fill="url(#fillProperties)"
                fillOpacity={1}
                stroke="var(--color-properties)"
                strokeWidth={2}
                stackId="activity"
              />
              <Area
                dataKey="clients"
                type="natural"
                fill="url(#fillClients)"
                fillOpacity={1}
                stroke="var(--color-clients)"
                strokeWidth={2}
                stackId="activity"
              />
            </AreaChart>
          </ChartContainer>
          
          {/* Empty state overlay */}
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4 py-3 rounded-lg bg-background/80 backdrop-blur-sm border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {emptyTitle}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {emptyHint}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

