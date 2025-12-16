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
  Eye,
  Clock,
  CheckCircle2,
  Archive,
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  MoreHorizontal,
  Camera,
  Terminal,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FeedbackDetailDialog } from "./FeedbackDetailDialog";
import type { PlatformFeedback } from "@/actions/platform-admin/get-feedback";

interface FeedbackDataTableProps {
  feedback: PlatformFeedback[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentType: string;
  currentStatus: string;
  locale: string;
}

export function FeedbackDataTable({
  feedback,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentType,
  currentStatus,
  locale,
}: FeedbackDataTableProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [typeFilter, setTypeFilter] = React.useState(currentType);
  const [statusFilter, setStatusFilter] = React.useState(currentStatus);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedFeedback, setSelectedFeedback] =
    React.useState<PlatformFeedback | null>(null);

  // Update URL with search params
  const updateSearchParams = React.useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "ALL") {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      router.push(`/${locale}/platform-admin/feedback?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle search
  const handleSearch = React.useCallback(() => {
    updateSearchParams({ search, page: "1" });
  }, [search, updateSearchParams]);

  // Handle type filter
  const handleTypeChange = React.useCallback(
    (value: string) => {
      setTypeFilter(value);
      updateSearchParams({ type: value, page: "1" });
    },
    [updateSearchParams]
  );

  // Handle status filter
  const handleStatusChange = React.useCallback(
    (value: string) => {
      setStatusFilter(value);
      updateSearchParams({ status: value, page: "1" });
    },
    [updateSearchParams]
  );

  // Handle pagination
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({ page: newPage.toString() });
    },
    [updateSearchParams]
  );

  // Open detail dialog
  const openDetailDialog = (item: PlatformFeedback) => {
    setSelectedFeedback(item);
    setDetailDialogOpen(true);
  };

  // Type badge component
  const TypeBadge = ({ type }: { type: string }) => {
    const typeConfig: Record<
      string,
      { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      bug: { icon: Bug, variant: "destructive" },
      feature: { icon: Lightbulb, variant: "default" },
      general: { icon: MessageCircle, variant: "secondary" },
      question: { icon: HelpCircle, variant: "outline" },
      other: { icon: MoreHorizontal, variant: "outline" },
    };

    const config = typeConfig[type] || typeConfig.other;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`feedback.types.${type}`)}
      </Badge>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<
      string,
      { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { icon: Clock, variant: "outline" },
      reviewed: { icon: Eye, variant: "secondary" },
      resolved: { icon: CheckCircle2, variant: "default" },
      archived: { icon: Archive, variant: "outline" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`feedback.statuses.${status}`)}
      </Badge>
    );
  };

  // Define columns
  const columns: ColumnDef<PlatformFeedback>[] = [
    {
      accessorKey: "feedbackType",
      header: t("feedback.columns.type"),
      cell: ({ row }) => <TypeBadge type={row.original.feedbackType} />,
    },
    {
      accessorKey: "feedback",
      header: t("feedback.columns.content"),
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.original.feedback}>
          {row.original.feedback}
        </div>
      ),
    },
    {
      accessorKey: "userEmail",
      header: t("feedback.columns.user"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {row.original.userName || t("feedback.anonymous")}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.userEmail || "-"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "browser",
      header: t("feedback.columns.browser"),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.browserName || "-"}
          {row.original.browserVersion && (
            <span className="text-muted-foreground ml-1">
              v{row.original.browserVersion.split(".")[0]}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "attachments",
      header: t("feedback.columns.attachments"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.hasScreenshot && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Camera className="h-3 w-3" />
            </Badge>
          )}
          {row.original.hasConsoleLogs && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Terminal className="h-3 w-3" />
              {row.original.consoleLogsCount}
            </Badge>
          )}
          {!row.original.hasScreenshot && !row.original.hasConsoleLogs && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("feedback.columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: t("feedback.columns.createdAt"),
      cell: ({ row }) => (
        <div className="text-sm" suppressHydrationWarning>
          {new Date(row.original.createdAt).toLocaleDateString(locale)}
          <span className="text-muted-foreground ml-1" suppressHydrationWarning>
            {new Date(row.original.createdAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailDialog(row.original)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t("feedback.viewDetails")}
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: feedback,
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
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("feedback.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("feedback.search")}
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("feedback.filterByType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("feedback.allTypes")}</SelectItem>
              <SelectItem value="bug">{t("feedback.types.bug")}</SelectItem>
              <SelectItem value="feature">
                {t("feedback.types.feature")}
              </SelectItem>
              <SelectItem value="general">
                {t("feedback.types.general")}
              </SelectItem>
              <SelectItem value="question">
                {t("feedback.types.question")}
              </SelectItem>
              <SelectItem value="other">{t("feedback.types.other")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("feedback.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("feedback.allStatuses")}</SelectItem>
              <SelectItem value="pending">
                {t("feedback.statuses.pending")}
              </SelectItem>
              <SelectItem value="reviewed">
                {t("feedback.statuses.reviewed")}
              </SelectItem>
              <SelectItem value="resolved">
                {t("feedback.statuses.resolved")}
              </SelectItem>
              <SelectItem value="archived">
                {t("feedback.statuses.archived")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("feedback.showingResults", { count: totalCount })}
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetailDialog(row.original)}
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
                  {t("feedback.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {t("feedback.page", { page, totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("feedback.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("feedback.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        feedback={selectedFeedback}
        locale={locale}
      />
    </div>
  );
}

