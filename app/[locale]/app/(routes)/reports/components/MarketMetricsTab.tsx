"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { StatsChart } from "../../components/dashboard/StatsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Layers, TrendingUp, Target } from "lucide-react";

interface MarketMetricsTabProps {
  data: {
    absorptionRate: { rate: number; activeListings: number; soldLastMonth: number; monthsOfInventory: number };
    absorptionByArea: Array<{ area: string; activeListings: number; soldLastMonth: number; absorptionRate: number }>;
    absorptionTrend: Array<{ name: string; sold: number; absorptionRate: number }>;
    inventoryLevels: { total: number; byStatus: Array<{ name: string; value: number }>; byType: Array<{ name: string; value: number }>; byArea: Array<{ name: string; value: number }> };
    inventoryTrend: Array<{ name: string; newListings: number; sold: number; netChange: number }>;
    medianPriceTrend: Array<{ name: string; median: number; average: number; count: number }>;
    currentMedianPrice: { median: number; average: number; count: number };
    cmaAccuracy: { averageAccuracy: number; count: number; overEstimated: number; underEstimated: number; onTarget?: number };
    cmaDistribution: Array<{ name: string; value: number }>;
    marketDataSummary: { date: Date; area: string; activeListings: number; soldListings: number; medianSalePrice: number; averageDaysOnMarket: number; absorptionRate: number } | null;
  };
  dict: Record<string, any>;
}

export function MarketMetricsTab({ data, dict }: MarketMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  // Determine market type based on months of inventory
  const getMarketType = (months: number) => {
    if (months < 4) return { label: "Seller's Market", color: "text-red-600" };
    if (months < 6) return { label: "Balanced Market", color: "text-yellow-600" };
    return { label: "Buyer's Market", color: "text-emerald-600" };
  };

  const marketType = getMarketType(data.absorptionRate.monthsOfInventory);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.absorptionRate || "Absorption Rate"}
          value={data.absorptionRate.rate}
          suffix="%"
          icon={<Gauge className="h-4 w-4 text-primary" />}
          description={`${data.absorptionRate.soldLastMonth} sold / ${data.absorptionRate.activeListings} active`}
          helpText="How quickly inventory is selling in your market"
        />
        <MetricCard
          title={t.monthsOfInventory || "Months of Inventory"}
          value={data.absorptionRate.monthsOfInventory}
          suffix=" mo"
          icon={<Layers className="h-4 w-4 text-primary" />}
          description={<span className={marketType.color}>{marketType.label}</span>}
          helpText="<4 = Seller's market, 4-6 = Balanced, >6 = Buyer's market"
        />
        <MetricCard
          title={t.medianPrice || "Median Sale Price"}
          value={data.currentMedianPrice.median}
          prefix="€"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description={`Avg: €${data.currentMedianPrice.average.toLocaleString()} (${data.currentMedianPrice.count} sales)`}
          helpText="Market direction in your area"
        />
        <MetricCard
          title={t.cmaAccuracy || "CMA Accuracy"}
          value={data.cmaAccuracy.averageAccuracy}
          suffix="%"
          icon={<Target className="h-4 w-4 text-primary" />}
          description={`${data.cmaAccuracy.count} estimates analyzed`}
          helpText="How close your pricing estimates are to actual sales"
          benchmark="Target: 98-102%"
        />
      </MetricCardGroup>

      {/* Absorption and Inventory */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.absorptionTrend.length > 0 && (
          <LineChart
            title={t.absorptionTrend || "Absorption Rate Trend"}
            description="Monthly market absorption"
            data={data.absorptionTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "absorptionRate", label: "Absorption %", color: "hsl(var(--chart-1))" },
              { dataKey: "sold", label: "Properties Sold", color: "hsl(var(--chart-2))" },
            ]}
            height={250}
          />
        )}

        {data.inventoryLevels.byStatus.length > 0 && (
          <StatsChart
            title={t.inventoryByStatus || "Inventory by Status"}
            description="Current property distribution"
            data={data.inventoryLevels.byStatus}
          />
        )}
      </div>

      {/* Inventory Trend and Price Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.inventoryTrend.length > 0 && (
          <LineChart
            title={t.inventoryTrend || "Inventory Flow"}
            description="New listings vs sold properties"
            data={data.inventoryTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "newListings", label: "New Listings", color: "hsl(var(--chart-1))" },
              { dataKey: "sold", label: "Sold", color: "hsl(var(--chart-2))" },
              { dataKey: "netChange", label: "Net Change", color: "hsl(var(--chart-3))", strokeDasharray: "5 5" },
            ]}
            height={250}
          />
        )}

        {data.medianPriceTrend.length > 0 && (
          <LineChart
            title={t.priceTrend || "Price Trend"}
            description="Median and average sale prices"
            data={data.medianPriceTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "median", label: "Median", color: "hsl(var(--chart-1))" },
              { dataKey: "average", label: "Average", color: "hsl(var(--chart-2))", strokeDasharray: "5 5" },
            ]}
            height={250}
          />
        )}
      </div>

      {/* Absorption by Area and CMA Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.absorptionByArea.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.absorptionByArea || "Absorption by Area"}</CardTitle>
              <CardDescription>Market activity by geographic area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.absorptionByArea.slice(0, 8).map((area) => (
                  <div key={area.area} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{area.area}</p>
                      <p className="text-xs text-muted-foreground">
                        {area.activeListings} active, {area.soldLastMonth} sold/mo
                      </p>
                    </div>
                    <span className="font-semibold">{area.absorptionRate}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.cmaDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.cmaDistribution || "CMA Accuracy Distribution"}</CardTitle>
              <CardDescription>How your estimates compare to actual sales</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.cmaDistribution.map((d) => ({
                  name: d.name,
                  Number: d.value,
                }))}
                title=""
              />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-red-50 dark:bg-red-950">
                  <p className="text-lg font-bold text-red-600">{data.cmaAccuracy.overEstimated}</p>
                  <p className="text-xs text-muted-foreground">Over-estimated</p>
                </div>
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950">
                  <p className="text-lg font-bold text-emerald-600">{data.cmaAccuracy.onTarget || 0}</p>
                  <p className="text-xs text-muted-foreground">On Target</p>
                </div>
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950">
                  <p className="text-lg font-bold text-blue-600">{data.cmaAccuracy.underEstimated}</p>
                  <p className="text-xs text-muted-foreground">Under-estimated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inventory by Type and Area */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.inventoryLevels.byType.length > 0 && (
          <StatsChart
            title={t.inventoryByType || "Inventory by Type"}
            description="Active listings by property type"
            data={data.inventoryLevels.byType}
          />
        )}

        {data.inventoryLevels.byArea.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.topAreas || "Top Areas by Inventory"}</CardTitle>
              <CardDescription>Areas with most active listings</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.inventoryLevels.byArea.slice(0, 8).map((a) => ({
                  name: a.name,
                  Number: a.value,
                }))}
                title=""
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Market Summary Card */}
      {data.marketDataSummary && (
        <Card>
          <CardHeader>
            <CardTitle>{t.marketSummary || "Market Summary"}</CardTitle>
            <CardDescription>
              Latest market data for {data.marketDataSummary.area}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-2xl font-bold">{data.marketDataSummary.activeListings}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sold Listings</p>
                <p className="text-2xl font-bold">{data.marketDataSummary.soldListings}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Median Price</p>
                <p className="text-2xl font-bold">€{data.marketDataSummary.medianSalePrice.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Days on Market</p>
                <p className="text-2xl font-bold">{data.marketDataSummary.averageDaysOnMarket}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Absorption Rate</p>
                <p className="text-2xl font-bold">{data.marketDataSummary.absorptionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
