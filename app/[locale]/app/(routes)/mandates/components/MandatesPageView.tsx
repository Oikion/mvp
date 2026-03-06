"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatsCard } from "@/components/ui/stats-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { MandateCard } from "./MandateCard";
import { QuickAddMandate } from "./QuickAddMandate";
import { NewMandateWizard } from "./NewMandateWizard";
import { getColumns } from "../table-components/columns";
import { MandateDataTable } from "../table-components/data-table";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { ExportButton } from "@/components/export";
import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  LinkIcon,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { SharedActionModals } from "@/components/entity";

interface MandatesPageViewProps {
  mandates: any[];
  users: any[];
}

export default function MandatesPageView({
  mandates = [],
  users = [],
}: MandatesPageViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const t = useTranslations("mandates");
  const commonT = useTranslations("common");
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stats
  const totalMandates = mandates.length;
  const activeMandates = mandates.filter(
    (m: any) => m.status === "ACTIVE"
  ).length;
  const unlinkedMandates = mandates.filter(
    (m: any) => !m.clientId
  ).length;
  const urgentMandates = mandates.filter(
    (m: any) => m.urgency === "HIGH" || m.urgency === "CRITICAL"
  ).length;

  // Filter data for both views
  const filteredMandates = useMemo(() => {
    // URL-based filters (set by the filter drawer in the table toolbar)
    const urlStatus = searchParams.get("status")?.split(",").filter(Boolean) ?? [];
    const urlUrgency = searchParams.get("urgency")?.split(",").filter(Boolean) ?? [];
    const urlTransactionType = searchParams.get("transactionType")?.split(",").filter(Boolean) ?? [];
    const urlPropertyType = searchParams.get("propertyType")?.split(",").filter(Boolean) ?? [];
    const urlLinkedStatus = searchParams.get("linkedStatus") ?? "";
    const urlAssignedTo = searchParams.get("assignedTo") ?? "";
    const urlBudgetMin = searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : null;
    const urlBudgetMax = searchParams.get("budgetMax") ? Number(searchParams.get("budgetMax")) : null;

    return mandates.filter((item: any) => {
      // Text search filter
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client?.client_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // GridToolbar filters (grid view)
      const gridStatusFilter = selectedFilters.status ?? [];
      const matchesGridStatus =
        gridStatusFilter.length === 0 || gridStatusFilter.includes(item.status);

      const gridUrgencyFilter = selectedFilters.urgency ?? [];
      const matchesGridUrgency =
        gridUrgencyFilter.length === 0 || gridUrgencyFilter.includes(item.urgency);

      // URL-based drawer filters
      const matchesUrlStatus =
        urlStatus.length === 0 || urlStatus.includes(item.status);

      const matchesUrlUrgency =
        urlUrgency.length === 0 || urlUrgency.includes(item.urgency);

      const matchesTransactionType =
        urlTransactionType.length === 0 || urlTransactionType.includes(item.transaction_type);

      const matchesPropertyType =
        urlPropertyType.length === 0 || urlPropertyType.includes(item.property_type);

      const matchesLinkedStatus =
        !urlLinkedStatus ||
        (urlLinkedStatus === "linked" && !!item.clientId) ||
        (urlLinkedStatus === "unlinked" && !item.clientId);

      const matchesAssignedTo =
        !urlAssignedTo || item.assigned_to === urlAssignedTo;

      const budgetMax = item.budget_max ? Number(item.budget_max) : null;
      const budgetMin = item.budget_min ? Number(item.budget_min) : null;
      const matchesBudgetMin =
        urlBudgetMin === null || (budgetMax !== null && budgetMax >= urlBudgetMin) || (budgetMin !== null && budgetMin >= urlBudgetMin);
      const matchesBudgetMax =
        urlBudgetMax === null || (budgetMin !== null && budgetMin <= urlBudgetMax) || (budgetMax !== null && budgetMax <= urlBudgetMax);

      return (
        matchesSearch &&
        matchesGridStatus &&
        matchesGridUrgency &&
        matchesUrlStatus &&
        matchesUrlUrgency &&
        matchesTransactionType &&
        matchesPropertyType &&
        matchesLinkedStatus &&
        matchesAssignedTo &&
        matchesBudgetMin &&
        matchesBudgetMax
      );
    });
  }, [mandates, searchQuery, selectedFilters, searchParams]);

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
  const gridFilters = useMemo(
    () => [
      {
        id: "status",
        title: t("Filters.status"),
        options: [
          { label: t("MandateForm.status.DRAFT"), value: "DRAFT" },
          { label: t("MandateForm.status.ACTIVE"), value: "ACTIVE" },
          { label: t("MandateForm.status.PAUSED"), value: "PAUSED" },
          { label: t("MandateForm.status.FULFILLED"), value: "FULFILLED" },
          { label: t("MandateForm.status.EXPIRED"), value: "EXPIRED" },
          { label: t("MandateForm.status.CANCELLED"), value: "CANCELLED" },
        ],
      },
      {
        id: "urgency",
        title: t("Filters.urgency"),
        options: [
          { label: t("MandateForm.urgency.LOW"), value: "LOW" },
          { label: t("MandateForm.urgency.MEDIUM"), value: "MEDIUM" },
          { label: t("MandateForm.urgency.HIGH"), value: "HIGH" },
          { label: t("MandateForm.urgency.CRITICAL"), value: "CRITICAL" },
        ],
      },
    ],
    [t]
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("Stats.totalMandates")}
          value={totalMandates.toString()}
          icon={<FileText className="h-4 w-4" />}
          description={t("MandatesPage.description")}
          actionLabel={t("Stats.addMandate")}
          emptyMessage={t("MandatesPage.description")}
        />
        <StatsCard
          title={t("Stats.activeMandates")}
          value={activeMandates.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description={t("MandateForm.status.ACTIVE")}
          trendUp={activeMandates > 0}
          actionLabel={t("Stats.addMandate")}
          emptyMessage={t("MandateForm.status.ACTIVE")}
        />
        <StatsCard
          title={t("Stats.unlinkedMandates")}
          value={unlinkedMandates.toString()}
          icon={<LinkIcon className="h-4 w-4" />}
          description={t("MandateForm.fields.noClient")}
          trendUp={false}
          actionLabel={t("Stats.addMandate")}
          emptyMessage={t("MandateForm.fields.noClient")}
        />
        <StatsCard
          title={t("Stats.urgentMandates")}
          value={urgentMandates.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          description={`${t("MandateForm.urgency.HIGH")} / ${t("MandateForm.urgency.CRITICAL")}`}
          trendUp={false}
          actionLabel={t("Stats.addMandate")}
          emptyMessage={`${t("MandateForm.urgency.HIGH")} / ${t("MandateForm.urgency.CRITICAL")}`}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1.5">
              <CardTitle>{t("MandatesPage.title")}</CardTitle>
              <CardDescription>{t("MandatesPage.description")}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => setQuickAddOpen(true)}
              >
                + {commonT("quickAdd")}
              </Button>
              <QuickAddMandate
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                organizationUsers={users}
                onSuccess={() => {}}
              />
              <ExportButton
                module="mandates"
                totalRows={mandates.length}
                filteredRows={filteredMandates.length}
                filters={{
                  status: selectedFilters.status,
                  search: searchQuery,
                }}
              />
              <Button
                variant="outline"
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                asChild
              >
                <Link href={`/${locale}/app/mandates/import`}>
                  {commonT("import")}
                </Link>
              </Button>
              <Sheet open={wizardOpen} onOpenChange={() => setWizardOpen(false)}>
                <Button className="flex-1 sm:flex-none" onClick={() => setWizardOpen(true)}>
                  + {t("MandateForm.title")}
                </Button>
                <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] space-y-2">
                  <SheetHeader>
                    <SheetTitle>{t("MandateForm.title")}</SheetTitle>
                  </SheetHeader>
                  <div className="h-full overflow-y-auto">
                    <NewMandateWizard onSuccess={() => setWizardOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {!mandates || mandates.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">{t("MandatesTable.noResults")}</p>
              <p className="text-sm mt-1">{t("MandatesPage.description")}</p>
            </div>
          ) : view === "list" ? (
            <MandateDataTable
              data={mandates}
              columns={getColumns(t, users)}
              users={users}
              toolbarRight={<ViewToggle view={view} setView={setView} />}
            />
          ) : (
            <div className="space-y-4">
              <GridToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("MandatesTable.filterPlaceholder")}
                filters={gridFilters}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                rightContent={<ViewToggle view={view} setView={setView} />}
              />
              {filteredMandates.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t("MandatesTable.noResults")}
                </div>
              ) : (
                <VirtualizedGrid
                  items={filteredMandates}
                  getItemKey={(mandate: { id: string }) => mandate.id}
                  renderItem={(mandate: any) => (
                    <MandateCard data={mandate} />
                  )}
                  rowHeight={300}
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
