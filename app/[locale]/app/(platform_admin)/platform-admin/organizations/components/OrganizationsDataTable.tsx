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
  Building2,
  Users,
  Calendar,
  MoreHorizontal,
  AlertTriangle,
  Ban,
  Trash2,
  TrendingUp,
  Loader2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrganizationActionDialog } from "./OrganizationActionDialog";
import { toast } from "sonner";
import type { PlatformOrganization } from "@/actions/platform-admin/get-organizations";

interface OrganizationsDataTableProps {
  organizations: PlatformOrganization[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  locale: string;
}

export function OrganizationsDataTable({
  organizations,
  totalCount,
  page,
  totalPages,
  currentSearch,
  locale,
}: OrganizationsDataTableProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = React.useState(currentSearch);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [selectedOrg, setSelectedOrg] = React.useState<PlatformOrganization | null>(null);
  const [actionType, setActionType] = React.useState<"warnAll" | "suspendAll" | "deleteOrg">("warnAll");
  
  // Market Intel access state
  const [marketIntelAccess, setMarketIntelAccess] = React.useState<Record<string, boolean>>({});
  const [loadingMarketIntel, setLoadingMarketIntel] = React.useState<Record<string, boolean>>({});

  // Load Market Intel access status on mount
  React.useEffect(() => {
    const loadMarketIntelStatus = async () => {
      try {
        const res = await fetch("/api/platform-admin/features?feature=market_intel");
        if (res.ok) {
          const data = await res.json();
          const accessMap: Record<string, boolean> = {};
          for (const feature of data.features || []) {
            accessMap[feature.organizationId] = feature.isEnabled;
          }
          setMarketIntelAccess(accessMap);
        }
      } catch (error) {
        console.error("Failed to load Market Intel access:", error);
      }
    };
    loadMarketIntelStatus();
  }, []);

  // Toggle Market Intel access
  const toggleMarketIntelAccess = async (orgId: string, currentValue: boolean) => {
    setLoadingMarketIntel(prev => ({ ...prev, [orgId]: true }));
    try {
      const res = await fetch("/api/platform-admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          feature: "market_intel",
          isEnabled: !currentValue
        })
      });

      if (res.ok) {
        setMarketIntelAccess(prev => ({ ...prev, [orgId]: !currentValue }));
        toast.success(!currentValue ? "Market Intel access granted" : "Market Intel access revoked");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update access");
      }
    } catch (error) {
      console.error("Failed to toggle Market Intel access:", error);
      toast.error("Failed to update access");
    } finally {
      setLoadingMarketIntel(prev => ({ ...prev, [orgId]: false }));
    }
  };

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
      router.push(`/${locale}/app/platform-admin/organizations?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle search
  const handleSearch = React.useCallback(() => {
    updateSearchParams({ search, page: "1" });
  }, [search, updateSearchParams]);

  // Handle pagination
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({ page: newPage.toString() });
    },
    [updateSearchParams]
  );

  // Open action dialog
  const openActionDialog = (org: PlatformOrganization, action: "warnAll" | "suspendAll" | "deleteOrg") => {
    setSelectedOrg(org);
    setActionType(action);
    setActionDialogOpen(true);
  };

  // Define columns
  const columns: ColumnDef<PlatformOrganization>[] = [
    {
      accessorKey: "name",
      header: t("organizations.columns.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.imageUrl || undefined} alt={row.original.name} />
            <AvatarFallback>
              <Building2 className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.slug && (
              <p className="text-xs text-muted-foreground">@{row.original.slug}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "memberCount",
      header: t("organizations.columns.members"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.memberCount}</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("organizations.columns.createdAt"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(row.original.createdAt).toLocaleDateString(locale)}</span>
        </div>
      ),
    },
    {
      accessorKey: "id",
      header: t("organizations.columns.id"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id.slice(0, 16)}...
        </span>
      ),
    },
    {
      id: "marketIntel",
      header: () => (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span>M.I.</span>
        </div>
      ),
      cell: ({ row }) => {
        const orgId = row.original.id;
        const hasAccess = marketIntelAccess[orgId] ?? false;
        const isLoading = loadingMarketIntel[orgId] ?? false;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={hasAccess}
                      onCheckedChange={() => toggleMarketIntelAccess(orgId, hasAccess)}
                      className="data-[state=checked]:bg-cyan-500"
                    />
                  )}
                  {hasAccess && (
                    <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700">
                      Active
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasAccess ? "Revoke Market Intelligence access" : "Grant Market Intelligence access"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("organizations.openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("organizations.actionsLabel")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "warnAll")}>
              <AlertTriangle className="mr-2 h-4 w-4 text-warning" />
              {t("organizations.actions.warnAll")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openActionDialog(row.original, "suspendAll")}>
              <Ban className="mr-2 h-4 w-4 text-warning" />
              {t("organizations.actions.suspendAll")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => openActionDialog(row.original, "deleteOrg")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("organizations.actions.deleteOrg")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: organizations,
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("organizations.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("organizations.search")}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("organizations.showingResults", { count: totalCount })}
      </p>

      {/* Info card */}
      <div className="rounded-md border border-muted bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>{t("organizations.privacyNote.title")}</strong>{" "}
          {t("organizations.privacyNote.description")}
        </p>
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
                  {t("organizations.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {t("organizations.page", { page, totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("organizations.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t("organizations.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Dialog */}
      <OrganizationActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        organization={selectedOrg}
        actionType={actionType}
        locale={locale}
      />
    </div>
  );
}






