"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import moment from "moment";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

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
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
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
        mandateFriendlyId={row.original.friendlyId}
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
      const client = row.original.client;
      if (!client?.client_name) {
        return (
          <span className="text-muted-foreground/60 italic text-xs">
            {t("MandatesTable.noClient")}
          </span>
        );
      }
      return (
        <Link
          href={`/app/crm/clients/${client.friendlyId}`}
          className="text-sm hover:text-primary transition-colors truncate max-w-[150px] inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {client.client_name}
        </Link>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const mandate = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/app/mandates/${mandate.friendlyId}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t("MandateView.view")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/mandates/${mandate.friendlyId}?edit=true`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                {t("MandateView.edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t("MandateView.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
