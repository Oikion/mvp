"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import moment from "moment";
import Link from "next/link";

import { Account } from "../table-data/schema";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ClientRowActions } from "./ClientRowActions";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { StatusCell } from "./cells/StatusCell";

export const getColumns = (users: { id: string; name: string | null }[] = []): ColumnDef<Account>[] => [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.created")} />
    },
    cell: ({ row }) => (
      <div className="">
        {moment(row.getValue("createdAt")).format("YY/MM/DD-HH:mm")}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.assignedTo")} />
    },
    cell: ({ row }) => {
      return (
        <AssignedUserCell
          clientId={row.original.id}
          assignedTo={(row.original as unknown as { assigned_to: string | null }).assigned_to}
          users={users}
        />
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.name")} />
    },
    cell: ({ row }) => (
      <Link href={`/crm/clients/${row.original.id}`}>
        <div className="whitespace-nowrap">
          {row.getValue("name") as string}
        </div>
      </Link>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.email")} />
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("email")}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "contacts",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.accountContact")} />
    },
    cell: ({ row }) => (
      <div>
        {row.original.contacts?.map(
          (contact) => contact.first_name + " " + contact.last_name
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.status")} />
    },
    cell: ({ row }) => {
      return (
        <StatusCell
          clientId={row.original.id}
          status={(row.original as unknown as { client_status?: string }).client_status || (row.getValue("status") as string)}
        />
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ClientRowActions row={row} />,
  },
];

export const columns = getColumns([]);
