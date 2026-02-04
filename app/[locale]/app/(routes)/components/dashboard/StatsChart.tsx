"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface StatsChartProps {
  title: string
  description?: string
  data: { name: string; value: number }[]
}

export function StatsChart({ title, description, data }: StatsChartProps) {
  // Map data to add fill colors cyclically from chart variables
  const chartData = React.useMemo(() => {
    return data.map((item, index) => ({
      status: item.name,
      count: (item as any).value ?? (item as any).Number,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }))
  }, [data])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: "Count",
      },
    }
    chartData.forEach((item, index) => {
      // Normalize key to avoid issues with spaces/special chars if necessary
      // but using status name as key is generally okay for simple usage
      config[item.status] = {
        label: item.status,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }
    })
    return config
  }, [chartData])

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0)
  }, [chartData])

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[180px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={50}
              outerRadius={70}
              strokeWidth={3}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
