"use client";

import { ColumnDef } from "@tanstack/react-table";
import moment from "moment";
import Link from "next/link";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { MandateRowActions } from "./MandateRowActions";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { TitleCell } from "./cells/TitleCell";
import { StatusCell } from "./cells/StatusCell";
import { UrgencyCell } from "./cells/UrgencyCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { TransactionTypeCell } from "./cells/TransactionTypeCell";

function formatBudget(min?: number | string | null, max?: number | string | null): string {
  const minVal = min ? Number(min) : null;
  const maxVal = max ? Number(max) : null;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
    return `\u20AC${n.toLocaleString()}`;
  };

  if (minVal && maxVal) return `${fmt(minVal)} - ${fmt(maxVal)}`;
  if (minVal) return `${fmt(minVal)}+`;
  if (maxVal) return `up to ${fmt(maxVal)}`;
  return "\u2014";
}

export const getColumns = (
  t: (key: string) => string,
  users: { id: string; name: string | null }[] = []
): ColumnDef<any>[] => [
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
      <DataTableColumnHeader column={column} title={t("MandatesTable.created")} />
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground whitespace-nowrap">
        {moment(row.getValue("createdAt")).format("YY/MM/DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.assignedTo")} />
    ),
    cell: ({ row }) => (
      <AssignedUserCell
        mandateId={row.original.id}
        assignedTo={row.original.assigned_to}
        users={users}
      />
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.title")} />
    ),
    cell: ({ row }) => (
      <TitleCell
        mandateId={row.original.id}
        value={row.original.title}
      />
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "transaction_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.transactionType")} />
    ),
    cell: ({ row }) => (
      <TransactionTypeCell
        mandateId={row.original.id}
        transactionType={row.original.transaction_type}
      />
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "budget",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.budget")} />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatBudget(row.original.budget_min, row.original.budget_max)}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.status")} />
    ),
    cell: ({ row }) => (
      <StatusCell
        mandateId={row.original.id}
        status={row.original.status}
      />
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "urgency",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.urgency")} />
    ),
    cell: ({ row }) => (
      <UrgencyCell
        mandateId={row.original.id}
        urgency={row.original.urgency}
      />
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "client",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.client")} />
    ),
    cell: ({ row }) => {
      const clients = row.original.Mandate_Clients ?? [];
      if (clients.length === 0) {
        return (
          <span className="text-muted-foreground/60 italic text-xs">
            {t("MandatesTable.noClient")}
          </span>
        );
      }
      const first = clients[0].Clients;
      return (
        <div className="flex items-center gap-1">
          <Link
            href={`/app/crm/clients/${first.friendlyId}`}
            className="text-sm hover:text-primary transition-colors truncate max-w-[150px] inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {first.client_name}
          </Link>
          {clients.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">
              +{clients.length - 1}
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <MandateRowActions row={row} />,
  },
];
