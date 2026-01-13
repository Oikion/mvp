"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Percent,
  ToggleLeft,
  ToggleRight,
  Users,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AdminReferralCodeData } from "@/actions/referrals/admin-get-all-referrals";

interface ReferralCodesTableProps {
  codes: AdminReferralCodeData[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  locale: string;
}

export function ReferralCodesTable({
  codes,
  totalCount,
  page,
  totalPages,
  currentSearch,
  locale,
}: ReferralCodesTableProps) {
  const t = useTranslations("platformAdmin.referrals");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);

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
      // Keep the tab parameter
      newParams.set("tab", "codes");
      router.push(`/${locale}/app/platform-admin/referrals?${newParams.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Handle search
  const handleSearch = React.useCallback(() => {
    updateSearchParams({ codesSearch: search, codesPage: "1" });
  }, [search, updateSearchParams]);

  // Handle pagination
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({ codesPage: newPage.toString() });
    },
    [updateSearchParams]
  );

  // Copy referral code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("createCode.codeCopied"));
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Define columns
  const columns: ColumnDef<AdminReferralCodeData>[] = [
    {
      accessorKey: "userEmail",
      header: t("codes.columns.user"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.userName || "-"}</p>
          <p className="text-sm text-muted-foreground">{row.original.userEmail}</p>
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: t("codes.columns.code"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {row.original.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCopyCode(row.original.code)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "commissionRate",
      header: t("codes.columns.commission"),
      cell: ({ row }) => (
        <Badge variant="outline" className="gap-1">
          <Percent className="h-3 w-3" />
          {row.original.commissionRate}%
        </Badge>
      ),
    },
    {
      accessorKey: "referralCount",
      header: t("codes.columns.referrals"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.referralCount}</span>
        </div>
      ),
    },
    {
      accessorKey: "totalEarnings",
      header: t("codes.columns.earnings"),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.totalEarnings)}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: t("codes.columns.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? (
            <>
              <ToggleRight className="mr-1 h-3 w-3" />
              {t("codes.active")}
            </>
          ) : (
            <>
              <ToggleLeft className="mr-1 h-3 w-3" />
              {t("codes.inactive")}
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("codes.columns.created"),
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
            <DropdownMenuItem onClick={() => handleCopyCode(row.original.code)}>
              <Copy className="mr-2 h-4 w-4" />
              {t("codes.actions.copyCode")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Percent className="mr-2 h-4 w-4 text-purple-500" />
              {t("codes.actions.editCommission")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: codes,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
              placeholder={t("codes.searchPlaceholder")}
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
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("codes.showingResults", { count: totalCount })}
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
                  {t("codes.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}
    </div>
  );
}
