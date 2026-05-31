"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { GridToolbar, type GridFilter } from "@/components/ui/grid-toolbar";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGate } from "@/lib/permissions/components";

import { DealsList, type DealRow } from "./DealsList";
import { DealsGrid } from "./DealsGrid";
import { NewDealWizard } from "./NewDealWizard";

import { useDeals } from "@/hooks/swr";
import type { getAllCrmData } from "@/actions/crm/get-crm-data";

import {
  Handshake,
  Plus,
  Activity,
  CheckCircle2,
  XCircle,
  ListChecks,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────
interface DealsPageViewProps {
  initialDeals: DealRow[];
  /**
   * Org-wide CRM data (users, contacts, properties) — passed through so the
   * future wizard sheet can use it without re-fetching. Currently consumed
   * only by child wizards (built by a separate task).
   */
  crmData: Awaited<ReturnType<typeof getAllCrmData>>;
}

type DealsTab = "all" | "active" | "completed" | "fallenThrough";

const TERMINAL_STAGES = new Set(["COMPLETED", "FALLEN_THROUGH"]);

// ── Component ───────────────────────────────────────────────────────────
export default function DealsPageView({
  initialDeals,
  crmData,
}: Readonly<DealsPageViewProps>) {
  const t = useTranslations("deals");
  const commonT = useTranslations("common");

  // ── State ──
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [activeTab, setActiveTab] = useState<DealsTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});

  // The wizard sheet is built by another agent. We keep a state setter so
  // the primary action button is wired up — once `<NewDealWizard />` ships,
  // both the open state and the `<Sheet>` wrapper get added in this file.
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── SWR keeps the list fresh after mutations. Initial data comes from
  //    the server page so the first paint is instant.
  const {
    deals: swrDeals,
    isLoading: isSwrLoading,
    refresh,
  } = useDeals({ enabled: isMounted });

  const deals: DealRow[] = useMemo(() => {
    // Once SWR has resolved, prefer its data — otherwise fall back to the
    // server-rendered initial payload.
    if (swrDeals !== undefined) return swrDeals as DealRow[];
    return initialDeals;
  }, [swrDeals, initialDeals]);

  // ── Derived counts (per tab pill) ──
  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let fallen = 0;
    for (const d of deals) {
      if (d.stage === "COMPLETED") completed++;
      else if (d.stage === "FALLEN_THROUGH") fallen++;
      else active++;
    }
    return { all: deals.length, active, completed, fallen };
  }, [deals]);

  // ── Tab filter (stage) ──
  const dealsForTab = useMemo(() => {
    switch (activeTab) {
      case "active":
        return deals.filter((d) => !TERMINAL_STAGES.has(d.stage));
      case "completed":
        return deals.filter((d) => d.stage === "COMPLETED");
      case "fallenThrough":
        return deals.filter((d) => d.stage === "FALLEN_THROUGH");
      case "all":
      default:
        return deals;
    }
  }, [deals, activeTab]);

  // ── Search + grid filter (stage / dealType) ──
  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const stageFilter = selectedFilters.stage ?? [];
    const dealTypeFilter = selectedFilters.dealType ?? [];

    return dealsForTab.filter((deal) => {
      // Free-text search across friendly id / title / property
      const matchesSearch =
        !q ||
        deal.friendlyId?.toLowerCase().includes(q) ||
        deal.title?.toLowerCase().includes(q) ||
        deal.property?.title?.toLowerCase().includes(q) ||
        deal.property?.property_name?.toLowerCase().includes(q) ||
        deal.property?.address_city?.toLowerCase().includes(q);

      const matchesStage =
        stageFilter.length === 0 || stageFilter.includes(deal.stage);

      const matchesDealType =
        dealTypeFilter.length === 0 ||
        (deal.dealType ? dealTypeFilter.includes(deal.dealType) : false);

      return matchesSearch && matchesStage && matchesDealType;
    });
  }, [dealsForTab, searchQuery, selectedFilters]);

  // ── Toolbar handlers ──
  const handleFilterChange = useCallback(
    (filterId: string, values: string[]) => {
      setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({});
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleNewDeal = useCallback(() => {
    // Placeholder until the wizard sheet (separate task) is wired in.
    setWizardOpen(true);
  }, []);

  // ── Filter config for the GridToolbar ──
  const gridFilters: GridFilter[] = useMemo(
    () => [
      {
        id: "stage",
        title: t("detail.pipeline"),
        options: [
          { value: "INTEREST", label: t("stage.INTEREST") },
          { value: "OFFER", label: t("stage.OFFER") },
          { value: "NEGOTIATION", label: t("stage.NEGOTIATION") },
          {
            value: "PRELIMINARY_AGREEMENT",
            label: t("stage.PRELIMINARY_AGREEMENT"),
          },
          { value: "DUE_DILIGENCE", label: t("stage.DUE_DILIGENCE") },
          { value: "TRANSFER_TAX", label: t("stage.TRANSFER_TAX") },
          { value: "SIGNING", label: t("stage.SIGNING") },
          { value: "REGISTRATION", label: t("stage.REGISTRATION") },
          { value: "COMPLETED", label: t("stage.COMPLETED") },
          { value: "FALLEN_THROUGH", label: t("stage.FALLEN_THROUGH") },
        ],
      },
      {
        id: "dealType",
        title: t("create.dealType"),
        options: [
          { value: "SALE", label: t("dealType.SALE") },
          { value: "RENT", label: t("dealType.RENT") },
        ],
      },
    ],
    [t]
  );

  // ── First-paint guard: prevents hydration flicker on tab/state ──
  if (!isMounted) {
    return (
      <div className="py-12">
        <Loading variant="spinner" size="md" />
      </div>
    );
  }

  // ── Tab content shared body (used by all 4 tabs) ──
  const renderTabBody = () => {
    if (isSwrLoading && deals.length === 0) {
      return (
        <div className="py-12">
          <Loading variant="spinner" size="md" />
        </div>
      );
    }

    if (deals.length === 0) {
      return (
        <EmptyState
          icon={<Handshake className="h-12 w-12" aria-hidden="true" />}
          title={t("list.empty")}
          description={t("description")}
          action={{
            label: t("create.title"),
            onClick: handleNewDeal,
          }}
        />
      );
    }

    if (view === "list") {
      return (
        <DealsList
          data={filteredDeals}
          toolbarRight={<ViewToggle view={view} setView={setView} />}
          onRefresh={handleRefresh}
          users={crmData?.users ?? []}
        />
      );
    }

    return (
      <div className="space-y-4">
        <GridToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`${t("title")}…`}
          filters={gridFilters}
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          onRefresh={handleRefresh}
          rightContent={<ViewToggle view={view} setView={setView} />}
        />
        {filteredDeals.length === 0 ? (
          <div role="status" className="text-center text-muted-foreground py-12">
            <Handshake
              className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"
              aria-hidden="true"
            />
            <p className="font-medium">{t("list.empty")}</p>
          </div>
        ) : (
          <DealsGrid deals={filteredDeals} />
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as DealsTab)}
      className="space-y-6"
    >
      {/* ── Tab headers ── */}
      <TabsList className="inline-grid grid-cols-4">
        <TabsTrigger
          value="all"
          aria-label={`${t("tabs.all")}, ${counts.all}`}
        >
          <ListChecks
            className="h-4 w-4 shrink-0 mr-1.5"
            aria-hidden="true"
          />
          <span className="sr-only sm:not-sr-only sm:inline">{t("tabs.all")}</span>
          {counts.all > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-xs font-medium"
            >
              {counts.all}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="active"
          aria-label={`${t("tabs.active")}, ${counts.active}`}
        >
          <Activity className="h-4 w-4 shrink-0 mr-1.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:inline">{t("tabs.active")}</span>
          {counts.active > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 px-2 py-0.5 rounded-full bg-info/20 text-xs font-medium"
            >
              {counts.active}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          aria-label={`${t("tabs.completed")}, ${counts.completed}`}
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 mr-1.5"
            aria-hidden="true"
          />
          <span className="sr-only sm:not-sr-only sm:inline">{t("tabs.completed")}</span>
          {counts.completed > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 px-2 py-0.5 rounded-full bg-success/20 text-xs font-medium"
            >
              {counts.completed}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="fallenThrough"
          aria-label={`${t("tabs.fallenThrough")}, ${counts.fallen}`}
        >
          <XCircle className="h-4 w-4 shrink-0 mr-1.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:inline">{t("tabs.fallenThrough")}</span>
          {counts.fallen > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium"
            >
              {counts.fallen}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {(["all", "active", "completed", "fallenThrough"] as DealsTab[]).map(
        (tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  {/* Left: Title & Description */}
                  <div className="space-y-1.5">
                    <CardTitle>{t(`tabs.${tabValue}`)}</CardTitle>
                    <CardDescription>{t("description")}</CardDescription>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <PermissionGate action="deal:create">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNewDeal}
                      >
                        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                        {t("create.quickAdd")}
                      </Button>
                    </PermissionGate>

                    <PermissionGate action="deal:create">
                      <Button size="sm" onClick={handleNewDeal}>
                        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                        {commonT("new")} {t("title")}
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-6">{renderTabBody()}</CardContent>
            </Card>
          </TabsContent>
        )
      )}

      <NewDealWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => {
          setWizardOpen(false);
          // SWR will auto-refresh via mutate
        }}
      />
    </Tabs>
  );
}
