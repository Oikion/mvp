"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations, useFormatter } from "next-intl";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { DealRowActions } from "./DealRowActions";
import { StageCell } from "./cells/StageCell";
import { DealTypeCell } from "./cells/DealTypeCell";
import { TitleCell } from "./cells/TitleCell";
import { AgentCell } from "./cells/AgentCell";
import { DealPriceCell } from "./cells/DealPriceCell";
import type { DealRow } from "../components/DealsList";

export function useDealColumns(
  onRefresh?: () => void,
  users: { id: string; name: string | null }[] = []
): ColumnDef<DealRow>[] {
  const t = useTranslations("deals");
  const commonT = useTranslations("common");
  const format = useFormatter();

  return React.useMemo<ColumnDef<DealRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => <DataTableSelectAllCheckbox table={table} />,
        cell: ({ row, table }) => <DataTableSelectCheckbox row={row} table={table} />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("detail.timeline.created")} />
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
        enableSorting: false,
        enableHiding: false,
      },
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
          const fallback =
            deal.property?.title ||
            deal.property?.property_name ||
            deal.friendlyId;
          return (
            <div className="flex flex-col min-w-0">
              <TitleCell dealId={deal.id} title={deal.title} fallback={fallback} />
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
        cell: ({ row }) => (
          <StageCell dealId={row.original.id} stage={row.original.stage} />
        ),
        enableSorting: true,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "dealType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("create.dealType")} />
        ),
        cell: ({ row }) => (
          <DealTypeCell dealId={row.original.id} dealType={row.original.dealType} />
        ),
        enableSorting: true,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        id: "money",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("list.agreedPrice")} />
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
          return (
            <DealPriceCell
              dealId={deal.id}
              field={isRental ? "monthlyRentAmount" : "agreedPrice"}
              value={isRental ? deal.monthlyRentAmount : (deal.agreedPrice ?? deal.property?.price)}
              currency={deal.commissionCurrency}
            />
          );
        },
        enableSorting: true,
      },
      {
        id: "listingAgent",
        accessorFn: (row) => row.listingAgent?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("create.listingAgent")} />
        ),
        cell: ({ row }) => (
          <AgentCell
            dealId={row.original.id}
            field="listingAgentId"
            agent={row.original.listingAgent}
            users={users}
          />
        ),
        enableSorting: false,
      },
      {
        id: "buyerAgent",
        accessorFn: (row) => row.buyerAgent?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("create.buyerAgent")} />
        ),
        cell: ({ row }) => (
          <AgentCell
            dealId={row.original.id}
            field="buyerAgentId"
            agent={row.original.buyerAgent}
            users={users}
            nullLabel="Unassigned"
          />
        ),
        enableSorting: false,
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
    [t, commonT, format, onRefresh, users]
  );
}
