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
  emptyMessage?: string
  propertiesLabel: string
  clientsLabel: string
}

export function VisitorsChart({
  title,
  description,
  data,
  emptyMessage = "No activity recorded yet.",
  propertiesLabel,
  clientsLabel,
}: VisitorsChartProps) {
  const hasData = data && data.length > 0

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
      <CardContent className="flex-1">
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-[250px] w-full">
            <AreaChart
              accessibilityLayer
              data={data}
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
                    stopOpacity={0.8}
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
                    stopOpacity={0.8}
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
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend />
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
        ) : (
          <div className="flex h-full min-h-[250px] items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

