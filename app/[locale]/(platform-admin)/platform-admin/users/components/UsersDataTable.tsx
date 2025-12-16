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
  AlertTriangle,
  Ban,
  UserCheck,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
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
import { UserActionDialog } from "./UserActionDialog";
import type { PlatformUser } from "@/actions/platform-admin/get-users";

interface UsersDataTableProps {
  users: PlatformUser[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentStatus: string;
  locale: string;
}

export function UsersDataTable({
  users,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentStatus,
  locale,
}: UsersDataTableProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = React.useState(currentSearch);
  const [status, setStatus] = React.useState(currentStatus);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<PlatformUser | null>(null);
  const [actionType, setActionType] = React.useState<"warn" | "suspend" | "unsuspend" | "delete">("warn");

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
      router.push(`/${locale}/platform-admin/users?${newParams.toString()}`);
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
  const openActionDialog = (user: PlatformUser, action: "warn" | "suspend" | "unsuspend" | "delete") => {
    setSelectedUser(user);
    setActionType(action);
    setActionDialogOpen(true);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ACTIVE: { icon: CheckCircle, variant: "default" },
      PENDING: { icon: Clock, variant: "secondary" },
      INACTIVE: { icon: XCircle, variant: "destructive" },
    };
    
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Define columns
  const columns: ColumnDef<PlatformUser>[] = [
    {
      accessorKey: "email",
      header: t("users.columns.email"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{row.original.email}</span>
          {row.original.isAdmin && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              {t("users.admin")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t("users.columns.name"),
      cell: ({ row }) => row.original.name || "-",
    },
    {
      accessorKey: "username",
      header: t("users.columns.username"),
      cell: ({ row }) => row.original.username ? `@${row.original.username}` : "-",
    },
    {
      accessorKey: "status",
      header: t("users.columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "organizationCount",
      header: t("users.columns.organizations"),
      cell: ({ row }) => row.original.organizationCount,
    },
    {
      accessorKey: "createdAt",
      header: t("users.columns.createdAt"),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(locale),
    },
    {
      accessorKey: "lastLoginAt",
      header: t("users.columns.lastLogin"),
      cell: ({ row }) => 
        row.original.lastLoginAt 
          ? new Date(row.original.lastLoginAt).toLocaleDateString(locale)
          : t("users.never"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("users.openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("users.actionsLabel")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "warn")}>
              <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
              {t("users.actions.warn")}
            </DropdownMenuItem>
            {row.original.status === "ACTIVE" ? (
              <DropdownMenuItem onClick={() => openActionDialog(row.original, "suspend")}>
                <Ban className="mr-2 h-4 w-4 text-orange-500" />
                {t("users.actions.suspend")}
              </DropdownMenuItem>
            ) : row.original.status === "INACTIVE" ? (
              <DropdownMenuItem onClick={() => openActionDialog(row.original, "unsuspend")}>
                <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                {t("users.actions.unsuspend")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => openActionDialog(row.original, "delete")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("users.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: users,
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
              placeholder={t("users.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("users.search")}
          </Button>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("users.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("users.status.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("users.status.active")}</SelectItem>
            <SelectItem value="PENDING">{t("users.status.pending")}</SelectItem>
            <SelectItem value="INACTIVE">{t("users.status.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("users.showingResults", { count: totalCount })}
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
                  {t("users.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {t("users.page", { page, totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("users.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("users.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Dialog */}
      <UserActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        user={selectedUser}
        actionType={actionType}
        locale={locale}
      />
    </div>
  );
}


