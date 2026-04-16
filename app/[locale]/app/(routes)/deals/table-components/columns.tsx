"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import type { DealRow } from "../components/DealsList";

function formatPrice(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function useDealColumns(
  _onRefresh?: () => void,
  _users?: { id: string; name: string | null }[]
): ColumnDef<DealRow>[] {
  return [
    {
      accessorKey: "friendlyId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.friendlyId}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <span className="font-medium truncate max-w-[200px] block">
          {row.original.title || "—"}
        </span>
      ),
    },
    {
      accessorKey: "stage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stage" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.stage}
        </Badge>
      ),
    },
    {
      accessorKey: "dealType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.dealType || "—"}</span>
      ),
    },
    {
      accessorKey: "agreedPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatPrice(row.original.agreedPrice)}
        </span>
      ),
    },
    {
      accessorKey: "property",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Property" />
      ),
      cell: ({ row }) => {
        const prop = row.original.property;
        if (!prop) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm truncate max-w-[160px] block">
            {prop.title || prop.property_name || "—"}
          </span>
        );
      },
      enableSorting: false,
    },
  ];
}
