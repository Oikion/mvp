"use client";

import React from "react";
import { Building2, CheckCircle2, DollarSign, TrendingUp, Clock, Users, Percent, Briefcase } from "lucide-react";
import { MetricCard, MetricCardGroup } from "@/components/reports/MetricCard";
import { ExportButton } from "@/components/export";
import type { getAllKPIMetrics } from "@/actions/reports/get-kpi-metrics";

interface ReportsPageViewProps {
  kpiMetrics: Awaited<ReturnType<typeof getAllKPIMetrics>>;
}

function formatEuro(value: number): string {
  if (value === 0) return "—";
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toLocaleString()}`;
}

export function ReportsPageView({ kpiMetrics }: ReportsPageViewProps) {
  const {
    activeListings,
    propertiesSold,
    grossCommissionIncome,
    avgSalePrice,
    avgDaysOnMarket,
    totalClients,
    listToSaleRatio,
    openDeals,
  } = kpiMetrics;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton module="reports" />
      </div>

      <MetricCardGroup columns={4}>
        <MetricCard
          title="Active Listings"
          value={activeListings}
          description="Properties currently on market"
          icon={<Building2 className="h-4 w-4 text-primary" />}
          helpText="Properties with ACTIVE status, excluding drafts"
        />

        <MetricCard
          title="Properties Sold"
          value={propertiesSold}
          description="Total sold (all time)"
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
          helpText="All properties with SOLD status"
        />

        <MetricCard
          title="Total Revenue (GCI)"
          value={formatEuro(grossCommissionIncome)}
          description="Gross commission income earned"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          helpText="Sum of commissions from all completed deals"
        />

        <MetricCard
          title="Avg Sale Price"
          value={formatEuro(avgSalePrice)}
          description="Average price of sold properties"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          helpText="Average final sale price across all sold properties"
        />

        <MetricCard
          title="Avg Days on Market"
          value={avgDaysOnMarket === 0 ? "—" : avgDaysOnMarket}
          suffix={avgDaysOnMarket > 0 ? "days" : undefined}
          description="Average time from listing to sale"
          icon={<Clock className="h-4 w-4 text-primary" />}
          helpText="Average days on market for sold properties"
        />

        <MetricCard
          title="Total Clients"
          value={totalClients}
          description="Clients in your CRM"
          icon={<Users className="h-4 w-4 text-primary" />}
          helpText="All clients (excluding drafts)"
        />

        <MetricCard
          title="List-to-Sale Ratio"
          value={listToSaleRatio === 0 ? "—" : listToSaleRatio}
          suffix={listToSaleRatio > 0 ? "%" : undefined}
          description="Avg sale price vs. listing price"
          icon={<Percent className="h-4 w-4 text-primary" />}
          helpText="100% means sold at exactly asking price. Above 100% means above asking."
          benchmark="Target: ≥ 97%"
        />

        <MetricCard
          title="Open Deals"
          value={openDeals}
          description="Deals in progress"
          icon={<Briefcase className="h-4 w-4 text-primary" />}
          helpText="Active deals (proposed, negotiating, accepted, or in progress)"
        />
      </MetricCardGroup>
    </div>
  );
}
