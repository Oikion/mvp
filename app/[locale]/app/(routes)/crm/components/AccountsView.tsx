"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { getColumns } from "../accounts/table-components/columns";
import { NewClientWizard } from "../clients/components/NewClientWizard";
import { DataTable } from "@/components/ui/data-table/data-table";
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
import { useActionModal } from "@/hooks/use-action-modal";
import { Row } from "@tanstack/react-table";
import axios from "axios";
import { toast } from "sonner";

const AccountsView = ({ data = [], crmData }: any) => {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("crm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { openDeleteModal } = useActionModal();

  // Get locale from pathname
  const locale = pathname.split("/")[1] || "en";

  // Keyboard navigation callbacks
  const handleRowOpen = useCallback(
    (row: Row<any>) => {
      const clientId = row.original.id;
      router.push(`/${locale}/app/crm/clients/${clientId}`);
    },
    [router, locale]
  );

  const handleRowEdit = useCallback(
    (row: Row<any>) => {
      const clientId = row.original.id;
      // Navigate to client edit page or open edit dialog
      router.push(`/${locale}/app/crm/clients/${clientId}?edit=true`);
    },
    [router, locale]
  );

  const handleRowDelete = useCallback(
    (rows: Row<any>[]) => {
      // For single row deletion, use the action modal
      if (rows.length === 1) {
        const row = rows[0];
        openDeleteModal({
          entityType: "client",
          entityId: row.original.id,
          entityName: row.original.name || "Client",
          onDelete: async () => {
            await axios.delete(`/api/crm/account/${row.original.id}`);
            router.refresh();
          },
        });
      } else {
        // For multiple rows, delete directly with confirmation via toast
        const deleteMultiple = async () => {
          try {
            await Promise.all(
              rows.map((row) =>
                axios.delete(`/api/crm/account/${row.original.id}`)
              )
            );
            toast.success(`${rows.length} clients deleted successfully`);
            router.refresh();
          } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to delete some clients");
          }
        };
        
        // Confirm via toast action
        toast(`Delete ${rows.length} clients?`, {
          action: {
            label: "Delete",
            onClick: deleteMultiple,
          },
        });
      }
    },
    [openDeleteModal, router]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users } = crmData;

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
          title={t("stats.totalClients")}
          value={totalClients.toString()}
          icon={<Users className="h-4 w-4" />}
          description={t("stats.allContacts")}
        />
        <StatsCard
          title={t("stats.activeClients")}
          value={activeClients.toString()}
          icon={<UserCheck className="h-4 w-4" />}
          description={t("stats.currentlyActive")}
          trendUp={true}
        />
        <StatsCard
          title={t("stats.new30d")}
          value={newClients.toString()}
          icon={<UserPlus className="h-4 w-4" />}
          description={t("stats.addedThisMonth")}
          trendUp={true}
        />
        <StatsCard
          title={t("stats.assigned")}
          value={assignedClients.toString()}
          icon={<Clock className="h-4 w-4" />}
          description={t("stats.assignedToAgents")}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>{tCommon("cards.clients")}</CardTitle>
              <CardDescription>{tCommon("cardDescriptions.manageClientRelationships")}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ViewToggle view={view} setView={setView} />
              <Sheet open={open} onOpenChange={() => setOpen(false)}>
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() => setOpen(true)}
                >
                  + {tCommon("buttons.createClient")}
                </Button>
                <SheetContent className="min-w-[1000px] space-y-2">
                  <SheetHeader>
                    <SheetTitle>{tCommon("dialogs.createClient")}</SheetTitle>
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
            <div className="text-center text-muted-foreground py-8">{tCommon("emptyStates.noAssignedClients")}</div>
          ) : view === "list" ? (
            <DataTable
              data={data}
              columns={getColumns(users)}
              searchKey="name"
              searchPlaceholder={t("CrmAccountsTable.filterPlaceholder")}
              enableKeyboardNav={true}
              onRowOpen={handleRowOpen}
              onRowEdit={handleRowEdit}
              onRowDelete={handleRowDelete}
            />
          ) : (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tCommon("placeholders.filterClients")}
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
                 <div className="text-center text-muted-foreground py-8">{tCommon("emptyStates.noResults")}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsView;
