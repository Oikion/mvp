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
} from "@tanstack/react-table";
import { useTranslations, useFormatter } from "next-intl";
import { Link, useRouter } from "@/navigation";

import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionResponse } from "@/lib/action-response";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "../../crm/contacts/table-components/data-table-pagination";
import { DataTableColumnHeader } from "../../crm/contacts/table-components/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";
import { deleteDeal } from "@/actions/deals";

import { Search, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────
export interface DealRow {
  id: string;
  friendlyId: string;
  title: string | null;
  stage: string;
  dealType: string | null;
  agreedPrice?: number | string | null;
  monthlyRentAmount?: number | string | null;
  createdAt: string | Date;
  property?: {
    id: string;
    title?: string | null;
    property_name?: string | null;
    address_city?: string | null;
    price?: number | string | null;
  } | null;
  listingAgent?: { id: string; name: string | null; avatar: string | null } | null;
  buyerAgent?: { id: string; name: string | null; avatar: string | null } | null;
  dealParties?: Array<{ id: string }>;
  commissionCurrency?: string | null;
}

interface DealsListProps {
  data: DealRow[];
  toolbarRight?: React.ReactNode;
  onRefresh?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────
const initials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
};

// ── Row actions menu ────────────────────────────────────────────────────
function DealRowActions({
  deal,
  onRefresh,
}: Readonly<{
  deal: DealRow;
  onRefresh?: () => void;
}>) {
  const commonT = useTranslations("common");
  const t = useTranslations("deals");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Client-side action-permission checks aren't wired yet (no useHasActionPermission hook).
  // Server actions enforce permissions via `requireAction()`, so we optimistically
  // render the buttons and rely on server rejection for unauthorized attempts.
  // TODO(phase-4): wire to a real client-side action permission check.
  const canUpdate = true;
  const canDelete = true;

  const handleView = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}`);
  }, [router, deal.friendlyId]);

  const handleEdit = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}?edit=true`);
  }, [router, deal.friendlyId]);

  const handleDelete = React.useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = (await deleteDeal(deal.id)) as ActionResponse<{ id: string }>;
      if (res.success) {
        toast.success("deleteSuccess");
        onRefresh?.();
        setConfirmOpen(false);
      } else {
        toast.error("deleteFailed", {
          description: res.error ?? undefined,
          isTranslationKey: false,
        });
      }
    } catch (error) {
      console.error("[DEAL_DELETE_UI]", error);
      toast.error("deleteFailed");
    } finally {
      setIsDeleting(false);
    }
  }, [deal.id, isDeleting, onRefresh, toast]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={commonT("actions")}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{commonT("actions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleView}>
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("view")}
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              {commonT("edit")}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {commonT("delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("detail.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("detail.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Column factory ──────────────────────────────────────────────────────
function useDealColumns(onRefresh?: () => void): ColumnDef<DealRow>[] {
  const t = useTranslations("deals");
  const commonT = useTranslations("common");
  const format = useFormatter();

  return React.useMemo<ColumnDef<DealRow>[]>(
    () => [
      {
        accessorKey: "friendlyId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => (
          <Link
            href={`/app/deals/${row.original.friendlyId}`}
            className="font-mono text-xs text-primary hover:underline focus-visible:underline"
          >
            {row.original.friendlyId}
          </Link>
        ),
        enableSorting: true,
      },
      {
        id: "name",
        accessorFn: (row) =>
          row.property?.title ||
          row.property?.property_name ||
          row.title ||
          row.friendlyId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("create.property")} />
        ),
        cell: ({ row }) => {
          const deal = row.original;
          const name =
            deal.property?.title ||
            deal.property?.property_name ||
            deal.title ||
            deal.friendlyId;
          return (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate max-w-[260px]">{name}</span>
              {deal.property?.address_city && (
                <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                  {deal.property.address_city}
                </span>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "stage",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("detail.pipeline")} />
        ),
        cell: ({ row }) => {
          const stage = row.original.stage;
          return (
            <StatusBadge
              entityType="deal"
              status={stage}
              label={t(`stage.${stage}` as Parameters<typeof t>[0])}
              size="sm"
            />
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "dealType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("create.dealType")} />
        ),
        cell: ({ row }) => {
          const dt = row.original.dealType;
          if (!dt) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <Badge variant="outline" className="text-[10px]">
              {t(`dealType.${dt}` as Parameters<typeof t>[0])}
            </Badge>
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        id: "money",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("list.agreedPrice")}
          />
        ),
        accessorFn: (row) => {
          const isRental = row.dealType === "RENT";
          const value = isRental
            ? row.monthlyRentAmount
            : row.agreedPrice ?? row.property?.price;
          return value != null ? Number(value) : 0;
        },
        cell: ({ row }) => {
          const deal = row.original;
          const isRental = deal.dealType === "RENT";
          const value = isRental
            ? deal.monthlyRentAmount
            : deal.agreedPrice ?? deal.property?.price;
          if (value == null) {
            return <span className="text-muted-foreground text-sm">—</span>;
          }
          const formatted = format.number(Number(value), {
            style: "currency",
            currency: deal.commissionCurrency || "EUR",
            maximumFractionDigits: 0,
          });
          return (
            <span className="text-sm font-medium whitespace-nowrap">
              {formatted}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "listingAgent",
        accessorFn: (row) => row.listingAgent?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("create.listingAgent")}
          />
        ),
        cell: ({ row }) => {
          const a = row.original.listingAgent;
          if (!a?.name) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={a.avatar ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate max-w-[160px]">{a.name}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "buyerAgent",
        accessorFn: (row) => row.buyerAgent?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("create.buyerAgent")}
          />
        ),
        cell: ({ row }) => {
          const a = row.original.buyerAgent;
          if (!a?.name) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={a.avatar ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] bg-success/10 text-success">
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate max-w-[160px]">{a.name}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("detail.timeline.created")}
          />
        ),
        cell: ({ row }) => {
          const d = row.original.createdAt;
          if (!d) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {format.dateTime(new Date(d), { dateStyle: "medium" })}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{commonT("actions")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <DealRowActions deal={row.original} onRefresh={onRefresh} />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, commonT, format, onRefresh]
  );
}

// ── Main DataTable component ────────────────────────────────────────────
export function DealsList({ data, toolbarRight, onRefresh }: Readonly<DealsListProps>) {
  const t = useTranslations("deals");

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = useDealColumns(onRefresh);

  const table = useTableWithPageSize({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, globalFilter },
    enableRowSelection: false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: search + right slot (ViewToggle) */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="deals-search">
            {t("title")}
          </label>
          <Input
            id="deals-search"
            placeholder={`${t("title")}…`}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {toolbarRight && (
          <div className="flex items-center gap-2">{toolbarRight}</div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table aria-label={t("title")}>
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
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("list.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

export default DealsList;
