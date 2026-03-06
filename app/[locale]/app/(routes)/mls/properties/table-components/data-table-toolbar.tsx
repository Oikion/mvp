"use client";

import { Table } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
import { PropertyFilterDrawer, type PropertyFilters } from "./PropertyFilterDrawer";
import { useOrgUsers } from "@/hooks/swr";

export function DataTableToolbar_Properties<TData>({ table, rightContent }: Readonly<{ table: Table<TData>; rightContent?: React.ReactNode }>) {
  const t = useTranslations("mls");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filterOpen, setFilterOpen] = useState(false);
  const { users } = useOrgUsers();

  // Parse active filters from URL
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

  const filterCount = [
    activeFilters.status.length > 0,
    activeFilters.propertyType.length > 0,
    activeFilters.transactionType.length > 0,
    activeFilters.priceMin !== null,
    activeFilters.priceMax !== null,
    activeFilters.municipality !== "",
    activeFilters.assignedTo !== "",
  ].filter(Boolean).length;

  // Sync URL filters → TanStack column filters
  useEffect(() => {
    table.getColumn("property_status")?.setFilterValue(
      activeFilters.status.length > 0 ? activeFilters.status : undefined
    );
    table.getColumn("property_type")?.setFilterValue(
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

  const removeFilter = (key: keyof PropertyFilters, value?: string) => {
    const updated = { ...activeFilters };
    if (key === "priceMin") updated.priceMin = null;
    else if (key === "priceMax") updated.priceMax = null;
    else if (key === "municipality") updated.municipality = "";
    else if (key === "assignedTo") updated.assignedTo = "";
    else if (value) (updated[key] as string[]) = (activeFilters[key] as string[]).filter((v) => v !== value);
    handleApply(updated);
  };

  const userNameById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.id] = u.name ?? u.id; });
    return map;
  }, [users]);

  // Build chips array with prefixed labels matching Clients/Mandates pattern
  const chips: FilterChip[] = useMemo(() => {
    const result: FilterChip[] = [];
    activeFilters.status.forEach((v) =>
      result.push({ label: `Status: ${v}`, onRemove: () => removeFilter("status", v) })
    );
    activeFilters.propertyType.forEach((v) =>
      result.push({ label: `Type: ${v}`, onRemove: () => removeFilter("propertyType", v) })
    );
    activeFilters.transactionType.forEach((v) =>
      result.push({ label: `Tx: ${v}`, onRemove: () => removeFilter("transactionType", v) })
    );
    if (activeFilters.priceMin !== null)
      result.push({ label: `Min: €${activeFilters.priceMin.toLocaleString()}`, onRemove: () => removeFilter("priceMin") });
    if (activeFilters.priceMax !== null)
      result.push({ label: `Max: €${activeFilters.priceMax.toLocaleString()}`, onRemove: () => removeFilter("priceMax") });
    if (activeFilters.municipality)
      result.push({ label: `Location: ${activeFilters.municipality}`, onRemove: () => removeFilter("municipality") });
    if (activeFilters.assignedTo)
      result.push({ label: `Agent: ${userNameById[activeFilters.assignedTo] ?? activeFilters.assignedTo}`, onRemove: () => removeFilter("assignedTo") });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, userNameById]);

  return (
    <DataTableToolbar
      table={table}
      searchKey="property_name"
      searchPlaceholder={t("MlsPropertiesTable.filterPlaceholder")}
      filterCount={filterCount}
      chips={chips}
      onFilterOpen={() => setFilterOpen(true)}
      onReset={handleReset}
      rightContent={rightContent}
    >
      <PropertyFilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        users={users.map((u) => ({ id: u.id, name: u.name ?? u.id, imageUrl: u.avatar ?? undefined }))}
        activeFilters={activeFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </DataTableToolbar>
  );
}
