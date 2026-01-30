"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../../properties/table-components/columns";
import { statuses } from "../../properties/table-data/data";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PropertyCard } from "../../components/PropertyCard";
import { Globe, Activity, DollarSign, TrendingUp } from "lucide-react";
import { useOrgUsers } from "@/hooks/swr";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar } from "@/components/ui/grid-toolbar";

interface ListingsPageViewProps {
  listings: any[];
}

export default function ListingsPageView({ listings = [] }: ListingsPageViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const t = useTranslations("mls");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const statusOptions = useMemo(() => {
    return statuses.map((status) => ({
      ...status,
      label: t(`PropertyForm.status.${status.value}`),
    }));
  }, [t]);

  // Stats for listings
  const totalListings = listings.length;
  const activeListings = listings.filter(
    (p) => p.property_status === "ACTIVE"
  ).length;
  const totalValue = listings.reduce((sum, p) => sum + (p.price || 0), 0);
  const avgPrice = totalListings > 0 ? totalValue / totalListings : 0;

  // Filter data for grid view
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Text search filter
      const matchesSearch = item.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusFilter = selectedFilters.property_status || [];
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.property_status);
      
      return matchesSearch && matchesStatus;
    });
  }, [listings, searchQuery, selectedFilters]);

  // Grid toolbar handlers
  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterId]: values,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({});
  }, []);

  // Grid filters config
  const gridFilters = useMemo(() => [
    {
      id: "property_status",
      title: t("MlsPropertiesTable.status"),
      options: statusOptions,
    },
  ], [t, statusOptions]);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("Listings.totalListings") || "Published Listings"}
          value={totalListings.toString()}
          icon={<Globe className="h-4 w-4" />}
          description={t("Listings.visibleOnPortals") || "Visible on portals"}
        />
        <StatsCard
          title={t("Listings.activeListings") || "Active Listings"}
          value={activeListings.toString()}
          icon={<Activity className="h-4 w-4" />}
          description={t("Listings.currentlyLive") || "Currently live"}
          trendUp={activeListings > 0}
        />
        <StatsCard
          title={t("Listings.totalValue") || "Total Value"}
          value={`€${(totalValue / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-4 w-4" />}
          description={t("Listings.publishedListingValue") || "Published listing value"}
        />
        <StatsCard
          title={t("Listings.avgPrice") || "Avg. Price"}
          value={`€${(avgPrice / 1000).toFixed(0)}K`}
          icon={<TrendingUp className="h-4 w-4" />}
          description={t("Listings.averageListingPrice") || "Average listing price"}
        />
      </div>

      {/* Listings Table/Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-success" />
                {t("Listings.title") || "Published Listings"}
              </CardTitle>
              <CardDescription>
                {t("Listings.description") || "Properties published to external portals like xe.gr"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ViewToggle view={view} setView={setView} />
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {!listings || listings.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">{t("Listings.emptyTitle") || "No published listings"}</p>
              <p className="text-sm mt-1">
                {t("Listings.emptyDescription") || "Publish properties from the Properties page to see them here"}
              </p>
            </div>
          ) : view === "list" ? (
            <DataTable
              data={listings}
              columns={getColumns(users)}
              searchKey="property_name"
              searchPlaceholder={t("MlsPropertiesTable.filterPlaceholder")}
              filters={[
                {
                  column: "property_status",
                  title: t("MlsPropertiesTable.status"),
                  options: statusOptions,
                },
              ]}
            />
          ) : (
            <div className="space-y-4">
              <GridToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("MlsPropertiesTable.filterPlaceholder")}
                filters={gridFilters}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
              />
              {filteredListings.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t("EmptyState.noResults")}
                </div>
              ) : (
                <VirtualizedGrid
                  items={filteredListings}
                  getItemKey={(property) => property.id}
                  renderItem={(property, index) => (
                    <PropertyCard data={property} index={index} />
                  )}
                  rowHeight={380}
                  gap={16}
                  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                  maxHeight="calc(100vh - 400px)"
                  showScrollToTop
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
