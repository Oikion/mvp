"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { useTranslations } from "next-intl";
import type { MatchDistribution } from "@/lib/matchmaking";

interface Props {
  distribution: MatchDistribution[];
}

const COLORS = {
  "0-25%": "#ef4444",    // red
  "26-50%": "#f97316",   // orange
  "51-70%": "#eab308",   // yellow
  "71-85%": "#22c55e",   // green
  "86-100%": "#10b981",  // emerald
};

export function MatchDistributionChart({ distribution }: Props) {
  const t = useTranslations("matchmaking");
  
  const data = distribution.map((d) => ({
    name: d.range,
    count: d.count,
    fill: COLORS[d.range as keyof typeof COLORS] || "#6b7280",
  }));

  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    const ghostData = [
      { name: "0-25%",   count: 3,  fill: "#ef4444" },
      { name: "26-50%",  count: 7,  fill: "#f97316" },
      { name: "51-70%",  count: 12, fill: "#eab308" },
      { name: "71-85%",  count: 9,  fill: "#22c55e" },
      { name: "86-100%", count: 5,  fill: "#10b981" },
    ];

    return (
      <div className="relative h-64">
        {/* Ghost chart */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ghostData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {ghostData.map((entry, index) => (
                  <Cell key={`ghost-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
          <p className="text-muted-foreground text-sm text-center px-8">
            {t("requestMatches.distribution.title")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
            }}
            itemStyle={{
              color: "hsl(var(--muted-foreground))",
            }}
            formatter={(value: number) => [
              `${value} ${t("common.matches")} (${((value / total) * 100).toFixed(1)}%)`,
              t("common.count")
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
