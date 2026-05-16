"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
import { useTableKeyboard } from "@/hooks/use-table-keyboard";
import { Archive } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableBulkActions, type BulkAction } from "@/components/ui/data-table/data-table-bulk-actions";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  users: any[];
  getRowHref?: (row: TData) => string;
  toolbarRight?: React.ReactNode;
  onRefresh?: () => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function RequestDataTable<TData extends { id: string }, TValue>({
  columns,
  data,
  users,
  getRowHref,
  toolbarRight,
  onRefresh,
  onBulkDelete,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const table = useTableWithPageSize({
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

  const handleOpen = React.useCallback((row: Row<TData>) => {
    if (getRowHref) router.push(getRowHref(row.original));
  }, [getRowHref, router]);

  const handleDelete = React.useCallback(async (rows: Row<TData>[]) => {
    if (!onBulkDelete) return;
    await onBulkDelete(rows.map((r) => r.original.id));
  }, [onBulkDelete]);

  const { tableContainerProps, getRowProps, isRowFocused, isTableFocused, focusedRowIndex } =
    useTableKeyboard({
      table,
      onOpen: getRowHref ? handleOpen : undefined,
      onDelete: onBulkDelete ? handleDelete : undefined,
      enabled: true,
      containerRef,
    });

  const bulkActions: BulkAction<TData>[] = React.useMemo(() => {
    if (!onBulkDelete) return [];
    return [{
      id: "bulk-archive",
      label: "Archive",
      icon: <Archive className="h-4 w-4" />,
      variant: "destructive" as const,
      onClick: async (selectedRows) => {
        await onBulkDelete(selectedRows.map((r) => r.id));
      },
    }];
  }, [onBulkDelete]);

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} users={users} rightContent={toolbarRight} onRefresh={onRefresh} />
      <div
        ref={containerRef}
        className={cn(
          "rounded-md border outline-none transition-shadow",
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
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    onClick={(e) => {
                      rowProps.onClick(e);
                      if (getRowHref && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                        const target = e.target as HTMLElement;
                        if (target.closest('button, a, input, select, textarea, [role="combobox"], [role="menuitem"], [data-radix-collection-item]')) return;
                        router.push(getRowHref(row.original));
                      }
                    }}
                    className={cn(
                      getRowHref ? "cursor-pointer" : undefined,
                      isRowFocused(index) && "bg-accent/50 ring-1 ring-inset ring-primary/50",
                      row.getIsSelected() && "bg-accent"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
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
          <span>Select:</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">X</kbd>
        </div>
      </div>
      <DataTableBulkActions table={table} actions={bulkActions} />
    </div>
  );
}
