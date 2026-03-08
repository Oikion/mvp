"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface MiniAreaChartProps {
  data: Array<{ value: number }>;
  color?: string;
  fillOpacity?: number;
  height?: number;
  placeholder?: boolean;
  className?: string;
}

export function MiniAreaChart({
  data,
  color = "hsl(var(--chart-1))",
  fillOpacity = 0.2,
  height = 40,
  placeholder = false,
  className,
}: MiniAreaChartProps) {
  const strokeColor = placeholder ? "hsl(var(--muted-foreground))" : color;
  const areaFillOpacity = placeholder ? 0.05 : fillOpacity;
  const gradientId = `mini-area-gradient-${placeholder ? "placeholder" : color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={areaFillOpacity} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={placeholder ? 1 : 1.5}
            strokeDasharray={placeholder ? "4 4" : undefined}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
