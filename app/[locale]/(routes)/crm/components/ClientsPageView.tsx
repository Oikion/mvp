"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewClientWizard } from "../clients/components/NewClientWizard";
import { AccountDataTable } from "../accounts/table-components/data-table";
import { getColumns } from "../accounts/table-components/columns";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ClientCard } from "./ClientCard";
import { SharedClientCard } from "./SharedClientCard";
import { Users, UserCheck, UserPlus, Clock, Search, Building2, Share2 } from "lucide-react";
import moment from "moment";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import type { SharedClientData } from "@/actions/crm/get-shared-clients";

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
  const [activeTab, setActiveTab] = useState("agency");
  const t = useTranslations("crm");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, industries } = crmData;

  // Stats for agency clients
  const totalClients = agencyClients.length;
  const activeClients = agencyClients.filter((c: any) => c.status === "Active").length;
  const newClients = agencyClients.filter((c: any) =>
    moment(c.createdAt).isAfter(moment().subtract(30, "days"))
  ).length;
  const assignedClients = agencyClients.filter((c: any) => c.assigned_to).length;

  // Filter data for grid view
  const filteredAgencyClients = agencyClients.filter(
    (item: any) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedClients = sharedClients.filter(
    (item) =>
      item.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.primary_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("Stats.totalClients")}
          value={totalClients.toString()}
          icon={Users}
          description={t("Stats.allContacts")}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noClientsYet")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.activeClients")}
          value={activeClients.toString()}
          icon={UserCheck}
          description={t("Stats.currentlyActive")}
          trendUp={activeClients > 0}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noActiveClients")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.new30d")}
          value={newClients.toString()}
          icon={UserPlus}
          description={t("Stats.addedThisMonth")}
          trendUp={newClients > 0}
          actionLabel={t("Stats.addClient")}
          emptyMessage={t("Stats.noRecentActivity")}
          onAction={() => setOpen(true)}
        />
        <StatsCard
          title={t("Stats.sharedWithYou")}
          value={sharedClients.length.toString()}
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
            <span>{t("Tabs.agencyClients")}</span>
            {totalClients > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium">
                {totalClients}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span>{t("Tabs.sharedWithMe")}</span>
            {sharedClients.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
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
                  <Sheet open={open} onOpenChange={() => setOpen(false)}>
                    <Button className="flex-1 sm:flex-none" onClick={() => setOpen(true)}>
                      + {t("CrmForm.title")}
                    </Button>
                    <SheetContent className="min-w-[1000px] space-y-2">
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
                <AccountDataTable
                  data={agencyClients}
                  columns={getColumns(users)}
                  industries={industries}
                  users={users}
                />
              ) : (
                <div className="space-y-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("CrmAccountsTable.filterPlaceholder")}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAgencyClients.map((client: any) => (
                      <ClientCard key={client.id} data={client} />
                    ))}
                  </div>
                  {filteredAgencyClients.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {t("EmptyState.noResults")}
                    </div>
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
                    <Share2 className="h-5 w-5 text-amber-600" />
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
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("CrmAccountsTable.filterPlaceholder")}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSharedClients.map((client) => (
                      <SharedClientCard key={client.shareId} data={client} />
                    ))}
                  </div>
                  {filteredSharedClients.length === 0 && (
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


