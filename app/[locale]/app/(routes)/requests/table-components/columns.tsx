"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { RequestRowActions } from "./RequestRowActions";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { TitleCell } from "./cells/TitleCell";
import { StatusCell } from "./cells/StatusCell";
import { UrgencyCell } from "./cells/UrgencyCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { TransactionTypeCell } from "./cells/TransactionTypeCell";
import { BudgetCell } from "./cells/BudgetCell";

export interface RequestRow {
  id: string;
  friendlyId?: string | null;
  createdAt: Date | string;
  title?: string | null;
  status?: string | null;
  urgency?: string | null;
  requestType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  assignedAgentId?: string | null;
  assignedAgent?: { name: string | null } | null;
  requestContacts?: { contact: { friendlyId: string; displayName?: string | null; firstName?: string | null; lastName?: string | null } }[];
}

export function useRequestColumns(
  users: { id: string; name: string | null }[] = []
): ColumnDef<RequestRow>[] {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");

  return React.useMemo<ColumnDef<RequestRow>[]>(
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
          <DataTableColumnHeader column={column} title={t("table.created" as any)} />
        ),
        cell: ({ row }) => {
          const d = row.getValue("createdAt") as string | Date | undefined;
          if (!d) return <span className="text-muted-foreground text-sm">—</span>;
          const label = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(d));
          return <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>;
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
            {row.original.friendlyId ?? "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.title" as any)} />
        ),
        cell: ({ row }) => (
          <TitleCell
            requestId={row.original.id}
            value={row.original.title}
          />
        ),
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: "requestType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.requestType" as any)} />
        ),
        cell: ({ row }) => (
          <TransactionTypeCell
            requestId={row.original.id}
            requestType={row.original.requestType}
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: "budget",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.budget" as any)} />
        ),
        cell: ({ row }) => (
          <BudgetCell
            requestId={row.original.id}
            budgetMin={row.original.budgetMin}
            budgetMax={row.original.budgetMax}
          />
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status" as any)} />
        ),
        cell: ({ row }) => (
          <StatusCell
            requestId={row.original.id}
            status={row.original.status}
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "urgency",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.urgency" as any)} />
        ),
        cell: ({ row }) => (
          <UrgencyCell
            requestId={row.original.id}
            urgency={row.original.urgency}
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: "contact",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.contact" as any)} />
        ),
        cell: ({ row }) => {
          const contacts = row.original.requestContacts ?? [];
          if (contacts.length === 0) {
            return (
              <span className="text-muted-foreground/60 italic text-xs">
                {t("table.noContact" as any)}
              </span>
            );
          }
          const first = contacts[0].contact;
          const displayName = first.displayName ?? ([first.firstName, first.lastName].filter(Boolean).join(" ") || "—");
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/app/crm/contacts/${first.friendlyId}`}
                className="text-sm hover:text-primary transition-colors truncate max-w-[150px] inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
              {contacts.length > 1 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{contacts.length - 1}
                </Badge>
              )}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "assignedAgent",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.assignedTo" as any)} />
        ),
        cell: ({ row }) => (
          <AssignedUserCell
            requestId={row.original.id}
            assignedAgentId={row.original.assignedAgentId}
            users={users}
          />
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <RequestRowActions row={row} />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, users]
  );
}
