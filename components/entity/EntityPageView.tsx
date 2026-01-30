"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { LucideIcon, Search, Building2, Share2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table/data-table";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";

/**
 * Configuration for a stat card
 */
export interface StatConfig {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  trendUp?: boolean;
  actionLabel?: string;
  actionHref?: string;
  emptyMessage?: string;
  onAction?: () => void;
}

/**
 * Configuration for table filters
 */
export interface FilterConfig {
  column: string;
  title: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

/**
 * Props for the EntityPageView component
 */
export interface EntityPageViewProps<TAgency, TShared> {
  /** Type of entity for translations */
  entityType: "property" | "client";
  /** Agency items data */
  agencyItems: TAgency[];
  /** Shared items data */
  sharedItems: TShared[];
  /** Stats cards configuration */
  stats: StatConfig[];
  /** Table columns for agency items */
  columns: ColumnDef<TAgency, unknown>[];
  /** Key to search on in the table */
  searchKey: string;
  /** Placeholder for search input */
  searchPlaceholder: string;
  /** Table filter configurations */
  filters?: FilterConfig[];
  /** Render function for agency item card in grid view */
  renderCard: (item: TAgency) => ReactNode;
  /** Render function for shared item card */
  renderSharedCard: (item: TShared) => ReactNode;
  /** Component to render in the create sheet */
  CreateForm: React.ComponentType<{ onFinish: () => void }>;
  /** Title for the create form sheet */
  createFormTitle: string;
  /** Button label for create action */
  createButtonLabel: string;
  /** Icon for empty agency state */
  EmptyIcon: LucideIcon;
  /** Get name from item for filtering */
  getItemName: (item: TAgency) => string;
  /** Get name from shared item for filtering */
  getSharedItemName: (item: TShared) => string;
  /** Translation keys */
  translations: {
    agencyTabLabel: string;
    agencyTabDescription: string;
    sharedTabLabel: string;
    sharedTabDescription: string;
    noAgencyItems: string;
    createFirstItem: string;
    noSharedItems: string;
    connectToReceive: string;
    noResults: string;
  };
}

/**
 * Generic entity page view component that provides a consistent layout for
 * listing entities with stats, tabs (agency/shared), grid/list toggle, and create form.
 * 
 * Replaces duplicated PropertiesPageView and ClientsPageView.
 */
export function EntityPageView<TAgency, TShared>({
  entityType,
  agencyItems = [],
  sharedItems = [],
  stats,
  columns,
  searchKey,
  searchPlaceholder,
  filters = [],
  renderCard,
  renderSharedCard,
  CreateForm,
  createFormTitle,
  createButtonLabel,
  EmptyIcon,
  getItemName,
  getSharedItemName,
  translations,
}: EntityPageViewProps<TAgency, TShared>) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("agency");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Filter data for grid view
  const filteredAgencyItems = agencyItems.filter((item) =>
    getItemName(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedItems = sharedItems.filter((item) =>
    getSharedItemName(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAgencyItems = agencyItems.length;
  const totalSharedItems = sharedItems.length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={<IconComponent className="h-4 w-4" />}
              description={stat.description}
              trendUp={stat.trendUp}
              actionLabel={stat.actionLabel}
              actionHref={stat.actionHref}
              emptyMessage={stat.emptyMessage}
              onAction={stat.onAction || (() => setOpen(true))}
            />
          );
        })}
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="agency">
            <Building2 className="h-4 w-4 shrink-0" />
            {translations.agencyTabLabel}
            {totalAgencyItems > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs font-medium">
                {totalAgencyItems}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared">
            <Share2 className="h-4 w-4 shrink-0" />
            {translations.sharedTabLabel}
            {totalSharedItems > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                {totalSharedItems}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agency Items Tab */}
        <TabsContent value="agency" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{translations.agencyTabLabel}</CardTitle>
                  <CardDescription>{translations.agencyTabDescription}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ViewToggle view={view} setView={setView} />
                  <Sheet open={open} onOpenChange={() => setOpen(false)}>
                    <Button onClick={() => setOpen(true)} className="flex-1 sm:flex-none">
                      + {createButtonLabel}
                    </Button>
                    <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] space-y-2">
                      <SheetHeader>
                        <SheetTitle>{createFormTitle}</SheetTitle>
                      </SheetHeader>
                      <div className="h-full overflow-y-auto">
                        <CreateForm onFinish={() => setOpen(false)} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!agencyItems || agencyItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <EmptyIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{translations.noAgencyItems}</p>
                  <p className="text-sm mt-1">{translations.createFirstItem}</p>
                </div>
              ) : view === "list" ? (
                <DataTable
                  data={agencyItems}
                  columns={columns}
                  searchKey={searchKey}
                  searchPlaceholder={searchPlaceholder}
                  filters={filters}
                />
              ) : (
                <div className="space-y-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAgencyItems.map((item, index) => (
                      <React.Fragment key={index}>
                        {renderCard(item)}
                      </React.Fragment>
                    ))}
                  </div>
                  {filteredAgencyItems.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {translations.noResults}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shared Items Tab */}
        <TabsContent value="shared" className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-warning" />
                    {translations.sharedTabLabel}
                  </CardTitle>
                  <CardDescription>{translations.sharedTabDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {sharedItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium">{translations.noSharedItems}</p>
                  <p className="text-sm mt-1">{translations.connectToReceive}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSharedItems.map((item, index) => (
                      <React.Fragment key={index}>
                        {renderSharedCard(item)}
                      </React.Fragment>
                    ))}
                  </div>
                  {filteredSharedItems.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {translations.noResults}
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

