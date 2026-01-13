"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { StatsChart } from "../../components/dashboard/StatsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, Building2, Scale, Timer } from "lucide-react";

interface ListingMetricsTabProps {
  data: {
    listToSaleRatio: { ratio: number; count: number; aboveAsking: number; belowAsking: number };
    listToSaleDistribution: Array<{ name: string; value: number }>;
    inventory: { active: number; pending: number; total: number; byStatus: Array<{ status: string; count: number }> };
    inventoryByType: Array<{ name: string; value: number }>;
    inventoryTrend: Array<{ name: string; newListings: number; sold: number }>;
    sellerBuyerRatio: { sellerRatio: number; sellerCount: number; sellerCommission: number; buyerCount: number; buyerCommission: number; dualCount: number; dualCommission: number; total: number };
    transactionTypes: Array<{ name: string; value: number }>;
    timeToContract: { average: number; median: number; count: number };
    timeToContractTrend: Array<{ name: string; average: number; count: number }>;
  };
  dict: Record<string, any>;
}

export function ListingMetricsTab({ data, dict }: ListingMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.listToSaleRatio || "List-to-Sale Ratio"}
          value={data.listToSaleRatio.ratio}
          suffix="%"
          icon={<Percent className="h-4 w-4 text-primary" />}
          description={`${data.listToSaleRatio.aboveAsking} sold at/above, ${data.listToSaleRatio.belowAsking} below asking`}
          helpText="How close to asking price properties sell. Top agents often hit 98-102%+"
          benchmark="Top agents: 98-102%"
        />
        <MetricCard
          title={t.listingInventory || "Active Listings"}
          value={data.inventory.active}
          icon={<Building2 className="h-4 w-4 text-primary" />}
          description={`${data.inventory.pending} pending, ${data.inventory.total} total`}
          helpText="Number of active listings creates recurring marketing opportunities"
        />
        <MetricCard
          title={t.sellerRatio || "Seller Transaction Ratio"}
          value={data.sellerBuyerRatio.sellerRatio}
          suffix="%"
          icon={<Scale className="h-4 w-4 text-primary" />}
          description={`${data.sellerBuyerRatio.sellerCount} seller, ${data.sellerBuyerRatio.buyerCount} buyer deals`}
          helpText="Many top agents focus heavily on listings for leverage"
        />
        <MetricCard
          title={t.timeToContract || "Avg Time to Contract"}
          value={data.timeToContract.average}
          suffix=" days"
          icon={<Timer className="h-4 w-4 text-primary" />}
          description={`Median: ${data.timeToContract.median} days (${data.timeToContract.count} properties)`}
          helpText="How quickly you get offers on listings"
        />
      </MetricCardGroup>

      {/* List-to-Sale Distribution and Transaction Types */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.listToSaleDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.listToSaleDistribution || "Sale Price Distribution"}</CardTitle>
              <CardDescription>How properties sell relative to asking price</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.listToSaleDistribution.map((d) => ({
                  name: d.name,
                  Number: d.value,
                }))}
                title=""
              />
            </CardContent>
          </Card>
        )}

        {data.transactionTypes.length > 0 && (
          <StatsChart
            title={t.transactionTypes || "Transaction Types"}
            description="Distribution of seller vs buyer deals"
            data={data.transactionTypes}
          />
        )}
      </div>

      {/* Inventory Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.inventoryByType.length > 0 && (
          <StatsChart
            title={t.inventoryByType || "Inventory by Property Type"}
            description="Active listings by property type"
            data={data.inventoryByType}
          />
        )}

        {/* Commission by Transaction Type */}
        <Card>
          <CardHeader>
            <CardTitle>{t.commissionByType || "Commission by Type"}</CardTitle>
            <CardDescription>Revenue breakdown by transaction side</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-chart-1" />
                  <span className="text-sm">Seller (Listing)</span>
                </div>
                <span className="font-semibold">€{data.sellerBuyerRatio.sellerCommission.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-chart-2" />
                  <span className="text-sm">Buyer</span>
                </div>
                <span className="font-semibold">€{data.sellerBuyerRatio.buyerCommission.toLocaleString()}</span>
              </div>
              {data.sellerBuyerRatio.dualCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-3" />
                    <span className="text-sm">Dual Agency</span>
                  </div>
                  <span className="font-semibold">€{data.sellerBuyerRatio.dualCommission.toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.inventoryTrend.length > 0 && (
          <LineChart
            title={t.inventoryTrend || "Listing Activity Trend"}
            description="New listings vs sold properties"
            data={data.inventoryTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "newListings", label: "New Listings", color: "hsl(var(--chart-1))" },
              { dataKey: "sold", label: "Sold", color: "hsl(var(--chart-2))" },
            ]}
            height={250}
          />
        )}

        {data.timeToContractTrend.length > 0 && (
          <LineChart
            title={t.timeToContractTrend || "Time to Contract Trend"}
            description="Monthly average days to contract"
            data={data.timeToContractTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "average", label: "Avg Days", color: "hsl(var(--chart-3))" },
            ]}
            height={250}
            valueFormatter={(v) => `${v} days`}
          />
        )}
      </div>
    </div>
  );
}
