# Unified Data Table System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 3 independent data table toolbar implementations with one shared composition shell, standardise row-actions to use `DataTableRowActions` everywhere, and give every table a right-slide edit modal instead of page navigation.

**Architecture:** A rewritten `DataTableToolbar` shell lives in `/components/ui/data-table/` and owns all toolbar chrome (search, filter button with badge, reset, chip pills, clear all). Per-table toolbar files keep their domain filter logic and pass `chips[]` + `filterCount` + `onReset` into the shell. Row actions for all three tables use the existing shared `DataTableRowActions` component wired to right-slide modals for editing.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Table v8, next-intl, shadcn/ui, axios, Zustand (`useActionModal`), `RightViewModalNoTrigger`

---

## Actual Current State (verified by reading source)

| Feature | Properties | Clients | Mandates |
|---------|-----------|---------|----------|
| `DataTableRowActions` used? | ✅ `PropertyRowActions.tsx` | ✅ `ClientRowActions.tsx` | ❌ Inline in `columns.tsx` |
| Watch/Unwatch | N/A | ❌ Dead code in old file | N/A |
| Edit method | Navigate `?edit=true` | Navigate `?edit=true` | Navigate `?edit=true` |
| Delete confirmation | ✅ Zustand modal | ✅ Zustand modal | ❌ None |
| `SharedActionModals` on page | ✅ | ✅ | ❌ Missing |
| Toolbar chip style | `<Badge>` rectangle | `<span>` pill ✅ | `<span>` pill ✅ |
| Reset button | ❌ Missing | ✅ | ✅ |
| Toolbar uses shared shell | ❌ Custom | ❌ Custom | ❌ Custom |
| Checkbox component | `DataTableSelectCheckbox` ✅ | Custom ✅ | Raw `<Checkbox>` ❌ |

---

## Task 1: Rewrite Shared `DataTableToolbar` Shell

**Files:**
- Modify: `components/ui/data-table/data-table-toolbar.tsx`

This is the foundation. All toolbar chrome lives here. After this task every table that adopts it will automatically get: correct chip pills, Reset button, Clear All, filter badge.

**Step 1: Replace the file with the new composition shell**

```tsx
"use client";

import * as React from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Filter, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface FilterChip {
  label: string;
  onRemove: () => void;
}

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  /** Column accessor key used for the text-search input */
  searchKey: string;
  /** Placeholder text for the search input */
  searchPlaceholder: string;
  /** Number to show in the badge on the Filters button */
  filterCount?: number;
  /** Active filter chips to render below the toolbar */
  chips?: FilterChip[];
  /** Called when the user clicks the Filters button */
  onFilterOpen?: () => void;
  /** Called when the user clicks Reset or Clear All — should clear all URL params */
  onReset?: () => void;
  /** Content rendered to the right of the toolbar (e.g. "New Property" button) */
  rightContent?: React.ReactNode;
  /** Filter drawer — rendered as children so it mounts/unmounts with this component */
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder,
  filterCount = 0,
  chips = [],
  onFilterOpen,
  onReset,
  rightContent,
  children,
}: DataTableToolbarProps<TData>) {
  const commonT = useTranslations("common");
  const isFiltered = table.getState().columnFilters.length > 0;
  const hasActiveFilters = isFiltered || filterCount > 0;

  return (
    <div className="space-y-2">
      {/* Row 1: search + filter controls + right slot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="h-10 w-[240px] lg:w-[320px]"
          />
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={onFilterOpen}
          >
            <Filter className="h-4 w-4" />
            {commonT("filters")}
            {filterCount > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0.5 text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                onReset?.();
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

      {/* Row 2 (conditional): active filter chips */}
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
                onReset?.();
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {commonT("clearAll")}
            </button>
          )}
        </div>
      )}

      {/* Filter drawer slot */}
      {children}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**
```bash
pnpm tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to `data-table-toolbar.tsx`

**Step 3: Commit**
```bash
git add components/ui/data-table/data-table-toolbar.tsx
git commit -m "feat: rewrite shared DataTableToolbar as composition shell with chips, reset, filter badge"
```

---

## Task 2: Migrate Properties Toolbar to Shared Shell

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/data-table-toolbar.tsx`

The goal is to keep all the filter URL-sync logic but replace the hand-rolled JSX with the shared shell. The biggest change is converting chip rendering from inline `<Badge>` JSX to a `chips[]` array with prefixed labels.

**Step 1: Replace the file content**

```tsx
"use client";

import { Table } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
import { PropertyFilterDrawer, type PropertyFilters } from "./PropertyFilterDrawer";
import { useOrgUsers } from "@/hooks/swr";

export function DataTableToolbar_Properties<TData>({ table, rightContent }: { table: Table<TData>; rightContent?: React.ReactNode }) {
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

  // Build chips array — prefixed labels matching Clients/Mandates pattern
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
```

> **Note:** The exported function is named `DataTableToolbar_Properties` to avoid a name clash with the import from the shared module. The `data-table.tsx` for Properties imports it as `DataTableToolbar` via the local path — update that import to point to this file as usual (no change needed there since it imports from `"./data-table-toolbar"`).

**Step 2: Run TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "data-table-toolbar" | head -20
```
Expected: no errors

**Step 3: Visually verify in browser**
- Navigate to MLS Properties page
- Verify: search input, Filters button with badge, Reset button (add a filter first), pill-shaped chips with prefixed labels, Clear All link

**Step 4: Commit**
```bash
git add "app/[locale]/app/(routes)/mls/properties/table-components/data-table-toolbar.tsx"
git commit -m "feat(mls): migrate properties toolbar to shared DataTableToolbar shell"
```

---

## Task 3: Migrate Clients Toolbar to Shared Shell

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-toolbar.tsx`

The Clients toolbar already has the best chip logic in the codebase. This migration is mostly a drop-in — we just swap the hand-rolled JSX for the shared shell import.

**Step 1: Replace the file content**

```tsx
"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
import { ClientFilterDrawer, type ClientFilters } from "./ClientFilterDrawer";

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
    <DataTableToolbar
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
    </DataTableToolbar>
  );
}
```

**Step 2: TypeScript check + visual verify**
```bash
pnpm tsc --noEmit 2>&1 | grep "crm\|accounts" | head -20
```

**Step 3: Commit**
```bash
git add "app/[locale]/app/(routes)/crm/accounts/table-components/data-table-toolbar.tsx"
git commit -m "feat(crm): migrate clients toolbar to shared DataTableToolbar shell"
```

---

## Task 4: Migrate Mandates Toolbar to Shared Shell

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/table-components/data-table-toolbar.tsx`

Mandates already has the `chips[]` abstraction — this is the most mechanical migration.

**Step 1: Replace the file content**

```tsx
"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTableToolbar, type FilterChip } from "@/components/ui/data-table/data-table-toolbar";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const activeFilters: MandateFilters = React.useMemo(
    () => ({
      status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
      urgency: searchParams.get("urgency")?.split(",").filter(Boolean) ?? [],
      transactionType: searchParams.get("transactionType")?.split(",").filter(Boolean) ?? [],
      propertyType: searchParams.get("propertyType")?.split(",").filter(Boolean) ?? [],
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
    if (activeFilters.transactionType.length > 0) count++;
    if (activeFilters.propertyType.length > 0) count++;
    if (activeFilters.linkedStatus) count++;
    if (activeFilters.assignedTo) count++;
    if (activeFilters.budgetMin !== null) count++;
    if (activeFilters.budgetMax !== null) count++;
    return count;
  }, [activeFilters]);

  const handleApply = React.useCallback(
    (filters: MandateFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, values: string[]) => {
        if (values.length > 0) params.set(key, values.join(","));
        else params.delete(key);
      };
      setOrDelete("status", filters.status);
      setOrDelete("urgency", filters.urgency);
      setOrDelete("transactionType", filters.transactionType);
      setOrDelete("propertyType", filters.propertyType);
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
    ["status", "urgency", "transactionType", "propertyType", "linkedStatus", "assignedTo", "budgetMin", "budgetMax"].forEach(
      (k) => params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const removeChip = React.useCallback(
    (key: keyof MandateFilters, value?: string) => {
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
    table.getColumn("transaction_type")?.setFilterValue(
      activeFilters.transactionType.length > 0 ? activeFilters.transactionType : undefined
    );
  }, [activeFilters.transactionType, table]);

  const chips: FilterChip[] = React.useMemo(() => {
    const result: FilterChip[] = [];
    activeFilters.status.forEach((v) =>
      result.push({ label: `Status: ${t(`MandateForm.status.${v}`)}`, onRemove: () => removeChip("status", v) })
    );
    activeFilters.urgency.forEach((v) =>
      result.push({ label: `Urgency: ${t(`MandateForm.urgency.${v}`)}`, onRemove: () => removeChip("urgency", v) })
    );
    activeFilters.transactionType.forEach((v) =>
      result.push({ label: `Type: ${v}`, onRemove: () => removeChip("transactionType", v) })
    );
    activeFilters.propertyType.forEach((v) =>
      result.push({ label: `Property: ${v}`, onRemove: () => removeChip("propertyType", v) })
    );
    if (activeFilters.linkedStatus)
      result.push({
        label: `Client: ${activeFilters.linkedStatus === "linked" ? t("Filters.linked") : t("Filters.unlinked")}`,
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
    <DataTableToolbar
      table={table}
      searchKey="title"
      searchPlaceholder={t("MandatesTable.filterPlaceholder")}
      filterCount={filterCount}
      chips={chips}
      onFilterOpen={() => setDrawerOpen(true)}
      onReset={handleReset}
      rightContent={rightContent}
    >
      <MandateFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        users={users}
        activeFilters={activeFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </DataTableToolbar>
  );
}
```

**Step 2: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "mandates" | head -20
```

**Step 3: Commit**
```bash
git add "app/[locale]/app/(routes)/mandates/table-components/data-table-toolbar.tsx"
git commit -m "feat(mandates): migrate mandates toolbar to shared DataTableToolbar shell"
```

---

## Task 5: Add "mandate" EntityType + Fix Keyboard Shortcut

**Files:**
- Modify: `components/ui/data-table/data-table-row-actions.tsx`

**Step 1: Add "mandate" to the EntityType union (line ~35)**

Find:
```ts
export type EntityType = "property" | "client" | "contact" | "event" | "task" | "employee" | "user";
```
Replace with:
```ts
export type EntityType = "property" | "client" | "contact" | "event" | "task" | "employee" | "user" | "mandate";
```

**Step 2: Add mandate path to `getBasePath()` (line ~117)**

Find:
```ts
case "employee":
  return "/app/employees";
```
Add before the default:
```ts
case "mandate":
  return "/app/mandates";
```

**Step 3: Fix keyboard shortcut (line ~303)**

Find:
```tsx
<DropdownMenuShortcut>⌘/Ctrl+⌫</DropdownMenuShortcut>
```
Replace with:
```tsx
<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
```

**Step 4: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "row-actions" | head -10
```

**Step 5: Commit**
```bash
git add components/ui/data-table/data-table-row-actions.tsx
git commit -m "feat: add mandate entity type and standardise delete keyboard shortcut to ⌘⌫"
```

---

## Task 6: Add Right-Slide Edit Modal to PropertyRowActions

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/PropertyRowActions.tsx`

**Step 1: Replace the file content**

```tsx
"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";

import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { EditPropertyForm } from "../[slug]/components/EditPropertyForm";

interface PropertyRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

export function PropertyRowActions({ row }: PropertyRowActionsProps) {
  const router = useRouter();
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`/api/mls/properties/${data.id}`);
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={data.property_name ?? "Edit Property"}
        description="Update property details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <EditPropertyForm initialData={data} />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="property"
        entityId={data.id}
        entityName={data.property_name}
        onView={() => router.push(`/app/mls/properties/${data.friendlyId}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        onActionComplete={() => { setEditOpen(false); router.refresh(); }}
      />
    </>
  );
}
```

> **Note on import path:** `EditPropertyForm` is in `../[slug]/components/EditPropertyForm` — the `[slug]` folder in the import path works because this is a static import (TypeScript resolves it at build time, not route time).

**Step 2: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "PropertyRowActions\|EditPropertyForm" | head -10
```
If you get an error about the `[slug]` path, check the actual relative path from `table-components/` to `[slug]/components/` — it should be `..\/[slug]/components/EditPropertyForm`.

**Step 3: Verify in browser**
- Open Properties table, click ⋯ on a row, click Edit
- Right-slide modal should open with the property pre-filled
- Save should close modal and refresh the table

**Step 4: Commit**
```bash
git add "app/[locale]/app/(routes)/mls/properties/table-components/PropertyRowActions.tsx"
git commit -m "feat(mls): open edit property in right-slide modal instead of navigating"
```

---

## Task 7: Add Right-Slide Edit + Watch/Unwatch to ClientRowActions

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/accounts/table-components/ClientRowActions.tsx`

**Step 1: Replace the file content**

```tsx
"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateAccountForm, type AccountFormData } from "../components/UpdateAccountForm";

interface ClientRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

export function ClientRowActions({ row }: ClientRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`/api/crm/account/${data.id}`);
  };

  const handleWatch = async () => {
    try {
      await axios.post(`/api/crm/account/${data.id}/watch`);
      toast({ variant: "success", title: "Success", description: `Now watching ${data.name ?? data.client_name}` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not watch account" });
    }
  };

  const handleUnwatch = async () => {
    try {
      await axios.post(`/api/crm/account/${data.id}/unwatch`);
      toast({ variant: "success", title: "Success", description: `Stopped watching ${data.name ?? data.client_name}` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not unwatch account" });
    }
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={`Update Account — ${data.name ?? data.client_name ?? ""}`}
        description="Update account details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <UpdateAccountForm initialData={row.original as AccountFormData} open={setEditOpen} />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="client"
        entityId={data.id}
        entityName={data.name || data.client_name}
        onView={() => router.push(`/app/crm/clients/${data.friendlyId}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        customActions={[
          { id: "watch", label: "Watch Account", icon: Eye, onClick: handleWatch },
          { id: "unwatch", label: "Stop Watching", icon: EyeOff, onClick: handleUnwatch },
        ]}
        onActionComplete={() => { setEditOpen(false); router.refresh(); }}
      />
    </>
  );
}
```

**Step 2: Delete the now-dead old file**
```bash
git rm "app/[locale]/app/(routes)/crm/accounts/table-components/data-table-row-actions.tsx"
```

**Step 3: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "crm\|accounts\|ClientRowActions" | head -10
```

**Step 4: Verify in browser**
- Open Clients table, click ⋯ on a row
- Should see: View, Edit, separator, Schedule Event, Share, separator, Watch Account, Stop Watching, separator, Delete ⌘⌫
- Click Edit → right-slide modal with UpdateAccountForm pre-filled

**Step 5: Commit**
```bash
git add "app/[locale]/app/(routes)/crm/accounts/table-components/ClientRowActions.tsx"
git commit -m "feat(crm): add right-slide edit modal and Watch/Unwatch to client row actions"
```

---

## Task 8: Create MandateRowActions Component

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/MandateRowActions.tsx`

This is a new file. Mandates currently have no delete confirmation and no edit modal.

**Step 1: Create the file**

```tsx
"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";

import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import EditMandateForm from "../[slug]/components/EditMandateForm";

interface MandateRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

export function MandateRowActions({ row }: MandateRowActionsProps) {
  const router = useRouter();
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`/api/mandates/${data.id}`);
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={data.title ?? "Edit Mandate"}
        description="Update mandate details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <EditMandateForm
          mandate={data}
          onSave={() => { setEditOpen(false); router.refresh(); }}
        />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="mandate"
        entityId={data.id}
        entityName={data.title}
        onView={() => router.push(`/app/mandates/${data.friendlyId}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onActionComplete={() => { setEditOpen(false); router.refresh(); }}
      />
    </>
  );
}
```

**Step 2: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "MandateRowActions\|EditMandateForm" | head -10
```

**Step 3: Commit (before wiring — lets you test the file compiles)**
```bash
git add "app/[locale]/app/(routes)/mandates/table-components/MandateRowActions.tsx"
git commit -m "feat(mandates): create MandateRowActions with edit modal and delete confirmation"
```

---

## Task 9: Update Mandates `columns.tsx` — Wire Actions + Fix Checkbox

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/table-components/columns.tsx`

Two changes: (1) replace the inline actions cell with `<MandateRowActions>`, (2) replace raw `<Checkbox>` in the select column with `DataTableSelectCheckbox`.

**Step 1: Update imports at the top of the file**

Remove these imports (no longer needed):
```ts
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
```

Add these imports:
```ts
import { MandateRowActions } from "./MandateRowActions";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
```

**Step 2: Replace the `select` column header and cell**

Find the entire `select` column definition:
```tsx
{
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="translate-y-[2px]"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className="translate-y-[2px]"
    />
  ),
  enableSorting: false,
  enableHiding: false,
},
```

Replace with:
```tsx
{
  id: "select",
  header: ({ table }) => <DataTableSelectAllCheckbox table={table} />,
  cell: ({ row, table }) => <DataTableSelectCheckbox row={row} table={table} />,
  enableSorting: false,
  enableHiding: false,
},
```

**Step 3: Replace the inline `actions` column cell**

Find:
```tsx
{
  id: "actions",
  cell: ({ row }) => {
    const mandate = row.original;
    return (
      <DropdownMenu>
        ...entire dropdown...
      </DropdownMenu>
    );
  },
},
```

Replace with:
```tsx
{
  id: "actions",
  cell: ({ row }) => <MandateRowActions row={row} />,
},
```

**Step 4: Also remove the now-unused `Checkbox` import**
```ts
// Remove this line:
import { Checkbox } from "@/components/ui/checkbox";
```

**Step 5: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "columns\|mandates" | head -20
```

**Step 6: Verify in browser**
- Open Mandates table
- Click ⋯ on a row → should see View, Edit, Delete ⌘⌫ (with delete confirmation modal)
- Click Edit → right-slide modal with `EditMandateForm` pre-filled
- Checkboxes should look identical to Properties/Clients

**Step 7: Commit**
```bash
git add "app/[locale]/app/(routes)/mandates/table-components/columns.tsx"
git commit -m "feat(mandates): wire MandateRowActions and use shared DataTableSelectCheckbox"
```

---

## Task 10: Add `SharedActionModals` to MandatesPageView

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/components/MandatesPageView.tsx`

Without this, the delete confirmation modal triggered by `DataTableRowActions` will never render on the Mandates page.

**Step 1: Add the import**

Find the existing imports in `MandatesPageView.tsx` and add:
```ts
import { SharedActionModals } from "@/components/entity";
```

**Step 2: Add the component in the JSX**

Find the return JSX. Add `<SharedActionModals />` just before the closing tag of the outermost container, as is done in `PropertiesPageView.tsx` (line ~372) and `ClientsPageView.tsx` (line ~394):

```tsx
      {/* ... rest of JSX ... */}
      <SharedActionModals />
    </div>  {/* or whatever the closing tag is */}
  );
```

**Step 3: TypeScript + build check**
```bash
pnpm tsc --noEmit 2>&1 | grep "MandatesPageView\|SharedActionModals" | head -10
```

**Step 4: Verify delete works end-to-end**
- Open Mandates table
- Click ⋯ → Delete
- Should see a confirmation modal with the mandate name
- Confirm → mandate is deleted, table refreshes

**Step 5: Commit**
```bash
git add "app/[locale]/app/(routes)/mandates/components/MandatesPageView.tsx"
git commit -m "feat(mandates): add SharedActionModals to enable delete confirmation modal"
```

---

## Task 11: Final Cleanup

**Files:**
- Verify `crm/accounts/table-components/data-table-row-actions.tsx` has been deleted (done in Task 7)
- Run full build to confirm no broken imports

**Step 1: Full build**
```bash
pnpm build 2>&1 | tail -30
```
Expected: successful build with no errors

**Step 2: Check for any remaining references to the deleted file**
```bash
grep -r "data-table-row-actions" "app/[locale]/app/(routes)/crm/accounts/" --include="*.tsx" --include="*.ts"
```
Expected: no results

**Step 3: Final commit**
```bash
git add -A
git commit -m "chore: remove dead ClientRowActions legacy file, confirm unified table system complete"
```

---

## Summary of All Files Changed

| File | Change |
|------|--------|
| `components/ui/data-table/data-table-toolbar.tsx` | **Rewritten** — shared shell |
| `mls/.../table-components/data-table-toolbar.tsx` | Migrated to shared shell |
| `crm/accounts/table-components/data-table-toolbar.tsx` | Migrated to shared shell |
| `mandates/table-components/data-table-toolbar.tsx` | Migrated to shared shell |
| `components/ui/data-table/data-table-row-actions.tsx` | Added `"mandate"`, fixed shortcut |
| `mls/.../table-components/PropertyRowActions.tsx` | Added right-slide edit modal |
| `crm/accounts/table-components/ClientRowActions.tsx` | Added right-slide edit modal + Watch/Unwatch |
| `crm/accounts/table-components/data-table-row-actions.tsx` | **Deleted** (dead code) |
| `mandates/table-components/MandateRowActions.tsx` | **Created** — full row actions |
| `mandates/table-components/columns.tsx` | Wired MandateRowActions + fixed checkbox |
| `mandates/components/MandatesPageView.tsx` | Added `<SharedActionModals />` |

## Post-Implementation Verification Checklist

For each of the 3 tables (Properties, Clients, Mandates), verify:

- [ ] Search input works and filters rows
- [ ] Filter drawer opens from Filters button
- [ ] Filter badge shows correct count on Filters button
- [ ] Reset button appears when any filter is active
- [ ] Active filters show as pill chips with prefixed labels
- [ ] Individual chip × removes that filter only
- [ ] Clear All removes all chips (only shows when >1 chip)
- [ ] Row ⋯ menu: View navigates to detail page
- [ ] Row ⋯ menu: Edit opens right-slide modal with pre-filled form
- [ ] Edit modal: Save → closes modal, refreshes table
- [ ] Row ⋯ menu: Delete shows confirmation modal with entity name
- [ ] Delete confirmation: Cancel → nothing happens
- [ ] Delete confirmation: Confirm → entity deleted, table refreshes
- [ ] Delete shortcut shows ⌘⌫ in menu
- [ ] Checkboxes in first column are visually identical across tables
