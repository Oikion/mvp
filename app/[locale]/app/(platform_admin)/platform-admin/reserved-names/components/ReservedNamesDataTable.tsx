"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
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
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReservedNameActionDialog } from "./ReservedNameActionDialog";
import type { ReservedNameItem } from "@/actions/platform-admin/reserved-names";
import type { ReservedNameStatus, ReservedNameType } from "@prisma/client";

interface ReservedNamesDataTableProps {
  items: ReservedNameItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentType: string;
  currentStatus: string;
  locale: string;
}

type ReservedDialogMode = "create" | "edit" | "delete";

export function ReservedNamesDataTable({
  items,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentType,
  currentStatus,
  locale,
}: ReservedNamesDataTableProps) {
  const t = useTranslations("platformAdmin.reservedNames");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [typeFilter, setTypeFilter] = React.useState(currentType || "ALL");
  const [statusFilter, setStatusFilter] = React.useState(currentStatus || "ALL");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<ReservedDialogMode>("create");
  const [selectedItem, setSelectedItem] = React.useState<ReservedNameItem | null>(null);

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
      router.push(`/${locale}/app/platform-admin/reserved-names?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  const handleSearch = React.useCallback(() => {
    updateSearchParams({ search, page: "1" });
  }, [search, updateSearchParams]);

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({ page: newPage.toString() });
    },
    [updateSearchParams]
  );

  const handleFilterChange = React.useCallback(
    (nextType: string, nextStatus: string) => {
      updateSearchParams({
        type: nextType,
        status: nextStatus,
        page: "1",
      });
    },
    [updateSearchParams]
  );

  const openDialog = (mode: ReservedDialogMode, item?: ReservedNameItem) => {
    setDialogMode(mode);
    setSelectedItem(item ?? null);
    setDialogOpen(true);
  };

  const columns: ColumnDef<ReservedNameItem>[] = [
    {
      accessorKey: "value",
      header: t("columns.value"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.value}</p>
          <p className="text-xs text-muted-foreground">{row.original.normalizedValue}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("columns.type"),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {t(`types.${row.original.type.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
          {t(`status.${row.original.status.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: t("columns.updatedAt"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format.dateTime(new Date(row.original.updatedAt), { dateStyle: "medium" })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("actions.openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actions.label")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openDialog("edit", row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDialog("delete", row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: items,
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
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("search")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              handleFilterChange(value, statusFilter);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
              {(["USERNAME", "ORG_NAME", "ORG_SLUG"] as ReservedNameType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              handleFilterChange(typeFilter, value);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allStatus")}</SelectItem>
              {(["ACTIVE", "INACTIVE"] as ReservedNameStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog("create")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.new")}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("showingResults", { count: totalCount })}
      </p>

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
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("next")}
          </Button>
        </div>
      </div>

      <ReservedNameActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        item={selectedItem}
      />
    </div>
  );
}
