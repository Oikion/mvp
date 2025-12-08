"use client";

import React, { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns, getColumns } from "../accounts/table-components/columns";
import { NewClientWizard } from "../clients/components/NewClientWizard";
import { AccountDataTable } from "../accounts/table-components/data-table";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ClientCard } from "./ClientCard";
import { Users, UserCheck, UserPlus, Clock, Search } from "lucide-react";
import moment from "moment";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

const AccountsView = ({ data = [], crmData }: any) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("crm");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, industries } = crmData;

  // Stats
  const totalClients = data.length;
  const activeClients = data.filter((c: any) => c.status === 'Active').length;
  const newClients = data.filter((c: any) => moment(c.createdAt).isAfter(moment().subtract(30, 'days'))).length;
  const assignedClients = data.filter((c: any) => c.assigned_to).length;

  // Filter data for grid view
  const filteredData = data.filter((item: any) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
          value={totalClients.toString()}
          icon={Users}
          description="All contacts"
        />
        <StatsCard
          title="Active Clients"
          value={activeClients.toString()}
          icon={UserCheck}
          description="Currently active"
          trendUp={true}
        />
        <StatsCard
          title="New (30d)"
          value={newClients.toString()}
          icon={UserPlus}
          description="Added this month"
          trendUp={true}
        />
        <StatsCard
          title="Assigned"
          value={assignedClients.toString()}
          icon={Clock}
          description="Assigned to agents"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Clients</CardTitle>
              <CardDescription>Manage your client relationships</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ViewToggle view={view} setView={setView} />
              <Sheet open={open} onOpenChange={() => setOpen(false)}>
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() => setOpen(true)}
                >
                  + New Client
                </Button>
                <SheetContent className="min-w-[1000px] space-y-2">
                  <SheetHeader>
                    <SheetTitle>Create new Client</SheetTitle>
                  </SheetHeader>
                  <div className="h-full overflow-y-auto">
                    <NewClientWizard
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
            <div className="text-center text-muted-foreground py-8">No assigned accounts found</div>
          ) : view === "list" ? (
            <AccountDataTable
              data={data}
              columns={getColumns(users)}
              industries={industries}
              users={users}
            />
          ) : (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter clients..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredData.map((client: any) => (
                  <ClientCard key={client.id} data={client} />
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
};

export default AccountsView;
