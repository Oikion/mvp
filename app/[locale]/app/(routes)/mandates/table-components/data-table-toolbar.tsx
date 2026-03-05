"use client";

import * as React from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Filter, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MandateFilterDrawer, type MandateFilters } from "./MandateFilterDrawer";

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
  const t = useTranslations("mandates");
  const commonT = useTranslations("common");
  const isFiltered = table.getState().columnFilters.length > 0;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Parse active filters from URL search params
  const activeFilters: MandateFilters = React.useMemo(
    () => ({
      status:
        searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      urgency:
        searchParams.get("urgency")?.split(",").filter(Boolean) ?? [],
      transactionType:
        searchParams.get("transactionType")?.split(",").filter(Boolean) ?? [],
      propertyType:
        searchParams.get("propertyType")?.split(",").filter(Boolean) ?? [],
      linkedStatus: searchParams.get("linkedStatus") ?? "",
      assignedTo: searchParams.get("assignedTo") ?? "",
      budgetMin: searchParams.get("budgetMin")
        ? Number(searchParams.get("budgetMin"))
        : null,
      budgetMax: searchParams.get("budgetMax")
        ? Number(searchParams.get("budgetMax"))
        : null,
    }),
    [searchParams]
  );

  // Count active drawer filters
  const drawerFilterCount = React.useMemo(() => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.urgency.length > 0) count++;
    if (activeFilters.transactionType.length > 0) count++;
    if (activeFilters.propertyType.length > 0) count++;
    if (activeFilters.linkedStatus) count++;
    if (activeFilters.assignedTo) count++;
    if (activeFilters.budgetMin !== null) count++;
    if (activeFilters.budgetMax !== null) count++;
    return count;
  }, [activeFilters]);

  // Push filters to URL
  const handleApply = React.useCallback(
    (filters: MandateFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, values: string[]) => {
        if (values.length > 0) {
          params.set(key, values.join(","));
        } else {
          params.delete(key);
        }
      };

      setOrDelete("status", filters.status);
      setOrDelete("urgency", filters.urgency);
      setOrDelete("transactionType", filters.transactionType);
      setOrDelete("propertyType", filters.propertyType);

      if (filters.linkedStatus) {
        params.set("linkedStatus", filters.linkedStatus);
      } else {
        params.delete("linkedStatus");
      }
      if (filters.assignedTo) {
        params.set("assignedTo", filters.assignedTo);
      } else {
        params.delete("assignedTo");
      }
      if (filters.budgetMin !== null) {
        params.set("budgetMin", String(filters.budgetMin));
      } else {
        params.delete("budgetMin");
      }
      if (filters.budgetMax !== null) {
        params.set("budgetMax", String(filters.budgetMax));
      } else {
        params.delete("budgetMax");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleReset = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("urgency");
    params.delete("transactionType");
    params.delete("propertyType");
    params.delete("linkedStatus");
    params.delete("assignedTo");
    params.delete("budgetMin");
    params.delete("budgetMax");
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Remove a single chip
  const removeChip = React.useCallback(
    (key: keyof MandateFilters, value?: string) => {
      const updated = { ...activeFilters };
      if (key === "assignedTo" || key === "linkedStatus") {
        (updated as any)[key] = "";
      } else if (key === "budgetMin") {
        updated.budgetMin = null;
      } else if (key === "budgetMax") {
        updated.budgetMax = null;
      } else if (value) {
        (updated[key] as string[]) = (activeFilters[key] as string[]).filter(
          (v) => v !== value
        );
      }
      handleApply(updated);
    },
    [activeFilters, handleApply]
  );

  // Sync URL status filter into TanStack table column filter
  React.useEffect(() => {
    const statusCol = table.getColumn("status");
    statusCol?.setFilterValue(
      activeFilters.status.length > 0 ? activeFilters.status : undefined
    );
  }, [activeFilters.status, table]);

  React.useEffect(() => {
    const urgencyCol = table.getColumn("urgency");
    urgencyCol?.setFilterValue(
      activeFilters.urgency.length > 0 ? activeFilters.urgency : undefined
    );
  }, [activeFilters.urgency, table]);

  React.useEffect(() => {
    const txCol = table.getColumn("transaction_type");
    txCol?.setFilterValue(
      activeFilters.transactionType.length > 0 ? activeFilters.transactionType : undefined
    );
  }, [activeFilters.transactionType, table]);

  // Build chip labels
  const chips: { label: string; onRemove: () => void }[] = React.useMemo(() => {
    const result: { label: string; onRemove: () => void }[] = [];

    activeFilters.status.forEach((v) => {
      result.push({
        label: `Status: ${t(`MandateForm.status.${v}`)}`,
        onRemove: () => removeChip("status", v),
      });
    });
    activeFilters.urgency.forEach((v) => {
      result.push({
        label: `Urgency: ${t(`MandateForm.urgency.${v}`)}`,
        onRemove: () => removeChip("urgency", v),
      });
    });
    activeFilters.transactionType.forEach((v) => {
      result.push({
        label: `Type: ${v}`,
        onRemove: () => removeChip("transactionType", v),
      });
    });
    activeFilters.propertyType.forEach((v) => {
      result.push({
        label: `Property: ${v}`,
        onRemove: () => removeChip("propertyType", v),
      });
    });
    if (activeFilters.linkedStatus) {
      result.push({
        label: `Client: ${activeFilters.linkedStatus === "linked" ? t("Filters.linked") : t("Filters.unlinked")}`,
        onRemove: () => removeChip("linkedStatus"),
      });
    }
    if (activeFilters.assignedTo) {
      const user = users.find((u) => u.id === activeFilters.assignedTo);
      result.push({
        label: `Agent: ${user?.name ?? activeFilters.assignedTo}`,
        onRemove: () => removeChip("assignedTo"),
      });
    }
    if (activeFilters.budgetMin !== null) {
      result.push({
        label: `Min: \u20AC${activeFilters.budgetMin.toLocaleString()}`,
        onRemove: () => removeChip("budgetMin"),
      });
    }
    if (activeFilters.budgetMax !== null) {
      result.push({
        label: `Max: \u20AC${activeFilters.budgetMax.toLocaleString()}`,
        onRemove: () => removeChip("budgetMax"),
      });
    }

    return result;
  }, [activeFilters, users, removeChip, t]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("MandatesTable.filterPlaceholder")}
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="h-10 w-[240px] lg:w-[320px]"
          />
          {/* Filters drawer button */}
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={() => setDrawerOpen(true)}
          >
            <Filter className="h-4 w-4" />
            {commonT("filters")}
            {drawerFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 rounded-full px-1.5 py-0.5 text-xs"
              >
                {drawerFilterCount}
              </Badge>
            )}
          </Button>
          {(isFiltered || drawerFilterCount > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                handleReset();
              }}
              className="h-10 px-2 lg:px-3"
            >
              {commonT("reset")}
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        {rightContent}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-medium"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 rounded-full hover:bg-secondary-foreground/20 p-0.5 transition-colors"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={() => {
                table.resetColumnFilters();
                handleReset();
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {commonT("clearAll")}
            </button>
          )}
        </div>
      )}

      {/* Filter drawer */}
      <MandateFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        users={users}
        activeFilters={activeFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </div>
  );
}
