"use client";

import * as React from "react";
import {
  Line,
  LineChart as RechartsLineChart,
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

interface LineChartProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  lines: Array<{
    dataKey: string;
    label: string;
    color?: string;
    strokeDasharray?: string;
  }>;
  height?: number;
  showGrid?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export function LineChart({
  title,
  description,
  data,
  xAxisKey,
  lines,
  height = 300,
  showGrid = true,
  className,
  valueFormatter,
}: LineChartProps) {
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    lines.forEach((line, index) => {
      config[line.dataKey] = {
        label: line.label,
        color: line.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config;
  }, [lines]);

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
            <RechartsLineChart
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
              {lines.map((line, index) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color || `hsl(var(--chart-${(index % 5) + 1}))`}
                  strokeWidth={2}
                  strokeDasharray={line.strokeDasharray}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface SparklineProps {
  data: Array<{ value: number }>;
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "hsl(var(--chart-1))", height = 40 }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
