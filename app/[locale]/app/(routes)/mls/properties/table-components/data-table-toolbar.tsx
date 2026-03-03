"use client";

import { Table } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { PropertyFilterDrawer, type PropertyFilters } from "./PropertyFilterDrawer";
import { useOrgUsers } from "@/hooks/swr";

export function DataTableToolbar<TData>({ table }: { table: Table<TData> }) {
  const t = useTranslations("mls");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filterOpen, setFilterOpen] = useState(false);
  const { users } = useOrgUsers();

  // Parse active filters from URL search params
  const activeFilters: PropertyFilters = useMemo(
    () => ({
      status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      propertyType: searchParams.get("type")?.split(",").filter(Boolean) ?? [],
      transactionType: searchParams.get("txType")?.split(",").filter(Boolean) ?? [],
      priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
      priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
      municipality: searchParams.get("municipality") ?? "",
      assignedTo: searchParams.get("assignedTo") ?? "",
    }),
    [searchParams]
  );

  const activeFilterCount = [
    activeFilters.status.length > 0,
    activeFilters.propertyType.length > 0,
    activeFilters.transactionType.length > 0,
    activeFilters.priceMin !== null,
    activeFilters.priceMax !== null,
    activeFilters.municipality !== "",
    activeFilters.assignedTo !== "",
  ].filter(Boolean).length;

  // Apply URL filter state to TanStack table column filters
  useEffect(() => {
    const statusCol = table.getColumn("property_status");
    statusCol?.setFilterValue(
      activeFilters.status.length > 0 ? activeFilters.status : undefined
    );
    const typeCol = table.getColumn("property_type");
    typeCol?.setFilterValue(
      activeFilters.propertyType.length > 0 ? activeFilters.propertyType : undefined
    );
  }, [activeFilters, table]);

  const handleApply = (filters: PropertyFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filters.status.length) params.set("status", filters.status.join(","));
    else params.delete("status");
    if (filters.propertyType.length) params.set("type", filters.propertyType.join(","));
    else params.delete("type");
    if (filters.transactionType.length) params.set("txType", filters.transactionType.join(","));
    else params.delete("txType");
    if (filters.priceMin !== null) params.set("priceMin", String(filters.priceMin));
    else params.delete("priceMin");
    if (filters.priceMax !== null) params.set("priceMax", String(filters.priceMax));
    else params.delete("priceMax");
    if (filters.municipality) params.set("municipality", filters.municipality);
    else params.delete("municipality");
    if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
    else params.delete("assignedTo");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["status", "type", "txType", "priceMin", "priceMax", "municipality", "assignedTo"].forEach(
      (k) => params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  };

  // Remove a single filter chip value from URL params
  const removeFilter = (key: keyof PropertyFilters, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "status") {
      const next = activeFilters.status.filter((v) => v !== value);
      if (next.length) params.set("status", next.join(","));
      else params.delete("status");
    } else if (key === "propertyType") {
      const next = activeFilters.propertyType.filter((v) => v !== value);
      if (next.length) params.set("type", next.join(","));
      else params.delete("type");
    } else if (key === "transactionType") {
      const next = activeFilters.transactionType.filter((v) => v !== value);
      if (next.length) params.set("txType", next.join(","));
      else params.delete("txType");
    } else if (key === "priceMin") {
      params.delete("priceMin");
    } else if (key === "priceMax") {
      params.delete("priceMax");
    } else if (key === "municipality") {
      params.delete("municipality");
    } else if (key === "assignedTo") {
      params.delete("assignedTo");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Map user id to display name for chips
  const userNameById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.name ?? u.id;
    });
    return map;
  }, [users]);

  return (
    <div className="flex flex-col gap-2">
      {/* Main toolbar row */}
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("MlsPropertiesTable.filterPlaceholder")}
            value={(table.getColumn("property_name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("property_name")?.setFilterValue(event.target.value)
            }
            className="h-10 w-[240px] lg:w-[320px]"
          />
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 rounded-full px-1.5 py-0.5 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Active filter chips row */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.status.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                aria-label={`Remove ${s} filter`}
                onClick={() => removeFilter("status", s)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.propertyType.map((pt) => (
            <Badge key={pt} variant="secondary" className="gap-1 pr-1">
              {pt}
              <button
                type="button"
                aria-label={`Remove ${pt} filter`}
                onClick={() => removeFilter("propertyType", pt)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.transactionType.map((tt) => (
            <Badge key={tt} variant="secondary" className="gap-1 pr-1">
              {tt}
              <button
                type="button"
                aria-label={`Remove ${tt} filter`}
                onClick={() => removeFilter("transactionType", tt)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.priceMin !== null && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Min €{activeFilters.priceMin.toLocaleString()}
              <button
                type="button"
                aria-label="Remove min price filter"
                onClick={() => removeFilter("priceMin")}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.priceMax !== null && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Max €{activeFilters.priceMax.toLocaleString()}
              <button
                type="button"
                aria-label="Remove max price filter"
                onClick={() => removeFilter("priceMax")}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.municipality !== "" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {activeFilters.municipality}
              <button
                type="button"
                aria-label="Remove municipality filter"
                onClick={() => removeFilter("municipality")}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.assignedTo !== "" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {userNameById[activeFilters.assignedTo] ?? activeFilters.assignedTo}
              <button
                type="button"
                aria-label="Remove assigned-to filter"
                onClick={() => removeFilter("assignedTo")}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={handleReset}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Drawer */}
      <PropertyFilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        users={users.map((u) => ({ id: u.id, name: u.name ?? u.id, imageUrl: u.avatar ?? undefined }))}
        activeFilters={activeFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </div>
  );
}
