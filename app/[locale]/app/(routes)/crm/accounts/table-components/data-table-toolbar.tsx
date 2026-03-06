"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar as SharedDataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
import { ClientFilterDrawer, type ClientFilters } from "./ClientFilterDrawer";

const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead", ACTIVE: "Active", INACTIVE: "Inactive", CONVERTED: "Converted", LOST: "Lost",
};
const TYPE_LABELS: Record<string, string> = {
  BUYER: "Buyer", SELLER: "Seller", RENTER: "Renter", INVESTOR: "Investor", REFERRAL_PARTNER: "Referral Partner",
};
const INTENT_LABELS: Record<string, string> = {
  BUY: "Buy", RENT: "Rent", SELL: "Sell", LEASE: "Lease", INVEST: "Invest",
};
const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: "Referral", WEB: "Web", PORTAL: "Portal", WALK_IN: "Walk-in", SOCIAL: "Social",
};

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  users?: { id: string; name: string }[];
  rightContent?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  users = [],
  rightContent,
}: DataTableToolbarProps<TData>) {
  const commonT = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const activeFilters: ClientFilters = React.useMemo(
    () => ({
      status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      clientType: searchParams.get("clientType")?.split(",").filter(Boolean) ?? [],
      intent: searchParams.get("intent")?.split(",").filter(Boolean) ?? [],
      leadSource: searchParams.get("leadSource")?.split(",").filter(Boolean) ?? [],
      assignedTo: searchParams.get("assignedTo") ?? "",
      budgetMin: searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : null,
      budgetMax: searchParams.get("budgetMax") ? Number(searchParams.get("budgetMax")) : null,
    }),
    [searchParams]
  );

  const filterCount = React.useMemo(() => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.clientType.length > 0) count++;
    if (activeFilters.intent.length > 0) count++;
    if (activeFilters.leadSource.length > 0) count++;
    if (activeFilters.assignedTo) count++;
    if (activeFilters.budgetMin !== null) count++;
    if (activeFilters.budgetMax !== null) count++;
    return count;
  }, [activeFilters]);

  const handleApply = React.useCallback(
    (filters: ClientFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filters.status.length > 0) params.set("status", filters.status.join(","));
      else params.delete("status");
      if (filters.clientType.length > 0) params.set("clientType", filters.clientType.join(","));
      else params.delete("clientType");
      if (filters.intent.length > 0) params.set("intent", filters.intent.join(","));
      else params.delete("intent");
      if (filters.leadSource.length > 0) params.set("leadSource", filters.leadSource.join(","));
      else params.delete("leadSource");
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
    ["status", "clientType", "intent", "leadSource", "assignedTo", "budgetMin", "budgetMax"].forEach(
      (k) => params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const removeChip = React.useCallback(
    (key: keyof ClientFilters, value?: string) => {
      const updated = { ...activeFilters };
      if (key === "assignedTo") updated.assignedTo = "";
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

  const chips: FilterChip[] = React.useMemo(() => {
    const result: FilterChip[] = [];
    activeFilters.status.forEach((v) =>
      result.push({ label: `Status: ${STATUS_LABELS[v] ?? v}`, onRemove: () => removeChip("status", v) })
    );
    activeFilters.clientType.forEach((v) =>
      result.push({ label: `Type: ${TYPE_LABELS[v] ?? v}`, onRemove: () => removeChip("clientType", v) })
    );
    activeFilters.intent.forEach((v) =>
      result.push({ label: `Intent: ${INTENT_LABELS[v] ?? v}`, onRemove: () => removeChip("intent", v) })
    );
    activeFilters.leadSource.forEach((v) =>
      result.push({ label: `Source: ${SOURCE_LABELS[v] ?? v}`, onRemove: () => removeChip("leadSource", v) })
    );
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
      searchKey="name"
      searchPlaceholder={commonT("filterPlaceholder")}
      filterCount={filterCount}
      chips={chips}
      onFilterOpen={() => setDrawerOpen(true)}
      onReset={handleReset}
      rightContent={rightContent}
    >
      <ClientFilterDrawer
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
