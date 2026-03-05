"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewPropertyWizard } from "../properties/components/NewPropertyWizard";
import { PropertyDataTable } from "../properties/table-components/data-table";
import { getColumns } from "../properties/table-components/columns";
import { QuickAddProperty } from "./QuickAddProperty";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PropertyCard } from "./PropertyCard";
import { SharedPropertyCard } from "./SharedPropertyCard";
import { Home, Activity, DollarSign, Building2, Share2, FileSpreadsheet } from "lucide-react";
import type { SharedPropertyData } from "@/actions/mls/get-shared-properties";
import { useOrgUsers } from "@/hooks/swr";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SharedActionModals } from "@/components/entity";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { ExportButton } from "@/components/export";
import { PublishToPortalsModal } from "@/components/modals/PublishToPortalsModal";
import { statuses } from "../properties/table-data/data";
import { formatCompactCurrency } from "@/lib/formatting";

interface PropertiesPageViewProps {
  agencyProperties: any[];
  sharedProperties: SharedPropertyData[];
}

export default function PropertiesPageView({
  agencyProperties = [],
  sharedProperties = [],
}: PropertiesPageViewProps) {
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("agency");
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<any[]>([]);
  const t = useTranslations("mls");
  const commonT = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter data for grid view - must be defined before callbacks that use it
  const filteredAgencyProperties = useMemo(() => {
    return agencyProperties.filter((item) => {
      // Text search filter
      const matchesSearch = item.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusFilter = selectedFilters.property_status || [];
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.property_status);
      
      return matchesSearch && matchesStatus;
    });
  }, [agencyProperties, searchQuery, selectedFilters]);

  // Handle publish to portals
  const handlePublishToPortals = useCallback(async (propertyIds: string[], portalIds: string[]) => {
    const response = await fetch("/api/mls/properties/bulk-publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyIds, portalIds }),
    });

    if (!response.ok) {
      throw new Error("Failed to publish properties");
    }

    router.refresh();
  }, [router]);

  // Handle "Export to Portals" click from the Export dropdown
  const handleExportToPortalsClick = useCallback(() => {
    // Use filtered properties for export
    setSelectedForPublish(filteredAgencyProperties);
    setPublishModalOpen(true);
  }, [filteredAgencyProperties]);

  const statusOptions = useMemo(() => {
    return statuses.map((status) => ({
      ...status,
      label: t(`PropertyForm.status.${status.value}`),
    }));
  }, [t]);

  // Stats for agency properties
  const totalProperties = agencyProperties.length;
  const activeProperties = agencyProperties.filter(
    (p) => p.property_status === "ACTIVE"
  ).length;
  const totalValue = agencyProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const filteredSharedProperties = useMemo(() => {
    return sharedProperties.filter((item) =>
      item.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sharedProperties, searchQuery]);

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
          title={t("Stats.totalProperties")}
          value={totalProperties.toString()}
          icon={<Home className="h-4 w-4" />}
          description={t("Stats.allTimeProperties")}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.noPropertiesYet")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.activeProperties")}
          value={activeProperties.toString()}
          icon={<Activity className="h-4 w-4" />}
          description={t("Stats.currentlyOnMarket")}
          trendUp={activeProperties > 0}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.noActiveListings")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.portfolioValue")}
          value={formatCompactCurrency(totalValue)}
          icon={<DollarSign className="h-4 w-4" />}
          description={t("Stats.totalListingValue")}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.addPropertiesToTrack")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.sharedWithYou")}
          value={sharedProperties.length.toString()}
          icon={<Share2 className="h-4 w-4" />}
          description={t("Stats.fromConnections")}
          actionHref={`/${locale}/app/network/profile?tab=find`}
          actionLabel={t("Stats.findAgents")}
          emptyMessage={t("Stats.connectToReceive")}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="agency">
            <Building2 className="h-4 w-4 shrink-0" />
            {t("Tabs.agencyProperties")}
            {totalProperties > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs font-medium">
                {totalProperties}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared">
            <Share2 className="h-4 w-4 shrink-0" />
            {t("Tabs.sharedWithMe")}
            {sharedProperties.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning dark:text-amber-300 text-xs font-medium">
                {sharedProperties.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agency Properties Tab */}
        <TabsContent value="agency" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5">
                  <CardTitle>{t("Tabs.agencyProperties")}</CardTitle>
                  <CardDescription>{t("Tabs.agencyPropertiesDescription")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    + {commonT("quickAdd")}
                  </Button>
                  <QuickAddProperty
                    open={quickAddOpen}
                    onOpenChange={setQuickAddOpen}
                    users={users}
                  />
                  <ExportButton
                    module="mls"
                    totalRows={agencyProperties.length}
                    filteredRows={filteredAgencyProperties.length}
                    filters={{
                      status: selectedFilters.property_status,
                      search: searchQuery,
                    }}
                    enableTemplates
                    entityData={filteredAgencyProperties}
                    onPortalsClick={handleExportToPortalsClick}
                  />
                  <Button
                    variant="outline"
                    leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                    asChild
                  >
                    <Link href={`/${locale}/app/mls/import`}>
                      {commonT("import")}
                    </Link>
                  </Button>
                  <Sheet open={open} onOpenChange={() => setOpen(false)}>
                    <Button onClick={() => setOpen(true)} className="flex-1 sm:flex-none">
                      + {t("PropertyForm.title")}
                    </Button>
                    <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] space-y-2">
                      <SheetHeader>
                        <SheetTitle>{t("PropertyForm.title")}</SheetTitle>
                      </SheetHeader>
                      <div className="h-full overflow-y-auto">
                        <NewPropertyWizard users={users} onFinish={() => setOpen(false)} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!agencyProperties || agencyProperties.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{t("EmptyState.noAgencyProperties")}</p>
                  <p className="text-sm mt-1">{t("EmptyState.createFirstProperty")}</p>
                </div>
              ) : view === "list" ? (
                <PropertyDataTable
                  data={agencyProperties}
                  columns={getColumns(users)}
                  toolbarRight={<ViewToggle view={view} setView={setView} />}
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
                    rightContent={<ViewToggle view={view} setView={setView} />}
                  />
                  {filteredAgencyProperties.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
                  ) : (
                    <VirtualizedGrid
                      items={filteredAgencyProperties}
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
        </TabsContent>

        {/* Shared Properties Tab */}
        <TabsContent value="shared" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-warning" />
                    {t("Tabs.sharedWithMe")}
                  </CardTitle>
                  <CardDescription>{t("Tabs.sharedPropertiesDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {sharedProperties.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{t("EmptyState.noSharedProperties")}</p>
                  <p className="text-sm mt-1">{t("EmptyState.connectToReceive")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <GridToolbar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t("MlsPropertiesTable.filterPlaceholder")}
                    onReset={() => setSearchQuery("")}
                  />
                  {filteredSharedProperties.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
                  ) : (
                    <VirtualizedGrid
                      items={filteredSharedProperties}
                      getItemKey={(property) => property.shareId}
                      renderItem={(property, index) => (
                        <SharedPropertyCard data={property} index={index} />
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
        </TabsContent>
      </Tabs>

      {/* Shared modals for delete, share, schedule actions */}
      <SharedActionModals />

      {/* Publish to Portals Modal */}
      <PublishToPortalsModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        selectedProperties={selectedForPublish}
        onPublish={handlePublishToPortals}
      />
    </div>
  );
}
