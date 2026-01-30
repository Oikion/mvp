"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BulkAction<TData> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: (selectedRows: TData[]) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>;
  actions?: BulkAction<TData>[];
  className?: string;
}

export function DataTableBulkActions<TData>({
  table,
  actions = [],
  className,
}: DataTableBulkActionsProps<TData>) {
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const t = useTranslations("common");

  if (selectedRowCount === 0) {
    return null;
  }

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  const handleClearSelection = () => {
    table.resetRowSelection();
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-surface-2 border border-border rounded-full",
        "shadow-[0_4px_20px_rgba(150,150,150,0.25)]",
        "flex items-center gap-2 px-4 py-2",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        className
      )}
    >
      {/* Selection count */}
      <Badge variant="secondary" className="text-sm font-medium">
        {selectedRowCount} {t("misc.selected") || "Selected"}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="secondary"
            size="sm"
            onClick={() => action.onClick(selectedRows)}
            disabled={action.disabled || action.loading}
            className="gap-2 bg-muted/80 hover:bg-muted"
          >
            {action.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Clear selection button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClearSelection}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">{t("misc.clearSelection") || "Clear selection"}</span>
      </Button>
    </div>
  );
}

interface PublishToPortalsActionProps<TData> {
  table: Table<TData>;
  onPublish: (selectedRows: TData[], portal: string) => void | Promise<void>;
  isPublishing?: boolean;
}

export function PublishToPortalsAction<TData>({
  table,
  onPublish,
  isPublishing = false,
}: PublishToPortalsActionProps<TData>) {
  const t = useTranslations("mls.BulkActions");
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          disabled={isPublishing}
          className="gap-2"
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <span>{t("publishToPortals")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onClick={() => onPublish(selectedRows, "xe.gr")}>
          <Globe className="mr-2 h-4 w-4 text-success" />
          {t("xeGr")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
