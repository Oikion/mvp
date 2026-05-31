"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewToggle } from "@/components/ui/view-toggle";
import { RequestDataTable } from "../table-components/data-table";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar, type GridFilter } from "@/components/ui/grid-toolbar";
import { ExportButton } from "@/components/export";
import { SharedActionModals } from "@/components/entity";
import { bulkArchiveEntities } from "@/actions/archive/bulk-archive-entities";
import { QuickAddRequest } from "./QuickAddRequest";
import { NewRequestWizard } from "./NewRequestWizard";
import { useRequestColumns } from "../table-components/columns";
import {
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Share2,
  DollarSign,
  MapPin,
  BedDouble,
  User,
  Sparkles,
} from "lucide-react";
import { AutoGenerateRequestsDialog } from "./AutoGenerateRequestsDialog";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Link } from "@/navigation";

interface RequestsPageViewProps {
  requests: any[];
  crmData: any;
}

export default function RequestsPageView({
  requests = [],
  crmData,
}: RequestsPageViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { users } = crmData;
  const columns = useRequestColumns(users ?? []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Helper: get contact display names from requestContacts ──
  const getContactNames = useCallback((item: any) => {
    if (!item.requestContacts?.length) return "—";
    return item.requestContacts
      .map((rc: any) => rc.contact?.displayName)
      .filter(Boolean)
      .join(", ") || "—";
  }, []);

  // ── Format budget range ──
  const formatBudget = useCallback((min: any, max: any) => {
    const fmt = (n: number) => {
      if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
      return `€${n.toLocaleString()}`;
    };
    const minVal = min ? Number(min) : null;
    const maxVal = max ? Number(max) : null;
    if (minVal && maxVal) return `${fmt(minVal)} – ${fmt(maxVal)}`;
    if (minVal) return `${fmt(minVal)}+`;
    if (maxVal) return `${t("budget.upTo")} ${fmt(maxVal)}`;
    return null;
  }, [t]);

  // ── Grid filter config ──
  const gridFilters: GridFilter[] = useMemo(() => [
    {
      id: "status",
      title: t("view.status"),
      options: [
        { value: "ACTIVE", label: t("status.ACTIVE") },
        { value: "MATCHED", label: t("status.MATCHED") },
        { value: "UNDER_OFFER", label: t("status.UNDER_OFFER") },
        { value: "CLOSED", label: t("status.CLOSED") },
        { value: "PAUSED", label: t("status.PAUSED") },
      ],
    },
    {
      id: "requestType",
      title: t("view.requestType"),
      options: [
        { value: "BUY", label: t("requestType.BUY") },
        { value: "RENT", label: t("requestType.RENT") },
      ],
    },
  ], [t]);

  // ── Grid-view filtered data ──
  const filteredRequests = useMemo(() => {
    return requests.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.friendlyId?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.locationDisplayName?.toLowerCase().includes(q) ||
        item.municipality?.toLowerCase().includes(q) ||
        item.requestContacts?.some((rc: any) =>
          rc.contact?.displayName?.toLowerCase().includes(q)
        );

      const statusFilter = selectedFilters.status ?? [];
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);

      const typeFilter = selectedFilters.requestType ?? [];
      const matchesType = typeFilter.length === 0 || typeFilter.includes(item.requestType);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, selectedFilters]);

  // ── Grid toolbar handlers ──
  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
  }, []);

  const handleRefresh = useCallback(() => router.refresh(), [router]);

  const handleBulkDeleteRequests = useCallback(async (ids: string[]) => {
    await bulkArchiveEntities("request", ids);
    router.refresh();
  }, [router]);
  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({});
  }, []);

  // ── Grid card renderer ──
  const renderRequestCard = useCallback(
    (request: any) => (
      <Link href={`/app/requests/${request.friendlyId}`} className="block h-full">
        <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-sm cursor-pointer">
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Header: type + status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusBadge
                  entityType="request_type"
                  status={request.requestType}
                  label={t(`requestType.${request.requestType}` as Parameters<typeof t>[0])}
                  className="shrink-0"
                />
                <span className="text-xs text-muted-foreground truncate">{request.friendlyId}</span>
              </div>
              <StatusBadge
                entityType="request"
                status={request.status}
                label={t(`status.${request.status}` as Parameters<typeof t>[0])}
                className="shrink-0"
              />
            </div>

            {/* Linked contacts */}
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium truncate">{getContactNames(request)}</span>
            </div>

            {/* Key criteria */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {(request.budgetMin || request.budgetMax) && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{formatBudget(request.budgetMin, request.budgetMax)}</span>
                </div>
              )}
              {(request.locationDisplayName || request.municipality) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{request.locationDisplayName || request.municipality}</span>
                </div>
              )}
              {(request.bedroomsMin != null || request.bedroomsMax != null) && (
                <div className="flex items-center gap-1.5">
                  <BedDouble className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>
                    {request.bedroomsMin ?? "—"} – {request.bedroomsMax ?? "—"} {t("card.bedrooms")}
                  </span>
                </div>
              )}
            </div>

            {/* Urgency badge */}
            {request.urgency && request.urgency !== "MEDIUM" && (
              <div className="pt-1">
                <StatusBadge
                  entityType="priority"
                  status={request.urgency}
                  label={t(`urgency.${request.urgency}` as Parameters<typeof t>[0])}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    ),
    [t, formatBudget, getContactNames]
  );

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      {/* Main Content Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
                {t("tabs.allRequests")}
                {requests.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {requests.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>{t("pageDescription")}</CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => setQuickAddOpen(true)}>
                + {t("quickAdd.title")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAutoGenOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" />
                {t("autoGenerate.pageButtonLabel")}
              </Button>
              <ExportButton module="requests" variant="outline" size="sm" />
              <Button variant="outline" size="sm" asChild>
                <Link href="/app/import/add">
                  <FileSpreadsheet className="h-4 w-4 mr-1" aria-hidden="true" />
                  {tCommon("importLabel")}
                </Link>
              </Button>
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                + {t("pageTitle")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
              <p className="font-medium">{t("emptyState.noRequests")}</p>
              <p className="text-sm mt-1">{t("emptyState.createFirst")}</p>
            </div>
          ) : view === "list" ? (
            <RequestDataTable
              data={requests}
              columns={columns}
              users={users ?? []}
              getRowHref={(row: any) => `/app/requests/${row.friendlyId ?? row.id}`}
              toolbarRight={<ViewToggle view={view} setView={setView} />}
              onRefresh={handleRefresh}
              onBulkDelete={handleBulkDeleteRequests}
            />
          ) : (
            <div className="space-y-4">
              <GridToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("searchPlaceholder")}
                filters={gridFilters}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onRefresh={handleRefresh}
                rightContent={<ViewToggle view={view} setView={setView} />}
              />
              {filteredRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t("emptyState.noResults")}
                </div>
              ) : (
                <VirtualizedGrid
                  items={filteredRequests}
                  getItemKey={(item: any) => item.id}
                  renderItem={renderRequestCard}
                  rowHeight={220}
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

      {/* Quick Add Sheet */}
      <QuickAddRequest
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        organizationUsers={users || []}
        onContinueToFull={() => {
          setQuickAddOpen(false);
          setWizardOpen(true);
        }}
      />

      {/* Full Wizard Sheet */}
      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("wizard.title")}</SheetTitle>
          </SheetHeader>
          <NewRequestWizard
            users={users || []}
            onFinish={() => {
              setWizardOpen(false);
              router.refresh();
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Auto-generate requests dialog */}
      <AutoGenerateRequestsDialog open={autoGenOpen} onOpenChange={setAutoGenOpen} />

      {/* Shared modals for delete, share, schedule actions */}
      <SharedActionModals />
    </div>
  );
}
