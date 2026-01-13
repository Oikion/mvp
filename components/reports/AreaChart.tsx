"use client";

import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface AreaChartProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  areas: Array<{
    dataKey: string;
    label: string;
    color?: string;
    stackId?: string;
  }>;
  height?: number;
  showGrid?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
}

export function AreaChart({
  title,
  description,
  data,
  xAxisKey,
  areas,
  height = 300,
  showGrid = true,
  className,
  valueFormatter,
  stacked = false,
}: AreaChartProps) {
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    areas.forEach((area, index) => {
      config[area.dataKey] = {
        label: area.label,
        color: area.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config;
  }, [areas]);

  const formatValue = valueFormatter || ((value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  });

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              )}
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
                width={60}
                className="text-xs fill-muted-foreground"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              {areas.map((area, index) => (
                <Area
                  key={area.dataKey}
                  type="monotone"
                  dataKey={area.dataKey}
                  stackId={stacked ? "stack" : area.stackId}
                  stroke={area.color || `hsl(var(--chart-${(index % 5) + 1}))`}
                  fill={area.color || `hsl(var(--chart-${(index % 5) + 1}))`}
                  fillOpacity={0.3}
                />
              ))}
            </RechartsAreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
