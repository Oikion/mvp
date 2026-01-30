"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableBulkActions, type BulkAction } from "./data-table-bulk-actions";
import { useTableKeyboard } from "@/hooks/use-table-keyboard";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: {
    column: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
  /** Callback when a row is opened/viewed (Enter or O key) */
  onRowOpen?: (row: Row<TData>) => void;
  /** Callback when a row should be edited (E key) */
  onRowEdit?: (row: Row<TData>) => void;
  /** Callback when row(s) should be deleted (Shift+Backspace) */
  onRowDelete?: (rows: Row<TData>[]) => void;
  /** Whether keyboard navigation is enabled (default: true) */
  enableKeyboardNav?: boolean;
  /** Bulk actions to show when rows are selected */
  bulkActions?: BulkAction<TData>[];
}

export function DataTable<TData, TValue>({ 
  columns, 
  data, 
  searchKey,
  searchPlaceholder,
  filters,
  onRowOpen,
  onRowEdit,
  onRowDelete,
  enableKeyboardNav = true,
  bulkActions,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Keyboard navigation hook
  const {
    tableContainerProps,
    getRowProps,
    isRowFocused,
    isTableFocused,
    focusedRowIndex,
  } = useTableKeyboard({
    table,
    onOpen: onRowOpen,
    onEdit: onRowEdit,
    onDelete: onRowDelete,
    enabled: enableKeyboardNav,
    containerRef,
  });

  // Handle bulk action keyboard shortcuts
  React.useEffect(() => {
    if (!bulkActions || bulkActions.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if we have selected rows
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      if (selectedRows.length === 0) return;

      // Don't trigger in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Check for matching shortcuts
      for (const action of bulkActions) {
        if (action.shortcut && event.key.toLowerCase() === action.shortcut.toLowerCase() && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          action.onClick(selectedRows.map(row => row.original));
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bulkActions, table]);

  return (
    <div className="space-y-4">
      <DataTableToolbar 
        table={table} 
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
      />
      <div
        ref={containerRef}
        className={cn(
          "rounded-md outline-none transition-shadow",
          isTableFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        {...tableContainerProps}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => {
                const rowProps = getRowProps(index);
                return (
                  <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"}
                    data-focused={isRowFocused(index)}
                    onClick={rowProps.onClick}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isRowFocused(index) && "bg-accent/50 ring-1 ring-inset ring-primary/50",
                      row.getIsSelected() && "bg-accent"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <DataTablePagination table={table} />
        {enableKeyboardNav && (
          <div className="text-xs text-muted-foreground hidden md:flex items-center gap-2">
            {isTableFocused && focusedRowIndex >= 0 && (
              <>
                <span className="text-foreground font-medium">Row {focusedRowIndex + 1}</span>
                <span className="mx-1">|</span>
              </>
            )}
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">J</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">K</kbd>
            <span className="mx-1">|</span>
            <span>Open:</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">Enter</kbd>
            <span className="mx-1">|</span>
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">X</kbd>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {bulkActions && bulkActions.length > 0 && (
        <DataTableBulkActions table={table} actions={bulkActions} />
      )}
    </div>
  );
}
