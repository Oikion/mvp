"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AdminAuditLog } from "@prisma/client";

interface AuditLogsDataTableProps {
  logs: AdminAuditLog[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentAdminId?: string;
  currentAction?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  locale: string;
}

export function AuditLogsDataTable({
  logs,
  totalCount,
  page,
  totalPages,
  currentAdminId: _currentAdminId,
  currentAction,
  currentStartDate,
  currentEndDate,
  locale,
}: AuditLogsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [actionFilter, setActionFilter] = React.useState(currentAction || "");
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    currentStartDate ? new Date(currentStartDate) : undefined
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    currentEndDate ? new Date(currentEndDate) : undefined
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Update URL with search params
  const updateSearchParams = React.useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      router.push(`/${locale}/app/platform-admin/audit-logs?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle action filter
  const handleActionFilter = React.useCallback(
    (value: string) => {
      setActionFilter(value);
      updateSearchParams({ action: value || undefined, page: "1" });
    },
    [updateSearchParams]
  );

  // Handle date filter
  const handleDateFilter = React.useCallback(() => {
    updateSearchParams({
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      page: "1",
    });
  }, [startDate, endDate, updateSearchParams]);

  // Clear date filter
  const clearDateFilter = React.useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    updateSearchParams({
      startDate: undefined,
      endDate: undefined,
      page: "1",
    });
  }, [updateSearchParams]);

  // Handle pagination
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({ page: newPage.toString() });
    },
    [updateSearchParams]
  );

  // Define columns
  const columns: ColumnDef<AdminAuditLog>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const date = new Date(row.getValue("timestamp"));
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {format(date, "MMM dd, yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(date, "HH:mm:ss")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {action}
          </Badge>
        );
      },
    },
    {
      accessorKey: "adminId",
      header: "Admin ID",
      cell: ({ row }) => {
        const adminId = row.getValue("adminId") as string;
        return (
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-mono text-muted-foreground">
              {adminId.slice(0, 12)}...
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "targetId",
      header: "Target ID",
      cell: ({ row }) => {
        const targetId = row.getValue("targetId") as string | null;
        if (!targetId) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {targetId.slice(0, 12)}...
          </span>
        );
      },
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => {
        const ip = row.getValue("ipAddress") as string | null;
        return (
          <span className="text-sm font-mono">
            {ip || <span className="text-muted-foreground">-</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => {
        const details = row.getValue("details") as any;
        if (!details || Object.keys(details).length === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7">
                View
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <pre className="text-xs overflow-auto max-h-60">
                {JSON.stringify(details, null, 2)}
              </pre>
            </PopoverContent>
          </Popover>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Action Filter */}
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            <SelectItem value="VIEW_USERS">VIEW_USERS</SelectItem>
            <SelectItem value="VIEW_ORGANIZATIONS">VIEW_ORGANIZATIONS</SelectItem>
            <SelectItem value="SUSPEND_ACCOUNT">SUSPEND_ACCOUNT</SelectItem>
            <SelectItem value="DELETE_ACCOUNT">DELETE_ACCOUNT</SelectItem>
            <SelectItem value="VIEW_ADMIN_LOGS">VIEW_ADMIN_LOGS</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                (!startDate && !endDate) && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {startDate && endDate ? (
                <>
                  {format(startDate, "MMM dd")} - {format(endDate, "MMM dd")}
                </>
              ) : (
                "Pick date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Start Date</label>
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">End Date</label>
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) =>
                    startDate ? date < startDate : false
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDateFilter} size="sm" className="flex-1">
                  Apply
                </Button>
                <Button
                  onClick={clearDateFilter}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateFilter}
            className="h-8 px-2"
            aria-label="Clear date filter"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {logs.length} of {totalCount.toLocaleString()} logs
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
