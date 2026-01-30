"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewClientWizard } from "../clients/components/NewClientWizard";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../accounts/table-components/columns";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ClientCard } from "./ClientCard";
import { SharedClientCard } from "./SharedClientCard";
import { Users, UserCheck, UserPlus, Building2, Share2, FileSpreadsheet } from "lucide-react";
import moment from "moment";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { SharedClientData } from "@/actions/crm/get-shared-clients";
import { SharedActionModals } from "@/components/entity";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { ExportButton } from "@/components/export";

interface ClientsPageViewProps {
  agencyClients: any[];
  sharedClients: SharedClientData[];
  crmData: any;
}

export default function ClientsPageView({
  agencyClients = [],
  sharedClients = [],
  crmData,
}: ClientsPageViewProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("agency");
  const t = useTranslations("crm");
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { users } = crmData;

  // Stats for agency clients
  const totalClients = agencyClients.length;
  const activeClients = agencyClients.filter((c: { status?: string }) => c.status === "Active").length;
  const newClients = agencyClients.filter((c: { createdAt?: string | Date }) =>
    moment(c.createdAt).isAfter(moment().subtract(30, "days"))
  ).length;

  // Filter data for grid view
  const filteredAgencyClients = useMemo(() => {
    return agencyClients.filter((item: any) => {
      // Text search filter
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter (if applicable)
      const statusFilter = selectedFilters.status || [];
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);
      
      return matchesSearch && matchesStatus;
    });
  }, [agencyClients, searchQuery, selectedFilters]);

  const filteredSharedClients = useMemo(() => {
    return sharedClients.filter((item) =>
      item.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.primary_email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sharedClients, searchQuery]);

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
      id: "status",
      title: t("CrmAccountsTable.status") || "Status",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
        { label: "Lead", value: "Lead" },
      ],
    },
  ], [t]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("Stats.totalClients")}
          value={totalClients.toString()}
          icon={<Users className="h-4 w-4" />}
          description={t("Stats.allContacts")}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noClientsYet")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.activeClients")}
          value={activeClients.toString()}
          icon={<UserCheck className="h-4 w-4" />}
          description={t("Stats.currentlyActive")}
          trendUp={activeClients > 0}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noActiveClients")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.new30d")}
          value={newClients.toString()}
          icon={<UserPlus className="h-4 w-4" />}
          description={t("Stats.addedThisMonth")}
          trendUp={newClients > 0}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noRecentActivity")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.sharedWithYou")}
          value={sharedClients.length.toString()}
          icon={<Share2 className="h-4 w-4" />}
          description={t("Stats.fromConnections")}
          actionHref={`/${locale}/app/connections`}
          actionLabel={t("Stats.findAgents")}
          emptyMessage={t("Stats.connectToReceive")}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="agency">
            <Building2 className="h-4 w-4 shrink-0" />
            {t("Tabs.agencyClients")}
            {totalClients > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs font-medium">
                {totalClients}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared">
            <Share2 className="h-4 w-4 shrink-0" />
            {t("Tabs.sharedWithMe")}
            {sharedClients.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                {sharedClients.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agency Clients Tab */}
        <TabsContent value="agency" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{t("Tabs.agencyClients")}</CardTitle>
                  <CardDescription>{t("Tabs.agencyClientsDescription")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ViewToggle view={view} setView={setView} />
                  <ExportButton
                    module="crm"
                    totalRows={agencyClients.length}
                    filteredRows={filteredAgencyClients.length}
                    filters={{
                      status: selectedFilters.status,
                      search: searchQuery,
                    }}
                  />
                  <Button variant="outline" asChild>
                    <Link href={`/${locale}/app/crm/import`}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Import
                    </Link>
                  </Button>
                  <Sheet open={open} onOpenChange={() => setOpen(false)}>
                    <Button className="flex-1 sm:flex-none" onClick={() => setOpen(true)}>
                      + {t("CrmForm.title")}
                    </Button>
                    <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] space-y-2">
                      <SheetHeader>
                        <SheetTitle>{t("CrmForm.title")}</SheetTitle>
                      </SheetHeader>
                      <div className="h-full overflow-y-auto">
                        <NewClientWizard users={users} onFinish={() => setOpen(false)} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!agencyClients || agencyClients.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{t("EmptyState.noAgencyClients")}</p>
                  <p className="text-sm mt-1">{t("EmptyState.createFirstClient")}</p>
                </div>
              ) : view === "list" ? (
                <DataTable
                  data={agencyClients}
                  columns={getColumns(users)}
                  searchKey="name"
                  searchPlaceholder={t("CrmAccountsTable.filterPlaceholder")}
                />
              ) : (
                <div className="space-y-4">
                  <GridToolbar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t("CrmAccountsTable.filterPlaceholder")}
                    filters={gridFilters}
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onReset={handleReset}
                  />
                  {filteredAgencyClients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
                  ) : (
                    <VirtualizedGrid
                      items={filteredAgencyClients}
                      getItemKey={(client: { id: string }) => client.id}
                      renderItem={(client: any, index: number) => (
                        <ClientCard data={client} />
                      )}
                      rowHeight={280}
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

        {/* Shared Clients Tab */}
        <TabsContent value="shared" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-warning" />
                    {t("Tabs.sharedWithMe")}
                  </CardTitle>
                  <CardDescription>{t("Tabs.sharedClientsDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {sharedClients.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{t("EmptyState.noSharedClients")}</p>
                  <p className="text-sm mt-1">{t("EmptyState.connectToReceive")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <GridToolbar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t("CrmAccountsTable.filterPlaceholder")}
                    onReset={() => setSearchQuery("")}
                  />
                  {filteredSharedClients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
                  ) : (
                    <VirtualizedGrid
                      items={filteredSharedClients}
                      getItemKey={(client) => client.shareId}
                      renderItem={(client, index) => (
                        <SharedClientCard data={client} />
                      )}
                      rowHeight={280}
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
    </div>
  );
}
