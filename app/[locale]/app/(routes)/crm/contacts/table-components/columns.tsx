// @ts-nocheck
"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { ContactRowActions } from "./ContactRowActions";
import { ClientRowActions } from "./ClientRowActions";
import { StatusCell } from "./cells/StatusCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { NameCell } from "./cells/NameCell";
import { EmailCell } from "./cells/EmailCell";
import { PhoneCell } from "./cells/PhoneCell";
import { StatusBadge } from "@/components/ui/status-badge";

export interface ContactRow {
  id: string;
  friendlyId: string | null;
  displayName: string;
  isCompany?: boolean;
  email?: string | null;
  primaryPhone?: string | null;
  status: string;
  category?: string[];
  source?: string | null;
  assignedAgentId?: string | null;
  assignedAgent?: { id?: string; name: string | null } | null;
  createdAt: string | Date;
}

export function useContactColumns(
  users: { id: string; name: string | null }[] = []
): ColumnDef<ContactRow>[] {
  const t = useTranslations("crm");
  const commonT = useTranslations("common");

  return React.useMemo<ColumnDef<ContactRow>[]>(
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
          <DataTableColumnHeader column={column} title={t("contacts.table.created")} />
        ),
        cell: ({ row }) => {
          const d = row.getValue("createdAt") as string | Date | undefined;
          if (!d) return <span className="text-muted-foreground text-sm">—</span>;
          const label = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(d));
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
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
            {row.original.friendlyId ?? "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.name")} />
        ),
        cell: ({ row }) => (
          <NameCell
            contactId={row.original.id}
            displayName={row.original.displayName}
            isCompany={row.original.isCompany}
          />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.email")} />
        ),
        cell: ({ row }) => (
          <EmailCell
            contactId={row.original.id}
            email={row.original.email}
          />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryPhone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.phone")} />
        ),
        cell: ({ row }) => (
          <PhoneCell
            contactId={row.original.id}
            primaryPhone={row.original.primaryPhone}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.status")} />
        ),
        cell: ({ row }) => (
          <StatusCell
            contactId={row.original.id}
            status={row.original.status}
          />
        ),
        enableSorting: true,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.categories")} />
        ),
        cell: ({ row }) => {
          const categories = (row.getValue("category") as string[]) || [];
          if (categories.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 2).map((cat) => (
                <StatusBadge
                  key={cat}
                  entityType="contact_category"
                  status={cat}
                  showIcon={false}
                  size="sm"
                />
              ))}
              {categories.length > 2 && (
                <Badge variant="gray" size="sm">
                  +{categories.length - 2}
                </Badge>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "assignedAgent",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("contacts.table.assignedTo")} />
        ),
        cell: ({ row }) => (
          <AssignedUserCell
            contactId={row.original.id}
            assignedAgentId={row.original.assignedAgentId ?? null}
            users={users}
          />
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{commonT("actions")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <ContactRowActions row={row} />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, commonT, users]
  );
}

// ---------------------------------------------------------------------------
// Legacy-compatible columns for ClientsPageView (uses getClients() shape with
// aliased fields: name, email, phone, assigned_to, contacts[])
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useClientColumns(users: { id: string; name: string | null }[] = []): ColumnDef<any>[] {
  const t = useTranslations("crm");

  return React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.created")} />
        ),
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {moment(row.getValue("createdAt")).format("YY/MM/DD")}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "assigned_to_user",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.assignedTo")} />
        ),
        cell: ({ row }) => (
          <AssignedUserCell
            clientId={row.original.id}
            assignedTo={(row.original as { assigned_to?: string | null }).assigned_to ?? null}
            users={users}
          />
        ),
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.name")} />
        ),
        cell: ({ row }) => (
          <NameCell clientId={row.original.id} value={row.original.name ?? ""} />
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.email")} />
        ),
        cell: ({ row }) => (
          <EmailCell clientId={row.original.id} value={row.original.email} />
        ),
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.phone")} />
        ),
        cell: ({ row }) => (
          <PhoneCell clientId={row.original.id} value={row.original.phone} />
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("CrmAccountsTable.status")} />
        ),
        cell: ({ row }) => (
          <StatusCell
            clientId={row.original.id}
            status={
              (row.original as { client_status?: string }).client_status ||
              (row.getValue("status") as string)
            }
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        cell: ({ row }) => <ClientRowActions row={row} />,
      },
    ],
    [t, users]
  );
}
