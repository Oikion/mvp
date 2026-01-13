"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { StatsChart } from "../../components/dashboard/StatsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Eye, TrendingUp, Clock } from "lucide-react";

interface ProductivityMetricsTabProps {
  data: {
    incomePerHour: { incomePerHour: number; totalIncome: number; totalHours: number };
    incomePerHourTrend: Array<{ name: string; income: number; hours: number; incomePerHour: number }>;
    transactionsPerShowing: { ratio: number; transactions: number; showings: number; showingsPerTransaction: number };
    showingsByResult: Array<{ name: string; value: number }>;
    showingsTrend: Array<{ name: string; total: number; successful: number; successRate: number }>;
    marketingROI: { roi: number; revenue: number; spend: number; netReturn: number };
    marketingROIByCategory: Array<{ category: string; spend: number; revenue: number; roi: number }>;
    timeAllocation: { adminPercentage: number; incomeProducingPercentage: number; adminHours: number; incomeProducingHours: number; totalHours: number; byActivity: Array<{ activity: string; hours: number; percentage: number }> };
    timeAllocationTrend: Array<{ name: string; admin: number; incomeProducing: number; other: number }>;
  };
  dict: Record<string, any>;
}

export function ProductivityMetricsTab({ data, dict }: ProductivityMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.incomePerHour || "Income Per Hour"}
          value={data.incomePerHour.incomePerHour}
          prefix="€"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          description={`€${data.incomePerHour.totalIncome.toLocaleString()} / ${data.incomePerHour.totalHours.toLocaleString()} hours`}
          helpText="GCI divided by hours invested"
        />
        <MetricCard
          title={t.transactionsPerShowing || "Showings Per Transaction"}
          value={data.transactionsPerShowing.showingsPerTransaction}
          icon={<Eye className="h-4 w-4 text-primary" />}
          description={`${data.transactionsPerShowing.showings} showings → ${data.transactionsPerShowing.transactions} deals`}
          helpText="Efficiency of buyer appointments"
        />
        <MetricCard
          title={t.marketingROI || "Marketing ROI"}
          value={data.marketingROI.roi}
          suffix="%"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description={`€${data.marketingROI.revenue.toLocaleString()} return on €${data.marketingROI.spend.toLocaleString()} spend`}
          helpText="Return on each marketing dollar spent"
        />
        <MetricCard
          title={t.incomeProducingTime || "Income-Producing Time"}
          value={data.timeAllocation.incomeProducingPercentage}
          suffix="%"
          icon={<Clock className="h-4 w-4 text-primary" />}
          description={`${data.timeAllocation.adminPercentage}% admin time`}
          helpText="Top agents minimize administrative time"
          benchmark="Goal: >60% income-producing"
        />
      </MetricCardGroup>

      {/* Income Per Hour and Showings */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.incomePerHourTrend.length > 0 && (
          <LineChart
            title={t.incomePerHourTrend || "Income Per Hour Trend"}
            description="Monthly income efficiency"
            data={data.incomePerHourTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "incomePerHour", label: "€/Hour", color: "hsl(var(--chart-1))" },
            ]}
            height={250}
          />
        )}

        {data.showingsByResult.length > 0 && (
          <StatsChart
            title={t.showingsByResult || "Showings by Result"}
            description="Distribution of showing outcomes"
            data={data.showingsByResult}
          />
        )}
      </div>

      {/* Marketing ROI */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.marketingROIByCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.roiByCategory || "Marketing ROI by Category"}</CardTitle>
              <CardDescription>Return on investment by marketing channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.marketingROIByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{cat.category}</p>
                      <p className="text-xs text-muted-foreground">
                        Spent: €{cat.spend.toLocaleString()} → €{cat.revenue.toLocaleString()}
                      </p>
                    </div>
                    <span className={`font-semibold ${cat.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {cat.roi >= 0 ? '+' : ''}{cat.roi}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Marketing Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.marketingSummary || "Marketing Summary"}</CardTitle>
            <CardDescription>Overall marketing performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">€{data.marketingROI.spend.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Spend</p>
              </div>
              <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">€{data.marketingROI.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
              <div className="space-y-1 text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <p className="text-2xl font-bold text-emerald-600">€{data.marketingROI.netReturn.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Net Return</p>
              </div>
              <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{data.marketingROI.roi}%</p>
                <p className="text-sm text-muted-foreground">ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Allocation */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.timeAllocation.byActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.timeByActivity || "Time by Activity"}</CardTitle>
              <CardDescription>Hours breakdown by activity type</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.timeAllocation.byActivity.map((a) => ({
                  name: a.activity.replace(/_/g, ' '),
                  Number: a.hours,
                }))}
                title=""
              />
            </CardContent>
          </Card>
        )}

        {data.timeAllocationTrend.length > 0 && (
          <LineChart
            title={t.timeAllocationTrend || "Time Allocation Trend"}
            description="Monthly hours by category"
            data={data.timeAllocationTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "incomeProducing", label: "Income Producing", color: "hsl(var(--chart-1))" },
              { dataKey: "admin", label: "Administrative", color: "hsl(var(--chart-2))" },
              { dataKey: "other", label: "Other", color: "hsl(var(--chart-3))", strokeDasharray: "5 5" },
            ]}
            height={250}
          />
        )}
      </div>

      {/* Showings Trend */}
      {data.showingsTrend.length > 0 && (
        <LineChart
          title={t.showingsTrend || "Showings Success Trend"}
          description="Monthly showing volume and success rate"
          data={data.showingsTrend}
          xAxisKey="name"
          lines={[
            { dataKey: "total", label: "Total Showings", color: "hsl(var(--chart-1))" },
            { dataKey: "successful", label: "Successful", color: "hsl(var(--chart-2))" },
          ]}
          height={250}
        />
      )}
    </div>
  );
}
