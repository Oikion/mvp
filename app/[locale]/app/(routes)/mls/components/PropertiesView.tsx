"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NewPropertyWizard } from "../properties/components/NewPropertyWizard";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../properties/table-components/columns";
import { statuses } from "../properties/table-data/data";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PropertyCard } from "./PropertyCard";
import { Home, Activity, DollarSign, Calendar } from "lucide-react";
import moment from "moment";
import { useOrgUsers } from "@/hooks/swr";
import { SharedActionModals } from "@/components/entity";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { useActionModal } from "@/hooks/use-action-modal";
import { Row } from "@tanstack/react-table";
import axios from "axios";
import { toast } from "sonner";

export default function PropertiesView({ data = [] }: { data: any[] }) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const t = useTranslations("mls");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { openDeleteModal } = useActionModal();

  // Get locale from pathname
  const locale = pathname.split("/")[1] || "en";

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard navigation callbacks
  const handleRowOpen = useCallback(
    (row: Row<any>) => {
      const propertyId = row.original.id;
      router.push(`/${locale}/app/mls/properties/${propertyId}`);
    },
    [router, locale]
  );

  const handleRowEdit = useCallback(
    (row: Row<any>) => {
      const propertyId = row.original.id;
      router.push(`/${locale}/app/mls/properties/${propertyId}?edit=true`);
    },
    [router, locale]
  );

  const handleRowDelete = useCallback(
    (rows: Row<any>[]) => {
      if (rows.length === 1) {
        const row = rows[0];
        openDeleteModal({
          entityType: "property",
          entityId: row.original.id,
          entityName: row.original.property_name || "Property",
          onDelete: async () => {
            await axios.delete(`/api/mls/properties/${row.original.id}`);
            router.refresh();
          },
        });
      } else {
        const deleteMultiple = async () => {
          try {
            await Promise.all(
              rows.map((row) =>
                axios.delete(`/api/mls/properties/${row.original.id}`)
              )
            );
            toast.success(`${rows.length} properties deleted successfully`);
            router.refresh();
          } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to delete some properties");
          }
        };
        
        toast(`Delete ${rows.length} properties?`, {
          action: {
            label: "Delete",
            onClick: deleteMultiple,
          },
        });
      }
    },
    [openDeleteModal, router]
  );

  const statusOptions = useMemo(() => {
    return statuses.map(status => ({
      ...status,
      label: t(`PropertyForm.status.${status.value}`)
    }));
  }, [t]);

  // Stats
  const totalProperties = data.length;
  const activeProperties = data.filter(p => p.property_status === 'ACTIVE').length;
  const totalValue = data.reduce((sum, p) => sum + (p.price || 0), 0);
  const newProperties = data.filter(p => moment(p.createdAt).isAfter(moment().subtract(30, 'days'))).length;

  // Filter data for grid view
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Text search filter
      const matchesSearch = item.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusFilter = selectedFilters.property_status || [];
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.property_status);
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, selectedFilters]);

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
          title={t("stats.totalProperties")}
          value={totalProperties.toString()}
          icon={<Home className="h-4 w-4" />}
          description={t("stats.allListings")}
        />
        <StatsCard
          title={t("stats.activeProperties")}
          value={activeProperties.toString()}
          icon={<Activity className="h-4 w-4" />}
          description={t("stats.currentlyOnMarket")}
          trendUp={true}
        />
        <StatsCard
          title={t("stats.portfolioValue")}
          value={`€${(totalValue / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-4 w-4" />}
          description={t("stats.totalListingValue")}
        />
        <StatsCard
          title={t("stats.new30d")}
          value={newProperties.toString()}
          icon={<Calendar className="h-4 w-4" />}
          description={t("stats.addedThisMonth")}
          trend="+2"
          trendUp={true}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>{tCommon("cards.properties")}</CardTitle>
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
                    <NewPropertyWizard
                      users={users}
                      onFinish={() => setOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {!data || data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{tCommon("emptyStates.noProperties")}</div>
          ) : view === "list" ? (
            <DataTable 
              data={data} 
              columns={getColumns(users)} 
              searchKey="property_name"
              searchPlaceholder={t("MlsPropertiesTable.filterPlaceholder")}
              filters={[
                {
                  column: "property_status",
                  title: t("MlsPropertiesTable.status"),
                  options: statusOptions
                }
              ]}
              enableKeyboardNav={true}
              onRowOpen={handleRowOpen}
              onRowEdit={handleRowEdit}
              onRowDelete={handleRowDelete}
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
              {filteredData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{tCommon("emptyStates.noResults")}</div>
              ) : (
                <VirtualizedGrid
                  items={filteredData}
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

      {/* Shared modals for delete, share, schedule actions */}
      <SharedActionModals />
    </div>
  );
}
