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
  searchKey?: string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
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
          {searchKey && (
            <Input
              placeholder={searchPlaceholder ?? ""}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className="h-10 w-[240px] lg:w-[320px]"
            />
          )}
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={onFilterOpen}
            aria-haspopup="dialog"
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
          {chips.map((chip) => (
            <span
              key={chip.label}
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
