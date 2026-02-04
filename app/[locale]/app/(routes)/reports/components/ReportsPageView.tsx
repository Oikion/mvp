"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/components/export";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Clock, 
  BarChart3 
} from "lucide-react";

import { LeadMetricsTab } from "./LeadMetricsTab";
import { SalesMetricsTab } from "./SalesMetricsTab";
import { ClientMetricsTab } from "./ClientMetricsTab";
import { ListingMetricsTab } from "./ListingMetricsTab";
import { ProductivityMetricsTab } from "./ProductivityMetricsTab";
import { MarketMetricsTab } from "./MarketMetricsTab";

interface ReportsPageViewProps {
  locale: string;
  dict: Record<string, any>;
  leadMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-lead-metrics").getAllLeadMetrics>>;
  salesMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-sales-metrics").getAllSalesMetrics>>;
  clientMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-client-metrics").getAllClientMetrics>>;
  listingMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-listing-metrics").getAllListingMetrics>>;
  productivityMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-productivity-metrics").getAllProductivityMetrics>>;
  marketMetrics: Awaited<ReturnType<typeof import("@/actions/reports/get-market-metrics").getAllMarketMetrics>>;
}

export function ReportsPageView({
  locale,
  dict,
  leadMetrics,
  salesMetrics,
  clientMetrics,
  listingMetrics,
  productivityMetrics,
  marketMetrics,
}: ReportsPageViewProps) {
  const t = dict.reports?.tabs || {};

  const tabs = [
    {
      value: "leads",
      label: t.leads || "Lead Generation",
      icon: TrendingUp,
      description: "Conversion rates, lead sources, pipeline value",
    },
    {
      value: "sales",
      label: t.sales || "Sales Performance",
      icon: DollarSign,
      description: "GCI, transactions, avg price, days on market",
    },
    {
      value: "clients",
      label: t.clients || "Client Development",
      icon: Users,
      description: "Lifetime value, repeat rate, referrals, sphere",
    },
    {
      value: "listings",
      label: t.listings || "Listing Performance",
      icon: Building2,
      description: "List-to-sale ratio, inventory, seller vs buyer",
    },
    {
      value: "productivity",
      label: t.productivity || "Productivity",
      icon: Clock,
      description: "Income per hour, showings, marketing ROI",
    },
    {
      value: "market",
      label: t.market || "Market Intelligence",
      icon: BarChart3,
      description: "Absorption rate, inventory, price trends, CMA",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Export Button Row */}
      <div className="flex justify-end">
        <ExportButton module="reports" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList className="inline-grid grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Lead Generation Tab */}
        <TabsContent value="leads" className="space-y-6 mt-6">
          <LeadMetricsTab data={leadMetrics} dict={dict} />
        </TabsContent>

        {/* Sales Performance Tab */}
        <TabsContent value="sales" className="space-y-6 mt-6">
          <SalesMetricsTab data={salesMetrics} dict={dict} />
        </TabsContent>

        {/* Client Development Tab */}
        <TabsContent value="clients" className="space-y-6 mt-6">
          <ClientMetricsTab data={clientMetrics} dict={dict} />
        </TabsContent>

        {/* Listing Performance Tab */}
        <TabsContent value="listings" className="space-y-6 mt-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ListingMetricsTab data={listingMetrics as any} dict={dict} />
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6 mt-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ProductivityMetricsTab data={productivityMetrics as any} dict={dict} />
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="market" className="space-y-6 mt-6">
          <MarketMetricsTab data={marketMetrics} dict={dict} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
