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
import { ClientFilterDrawer, type ClientFilters } from "./ClientFilterDrawer";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  users?: { id: string; name: string }[];
}

export function DataTableToolbar<TData>({
  table,
  users = [],
}: DataTableToolbarProps<TData>) {
  const commonT = useTranslations("common");
  const isFiltered = table.getState().columnFilters.length > 0;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Parse active filters from URL search params
  const activeFilters: ClientFilters = React.useMemo(
    () => ({
      status:
        searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      clientType:
        searchParams.get("clientType")?.split(",").filter(Boolean) ?? [],
      intent:
        searchParams.get("intent")?.split(",").filter(Boolean) ?? [],
      leadSource:
        searchParams.get("leadSource")?.split(",").filter(Boolean) ?? [],
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

  // Count active drawer filters (excludes the faceted status filter managed by TanStack)
  const drawerFilterCount = React.useMemo(() => {
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

  // Push filters to URL
  const handleApply = React.useCallback(
    (filters: ClientFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      if (filters.status.length > 0) {
        params.set("status", filters.status.join(","));
      } else {
        params.delete("status");
      }
      if (filters.clientType.length > 0) {
        params.set("clientType", filters.clientType.join(","));
      } else {
        params.delete("clientType");
      }
      if (filters.intent.length > 0) {
        params.set("intent", filters.intent.join(","));
      } else {
        params.delete("intent");
      }
      if (filters.leadSource.length > 0) {
        params.set("leadSource", filters.leadSource.join(","));
      } else {
        params.delete("leadSource");
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
    params.delete("clientType");
    params.delete("intent");
    params.delete("leadSource");
    params.delete("assignedTo");
    params.delete("budgetMin");
    params.delete("budgetMax");
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Remove a single chip
  const removeChip = React.useCallback(
    (key: keyof ClientFilters, value?: string) => {
      const updated = { ...activeFilters };
      if (key === "assignedTo") {
        updated.assignedTo = "";
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

  // Build chip labels for active filters
  const chips: { label: string; onRemove: () => void }[] = React.useMemo(() => {
    const result: { label: string; onRemove: () => void }[] = [];

    const STATUS_LABELS: Record<string, string> = {
      LEAD: "Lead",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      CONVERTED: "Converted",
      LOST: "Lost",
    };
    const TYPE_LABELS: Record<string, string> = {
      BUYER: "Buyer",
      SELLER: "Seller",
      RENTER: "Renter",
      INVESTOR: "Investor",
      REFERRAL_PARTNER: "Referral Partner",
    };
    const INTENT_LABELS: Record<string, string> = {
      BUY: "Buy",
      RENT: "Rent",
      SELL: "Sell",
      LEASE: "Lease",
      INVEST: "Invest",
    };
    const SOURCE_LABELS: Record<string, string> = {
      REFERRAL: "Referral",
      WEB: "Web",
      PORTAL: "Portal",
      WALK_IN: "Walk-in",
      SOCIAL: "Social",
    };

    activeFilters.status.forEach((v) => {
      result.push({
        label: `Status: ${STATUS_LABELS[v] ?? v}`,
        onRemove: () => removeChip("status", v),
      });
    });
    activeFilters.clientType.forEach((v) => {
      result.push({
        label: `Type: ${TYPE_LABELS[v] ?? v}`,
        onRemove: () => removeChip("clientType", v),
      });
    });
    activeFilters.intent.forEach((v) => {
      result.push({
        label: `Intent: ${INTENT_LABELS[v] ?? v}`,
        onRemove: () => removeChip("intent", v),
      });
    });
    activeFilters.leadSource.forEach((v) => {
      result.push({
        label: `Source: ${SOURCE_LABELS[v] ?? v}`,
        onRemove: () => removeChip("leadSource", v),
      });
    });
    if (activeFilters.assignedTo) {
      const user = users.find((u) => u.id === activeFilters.assignedTo);
      result.push({
        label: `Assigned: ${user?.name ?? activeFilters.assignedTo}`,
        onRemove: () => removeChip("assignedTo"),
      });
    }
    if (activeFilters.budgetMin !== null) {
      result.push({
        label: `Min: €${activeFilters.budgetMin.toLocaleString()}`,
        onRemove: () => removeChip("budgetMin"),
      });
    }
    if (activeFilters.budgetMax !== null) {
      result.push({
        label: `Max: €${activeFilters.budgetMax.toLocaleString()}`,
        onRemove: () => removeChip("budgetMax"),
      });
    }

    return result;
  }, [activeFilters, users, removeChip]);

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <Input
            placeholder={commonT("filterPlaceholder")}
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
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
            Filters
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
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Filter drawer */}
      <ClientFilterDrawer
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
