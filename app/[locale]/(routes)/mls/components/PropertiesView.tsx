"use client";

import React, { useEffect, useState } from "react";
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
import { Home, Activity, DollarSign, Calendar, Search } from "lucide-react";
import moment from "moment";
import { Input } from "@/components/ui/input";
import { useOrgUsers } from "@/hooks/swr";

export default function PropertiesView({ data = [] }: { data: any[] }) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("mls");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) return null;

  const statusOptions = statuses.map(status => ({
    ...status,
    label: t(`PropertyForm.status.${status.value}`)
  }));

  // Stats
  const totalProperties = data.length;
  const activeProperties = data.filter(p => p.property_status === 'ACTIVE').length;
  const totalValue = data.reduce((sum, p) => sum + (p.price || 0), 0);
  const newProperties = data.filter(p => moment(p.createdAt).isAfter(moment().subtract(30, 'days'))).length;

  // Filter data for grid view
  const filteredData = data.filter(item => 
    item.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Properties"
          value={totalProperties.toString()}
          icon={<Home className="h-4 w-4" />}
          description="All time properties"
        />
        <StatsCard
          title="Active Properties"
          value={activeProperties.toString()}
          icon={<Activity className="h-4 w-4" />}
          description="Currently on market"
          trendUp={true}
        />
        <StatsCard
          title="Portfolio Value"
          value={`€${(totalValue / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-4 w-4" />}
          description="Total listing value"
        />
        <StatsCard
          title="New (30d)"
          value={newProperties.toString()}
          icon={<Calendar className="h-4 w-4" />}
          description="Added this month"
          trend="+2"
          trendUp={true}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Properties</CardTitle>
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
            <div className="text-center text-muted-foreground py-8">No properties found</div>
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
                {filteredData.map((property) => (
                  <PropertyCard key={property.id} data={property} />
                ))}
              </div>
              {filteredData.length === 0 && (
                 <div className="text-center text-muted-foreground py-8">No results found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
