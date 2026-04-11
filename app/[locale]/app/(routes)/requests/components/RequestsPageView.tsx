"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar, type GridFilter } from "@/components/ui/grid-toolbar";
import { QuickAddRequest } from "./QuickAddRequest";
import { NewRequestWizard } from "./NewRequestWizard";
import { ExportButton } from "@/components/export";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Search,
  Plus,
  Share2,
  FileSpreadsheet,
  DollarSign,
  MapPin,
  BedDouble,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";

// ── Status badge colors ──
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  MATCHED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UNDER_OFFER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  PAUSED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const TYPE_COLORS: Record<string, string> = {
  BUY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RENT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

interface RequestsPageViewProps {
  requests: any[];
  crmData: any;
}

export default function RequestsPageView({
  requests = [],
  crmData,
}: RequestsPageViewProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("all");
  const t = useTranslations("requests");
  const commonT = useTranslations("common");
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { users } = crmData;

  // ── Helper: get contact names from requestContacts ──
  const getContactNames = useCallback((item: any) => {
    if (!item.requestContacts?.length) return "—";
    return item.requestContacts
      .map((rc: any) => rc.contact?.displayName)
      .filter(Boolean)
      .join(", ") || "—";
  }, []);

  // ── Filter logic ──
  const filteredRequests = useMemo(() => {
    return requests.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.friendlyId?.toLowerCase().includes(q) ||
        item.locationDisplayName?.toLowerCase().includes(q) ||
        item.municipality?.toLowerCase().includes(q) ||
        item.requestContacts?.some((rc: any) =>
          rc.contact?.displayName?.toLowerCase().includes(q)
        );

      const statusFilter = selectedFilters.status ?? [];
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(item.status);

      const typeFilter = selectedFilters.requestType ?? [];
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(item.requestType);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, selectedFilters]);

  // ── Format budget range ──
  const formatBudget = useCallback((min: any, max: any) => {
    const fMin = min ? `€${Number(min).toLocaleString()}` : null;
    const fMax = max ? `€${Number(max).toLocaleString()}` : null;
    if (fMin && fMax) return `${fMin} – ${fMax}`;
    if (fMin) return `${fMin}+`;
    if (fMax) return `${t("card.budget")} ${fMax}`;
    return null;
  }, [t]);

  // ── Grid toolbar handlers (match Properties pattern) ──
  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({});
  }, []);

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

  // ── Grid card renderer ──
  const renderRequestCard = useCallback(
    (request: any) => (
      <Link
        href={`/app/requests/${request.friendlyId}`}
        className="block h-full"
      >
        <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-sm cursor-pointer">
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Header: type + status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  className={cn(
                    "shrink-0 text-[10px] font-semibold",
                    TYPE_COLORS[request.requestType] || TYPE_COLORS.BUY
                  )}
                  variant="secondary"
                >
                  {t(`requestType.${request.requestType}` as Parameters<typeof t>[0])}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {request.friendlyId}
                </span>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-[10px] font-medium",
                  STATUS_COLORS[request.status] || STATUS_COLORS.ACTIVE
                )}
                variant="secondary"
              >
                {t(`status.${request.status}` as Parameters<typeof t>[0])}
              </Badge>
            </div>

            {/* Linked contacts */}
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium truncate">
                {getContactNames(request)}
              </span>
            </div>

            {/* Key criteria */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {(request.budgetMin || request.budgetMax) && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {formatBudget(request.budgetMin, request.budgetMax)}
                  </span>
                </div>
              )}
              {(request.locationDisplayName || request.municipality) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {request.locationDisplayName || request.municipality}
                  </span>
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
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    URGENCY_COLORS[request.urgency]
                  )}
                >
                  {t(`urgency.${request.urgency}` as Parameters<typeof t>[0])}
                </Badge>
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
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="space-y-6"
    >
      {/* ── Tab headers ── */}
      <TabsList className="inline-grid grid-cols-2">
        <TabsTrigger value="all">
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("tabs.allRequests")}
          {requests.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-xs font-medium">
              {requests.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="shared">
          <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("tabs.sharedWithMe")}
        </TabsTrigger>
      </TabsList>

      {/* ── All Requests tab ── */}
      <TabsContent value="all" className="space-y-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5">
                <CardTitle>{t("tabs.allRequests")}</CardTitle>
                <CardDescription>{t("pageDescription")}</CardDescription>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={() => setQuickAddOpen(true)}
                >
                  + {t("quickAdd.title")}
                </Button>
                <ExportButton module="crm" variant="outline" size="sm" />
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/import/add">
                    <FileSpreadsheet className="h-4 w-4 mr-1" aria-hidden="true" />
                    {commonT("import")}
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
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium">{t("emptyState.noRequests")}</p>
                <p className="text-sm mt-1">{t("emptyState.createFirst")}</p>
              </div>
            ) : view === "list" ? (
              /* ── LIST VIEW (table) ── */
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
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>{t("view.requestType")}</TableHead>
                          <TableHead>{t("view.contactInfo")}</TableHead>
                          <TableHead>{t("view.budget")}</TableHead>
                          <TableHead>{t("view.locationPreferences")}</TableHead>
                          <TableHead>{t("view.status")}</TableHead>
                          <TableHead>{t("view.urgency")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request: any) => (
                          <TableRow
                            key={request.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/app/requests/${request.friendlyId}`)}
                          >
                            <TableCell className="font-mono text-xs">
                              {request.friendlyId}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn("text-[10px]", TYPE_COLORS[request.requestType])}
                                variant="secondary"
                              >
                                {t(`requestType.${request.requestType}` as Parameters<typeof t>[0])}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {getContactNames(request)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatBudget(request.budgetMin, request.budgetMax) || "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {request.locationDisplayName || request.municipality || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn("text-[10px]", STATUS_COLORS[request.status])}
                                variant="secondary"
                              >
                                {t(`status.${request.status}` as Parameters<typeof t>[0])}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.urgency && (
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px]", URGENCY_COLORS[request.urgency])}
                                >
                                  {t(`urgency.${request.urgency}` as Parameters<typeof t>[0])}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              /* ── GRID VIEW (cards) ── */
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
      </TabsContent>

      {/* ── Shared Requests tab ── */}
      <TabsContent value="shared" className="space-y-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="space-y-1.5">
              <CardTitle>{t("tabs.sharedWithMe")}</CardTitle>
              <CardDescription>{t("emptyState.noShared")}</CardDescription>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">{t("emptyState.noShared")}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Quick Add Sheet ── */}
      <QuickAddRequest
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        organizationUsers={users || []}
        onContinueToFull={() => {
          setQuickAddOpen(false);
          setWizardOpen(true);
        }}
      />

      {/* ── Full Wizard Sheet ── */}
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
    </Tabs>
  );
}
