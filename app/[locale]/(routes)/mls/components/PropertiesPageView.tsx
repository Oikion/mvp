"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewPropertyWizard } from "../properties/components/NewPropertyWizard";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../properties/table-components/columns";
import { statuses } from "../properties/table-data/data";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PropertyCard } from "./PropertyCard";
import { SharedPropertyCard } from "./SharedPropertyCard";
import { Home, Activity, DollarSign, Search, Building2, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SharedPropertyData } from "@/actions/mls/get-shared-properties";
import { useOrgUsers } from "@/hooks/swr";

interface PropertiesPageViewProps {
  agencyProperties: any[];
  sharedProperties: SharedPropertyData[];
}

export default function PropertiesPageView({
  agencyProperties = [],
  sharedProperties = [],
}: PropertiesPageViewProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("agency");
  const t = useTranslations("mls");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const statusOptions = statuses.map((status) => ({
    ...status,
    label: t(`PropertyForm.status.${status.value}`),
  }));

  // Stats for agency properties
  const totalProperties = agencyProperties.length;
  const activeProperties = agencyProperties.filter(
    (p) => p.property_status === "ACTIVE"
  ).length;
  const totalValue = agencyProperties.reduce((sum, p) => sum + (p.price || 0), 0);

  // Filter data for grid view
  const filteredAgencyProperties = agencyProperties.filter((item) =>
    item.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedProperties = sharedProperties.filter((item) =>
    item.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("Stats.totalProperties")}
          value={totalProperties.toString()}
          icon={Home}
          description={t("Stats.allTimeProperties")}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.noPropertiesYet")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.activeProperties")}
          value={activeProperties.toString()}
          icon={Activity}
          description={t("Stats.currentlyOnMarket")}
          trendUp={activeProperties > 0}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.noActiveListings")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.portfolioValue")}
          value={`€${(totalValue / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          description={t("Stats.totalListingValue")}
          actionLabel={t("Stats.addProperty")}
          emptyMessage={t("Stats.addPropertiesToTrack")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.sharedWithYou")}
          value={sharedProperties.length.toString()}
          icon={Share2}
          description={t("Stats.fromConnections")}
          actionHref="/connections"
          actionLabel={t("Stats.findAgents")}
          emptyMessage={t("Stats.connectToReceive")}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex bg-muted p-1">
          <TabsTrigger value="agency" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span>{t("Tabs.agencyProperties")}</span>
            {totalProperties > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium">
                {totalProperties}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span>{t("Tabs.sharedWithMe")}</span>
            {sharedProperties.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
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
                <div>
                  <CardTitle>{t("Tabs.agencyProperties")}</CardTitle>
                  <CardDescription>{t("Tabs.agencyPropertiesDescription")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ViewToggle view={view} setView={setView} />
                  <Sheet open={open} onOpenChange={() => setOpen(false)}>
                    <Button onClick={() => setOpen(true)} className="flex-1 sm:flex-none">
                      + {t("PropertyForm.title")}
                    </Button>
                    <SheetContent className="min-w-[1000px] space-y-2">
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
                <DataTable
                  data={agencyProperties}
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
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("MlsPropertiesTable.filterPlaceholder")}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAgencyProperties.map((property) => (
                      <PropertyCard key={property.id} data={property} />
                    ))}
                  </div>
                  {filteredAgencyProperties.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
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
                    <Share2 className="h-5 w-5 text-amber-600" />
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
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("MlsPropertiesTable.filterPlaceholder")}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSharedProperties.map((property) => (
                      <SharedPropertyCard key={property.shareId} data={property} />
                    ))}
                  </div>
                  {filteredSharedProperties.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


