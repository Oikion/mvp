"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar as SharedDataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
import { RequestFilterDrawer, type RequestFilters } from "./RequestFilterDrawer";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  users?: { id: string; name: string }[];
  rightContent?: React.ReactNode;
  onRefresh?: () => void;
}

export function DataTableToolbar<TData>({
  table,
  users = [],
  rightContent,
  onRefresh,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations("requests");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const activeFilters: RequestFilters = React.useMemo(
    () => ({
      status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      urgency: searchParams.get("urgency")?.split(",").filter(Boolean) ?? [],
      requestType: searchParams.get("requestType")?.split(",").filter(Boolean) ?? [],
      linkedStatus: searchParams.get("linkedStatus") ?? "",
      assignedTo: searchParams.get("assignedTo") ?? "",
      budgetMin: searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : null,
      budgetMax: searchParams.get("budgetMax") ? Number(searchParams.get("budgetMax")) : null,
    }),
    [searchParams]
  );

  const filterCount = React.useMemo(() => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.urgency.length > 0) count++;
    if (activeFilters.requestType.length > 0) count++;
    if (activeFilters.linkedStatus) count++;
    if (activeFilters.assignedTo) count++;
    if (activeFilters.budgetMin !== null) count++;
    if (activeFilters.budgetMax !== null) count++;
    return count;
  }, [activeFilters]);

  const handleApply = React.useCallback(
    (filters: RequestFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, values: string[]) => {
        if (values.length > 0) params.set(key, values.join(","));
        else params.delete(key);
      };
      setOrDelete("status", filters.status);
      setOrDelete("urgency", filters.urgency);
      setOrDelete("requestType", filters.requestType);
      if (filters.linkedStatus) params.set("linkedStatus", filters.linkedStatus);
      else params.delete("linkedStatus");
      if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
      else params.delete("assignedTo");
      if (filters.budgetMin !== null) params.set("budgetMin", String(filters.budgetMin));
      else params.delete("budgetMin");
      if (filters.budgetMax !== null) params.set("budgetMax", String(filters.budgetMax));
      else params.delete("budgetMax");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleReset = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["status", "urgency", "requestType", "linkedStatus", "assignedTo", "budgetMin", "budgetMax"].forEach(
      (k) => params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const removeChip = React.useCallback(
    (key: keyof RequestFilters, value?: string) => {
      const updated = { ...activeFilters };
      if (key === "assignedTo" || key === "linkedStatus") (updated as any)[key] = "";
      else if (key === "budgetMin") updated.budgetMin = null;
      else if (key === "budgetMax") updated.budgetMax = null;
      else if (value) (updated[key] as string[]) = (activeFilters[key] as string[]).filter((v) => v !== value);
      handleApply(updated);
    },
    [activeFilters, handleApply]
  );

  React.useEffect(() => {
    table.getColumn("status")?.setFilterValue(
      activeFilters.status.length > 0 ? activeFilters.status : undefined
    );
  }, [activeFilters.status, table]);

  React.useEffect(() => {
    table.getColumn("urgency")?.setFilterValue(
      activeFilters.urgency.length > 0 ? activeFilters.urgency : undefined
    );
  }, [activeFilters.urgency, table]);

  React.useEffect(() => {
    table.getColumn("requestType")?.setFilterValue(
      activeFilters.requestType.length > 0 ? activeFilters.requestType : undefined
    );
  }, [activeFilters.requestType, table]);

  const chips: FilterChip[] = React.useMemo(() => {
    const result: FilterChip[] = [];
    activeFilters.status.forEach((v) =>
      result.push({ label: `Status: ${t(`status.${v}` as Parameters<typeof t>[0])}`, onRemove: () => removeChip("status", v) })
    );
    activeFilters.urgency.forEach((v) =>
      result.push({ label: `Urgency: ${t(`urgency.${v}` as Parameters<typeof t>[0])}`, onRemove: () => removeChip("urgency", v) })
    );
    activeFilters.requestType.forEach((v) =>
      result.push({ label: `Type: ${t(`requestType.${v}` as Parameters<typeof t>[0])}`, onRemove: () => removeChip("requestType", v) })
    );
    if (activeFilters.linkedStatus)
      result.push({
        label: `Contact: ${activeFilters.linkedStatus === "linked" ? t("Filters.linked") : t("Filters.unlinked")}`,
        onRemove: () => removeChip("linkedStatus"),
      });
    if (activeFilters.assignedTo) {
      const user = users.find((u) => u.id === activeFilters.assignedTo);
      result.push({ label: `Agent: ${user?.name ?? activeFilters.assignedTo}`, onRemove: () => removeChip("assignedTo") });
    }
    if (activeFilters.budgetMin !== null)
      result.push({ label: `Min: €${activeFilters.budgetMin.toLocaleString()}`, onRemove: () => removeChip("budgetMin") });
    if (activeFilters.budgetMax !== null)
      result.push({ label: `Max: €${activeFilters.budgetMax.toLocaleString()}`, onRemove: () => removeChip("budgetMax") });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, users]);

  return (
    <SharedDataTableToolbar
      table={table}
      searchKey="title"
      searchPlaceholder={t("searchPlaceholder")}
      filterCount={filterCount}
      chips={chips}
      onFilterOpen={() => setDrawerOpen(true)}
      onReset={handleReset}
      onRefresh={onRefresh}
      rightContent={rightContent}
    >
      <RequestFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        users={users}
        activeFilters={activeFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </SharedDataTableToolbar>
  );
}
