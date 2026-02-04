"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Hash, Home, Clock } from "lucide-react";

interface SalesMetricsTabProps {
  data: {
    gci: { total: number; currency: string };
    gciTrend: Array<{ name: string; value: number }>;
    transactions: { count: number; thisMonth: number; thisYear: number };
    transactionsTrend: Array<{ name: string; count: number }>;
    avgSalesPrice: { average: number; median: number; count: number };
    avgSalesPriceTrend: Array<{ name: string; average: number; count: number }>;
    daysOnMarket: { average: number; median: number; count: number };
    daysOnMarketTrend: Array<{ name: string; average: number; count: number }>;
  };
  dict: Record<string, any>;
}

export function SalesMetricsTab({ data, dict }: SalesMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.gci || "Gross Commission Income"}
          value={data.gci.total}
          prefix="€"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          description="Total commissions earned from completed deals"
          helpText="The primary income metric for real estate agents"
          size="lg"
        />
        <MetricCard
          title={t.transactionsClosed || "Transactions Closed"}
          value={data.transactions.count}
          icon={<Hash className="h-4 w-4 text-primary" />}
          description={`${data.transactions.thisYear} this year, ${data.transactions.thisMonth} this month`}
          helpText="Volume matters for building systems and reputation"
        />
        <MetricCard
          title={t.avgSalesPrice || "Average Sales Price"}
          value={data.avgSalesPrice.average}
          prefix="€"
          icon={<Home className="h-4 w-4 text-primary" />}
          description={`Median: €${data.avgSalesPrice.median.toLocaleString()} (${data.avgSalesPrice.count} properties)`}
          helpText="Higher prices mean more commission per transaction"
        />
        <MetricCard
          title={t.daysOnMarket || "Days on Market"}
          value={data.daysOnMarket.average}
          suffix=" days"
          icon={<Clock className="h-4 w-4 text-primary" />}
          description={`Median: ${data.daysOnMarket.median} days`}
          helpText="How quickly listings sell shows marketing effectiveness"
          benchmark="Market avg varies by region"
        />
      </MetricCardGroup>

      {/* GCI and Transactions Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.gciTrend.length > 0 && (
          <LineChart
            title={t.gciTrend || "Commission Income Trend"}
            description="Monthly gross commission income"
            data={data.gciTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "value", label: "GCI (€)", color: "hsl(var(--chart-1))" },
            ]}
            height={250}
          />
        )}

        {data.transactionsTrend.length > 0 && (
          <LineChart
            title={t.transactionsTrend || "Transactions Trend"}
            description="Monthly closed transactions"
            data={data.transactionsTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "count", label: "Transactions", color: "hsl(var(--chart-2))" },
            ]}
            height={250}
            valueFormatter={(v) => v.toString()}
          />
        )}
      </div>

      {/* Sales Price and Days on Market Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.avgSalesPriceTrend.length > 0 && (
          <LineChart
            title={t.avgSalesPriceTrend || "Average Sales Price Trend"}
            description="Monthly average sales price"
            data={data.avgSalesPriceTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "average", label: "Avg Price (€)", color: "hsl(var(--chart-3))" },
            ]}
            height={250}
          />
        )}

        {data.daysOnMarketTrend.length > 0 && (
          <LineChart
            title={t.daysOnMarketTrend || "Days on Market Trend"}
            description="Monthly average days to sell"
            data={data.daysOnMarketTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "average", label: "Days", color: "hsl(var(--chart-4))" },
            ]}
            height={250}
            valueFormatter={(v) => `${v} days`}
          />
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t.salesSummary || "Sales Performance Summary"}</CardTitle>
          <CardDescription>Key statistics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total GCI</p>
              <p className="text-2xl font-bold">€{data.gci.total.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg per Transaction</p>
              <p className="text-2xl font-bold">
                €{data.transactions.count > 0 
                  ? Math.round(data.gci.total / data.transactions.count).toLocaleString()
                  : 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Transactions This Year</p>
              <p className="text-2xl font-bold">{data.transactions.thisYear}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Properties Sold</p>
              <p className="text-2xl font-bold">{data.avgSalesPrice.count}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
