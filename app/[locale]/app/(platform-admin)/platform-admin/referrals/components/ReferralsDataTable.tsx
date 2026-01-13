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
  MoreHorizontal,
  DollarSign,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Percent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ReferralActionDialog } from "./ReferralActionDialog";
import type { AdminReferralData } from "@/actions/referrals/admin-get-all-referrals";

interface ReferralsDataTableProps {
  referrals: AdminReferralData[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentStatus: string;
  locale: string;
}

export function ReferralsDataTable({
  referrals,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentStatus,
  locale,
}: ReferralsDataTableProps) {
  const t = useTranslations("platformAdmin.referrals");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [status, setStatus] = React.useState(currentStatus);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [selectedReferral, setSelectedReferral] = React.useState<AdminReferralData | null>(null);
  const [actionType, setActionType] = React.useState<"view" | "payout" | "status" | "commission">("view");

  // Update URL with search params
  const updateSearchParams = React.useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      router.push(`/${locale}/app/platform-admin/referrals?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle search
  const handleSearch = React.useCallback(() => {
    updateSearchParams({ search, page: "1" });
  }, [search, updateSearchParams]);

  // Handle status filter
  const handleStatusChange = React.useCallback(
    (value: string) => {
      setStatus(value);
      updateSearchParams({ status: value === "ALL" ? "" : value, page: "1" });
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

  // Open action dialog
  const openActionDialog = (
    referral: AdminReferralData,
    action: "view" | "payout" | "status" | "commission"
  ) => {
    setSelectedReferral(referral);
    setActionType(action);
    setActionDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<
      string,
      { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      CONVERTED: { icon: CheckCircle, variant: "default" },
      PENDING: { icon: Clock, variant: "secondary" },
      CANCELLED: { icon: XCircle, variant: "destructive" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  // Define columns
  const columns: ColumnDef<AdminReferralData>[] = [
    {
      accessorKey: "referrerEmail",
      header: t("columns.referrer"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.referrerName || "-"}</p>
          <p className="text-sm text-muted-foreground">{row.original.referrerEmail}</p>
        </div>
      ),
    },
    {
      accessorKey: "referredUserEmail",
      header: t("columns.referredUser"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.referredUserName || "-"}</p>
          <p className="text-sm text-muted-foreground">{row.original.referredUserEmail}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "commissionRate",
      header: t("columns.commission"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.commissionRate}%</span>
      ),
    },
    {
      accessorKey: "totalEarnings",
      header: t("columns.earnings"),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.totalEarnings)}</span>
      ),
    },
    {
      accessorKey: "totalPaid",
      header: t("columns.paid"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatCurrency(row.original.totalPaid)}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("columns.date"),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(locale),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actionsLabel")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "view")}>
              <Eye className="mr-2 h-4 w-4" />
              {t("actions.viewDetails")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "payout")}>
              <DollarSign className="mr-2 h-4 w-4 text-green-500" />
              {t("actions.addPayout")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "status")}>
              <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
              {t("actions.updateStatus")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "commission")}>
              <Percent className="mr-2 h-4 w-4 text-purple-500" />
              {t("actions.updateCommission")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: referrals,
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
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("search")}
          </Button>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("status.all")}</SelectItem>
            <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
            <SelectItem value="CONVERTED">{t("status.converted")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("showingResults", { count: totalCount })}
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
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {t("page", { page, totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Dialog */}
      <ReferralActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        referral={selectedReferral}
        actionType={actionType}
        locale={locale}
      />
    </div>
  );
}
