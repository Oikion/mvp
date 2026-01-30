"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Calendar,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import type { AdminAccessLogEntry } from "@/actions/platform-admin/get-admin-logs";

interface LogbookDataTableProps {
  logs: AdminAccessLogEntry[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentStartDate?: string;
  currentEndDate?: string;
  locale: string;
}

export function LogbookDataTable({
  logs,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentStartDate,
  currentEndDate,
  locale,
}: LogbookDataTableProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
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
      router.push(`/${locale}/app/platform-admin/logbook?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle search
  const handleSearch = React.useCallback(() => {
    updateSearchParams({ search: search || undefined, page: "1" });
  }, [search, updateSearchParams]);

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

  // Device icon component
  const DeviceIcon = ({ deviceType }: { deviceType: string | null }) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Define columns
  const columns: ColumnDef<AdminAccessLogEntry>[] = [
    {
      accessorKey: "accessedAt",
      header: t("logbook.columns.timestamp"),
      cell: ({ row }) => {
        const date = new Date(row.original.accessedAt);
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {format(date, "MMM d, yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(date, "HH:mm:ss")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "adminEmail",
      header: t("logbook.columns.admin"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.adminName || "-"}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.adminEmail}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "ipAddress",
      header: t("logbook.columns.ipAddress"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">
            {row.original.ipAddress || "-"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "browserName",
      header: t("logbook.columns.browser"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.browserName || "-"}
          </span>
          {row.original.browserVersion && (
            <span className="text-xs text-muted-foreground">
              v{row.original.browserVersion}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "osName",
      header: t("logbook.columns.os"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.osName || "-"}
          </span>
          {row.original.osVersion && (
            <span className="text-xs text-muted-foreground">
              {row.original.osVersion}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "deviceType",
      header: t("logbook.columns.device"),
      cell: ({ row }) => (
        <Badge variant="outline" className="gap-1 capitalize">
          <DeviceIcon deviceType={row.original.deviceType} />
          {row.original.deviceType || "desktop"}
        </Badge>
      ),
    },
    {
      accessorKey: "location",
      header: t("logbook.columns.location"),
      cell: ({ row }) => {
        const { city, country } = row.original;
        if (!city && !country) return "-";
        return (
          <span className="text-sm">
            {[city, country].filter(Boolean).join(", ")}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("logbook.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("logbook.search")}
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM d, yyyy") : t("logbook.startDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">-</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM d, yyyy") : t("logbook.endDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="secondary" onClick={handleDateFilter}>
            {t("logbook.filter")}
          </Button>

          {(startDate || endDate) && (
            <Button variant="ghost" size="icon" onClick={clearDateFilter}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("logbook.showingResults", { count: totalCount })}
      </p>

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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("logbook.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {t("logbook.page", { page, totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("logbook.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("logbook.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
