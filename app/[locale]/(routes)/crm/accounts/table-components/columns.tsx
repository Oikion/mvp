"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { statuses } from "../table-data/data";
import { Account } from "../table-data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import moment from "moment";
import Link from "next/link";

export const columns: ColumnDef<Account>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      const t = useTranslations();
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
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.assignedTo")} />
    },

    cell: ({ row }) => (
      <div className="w-[150px]">
        {
          //@ts-ignore
          //TODO: fix this
          row.getValue("assigned_to_user")?.name ?? t("CrmAccountsTable.unassigned")
        }
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.name")} />
    },

    cell: ({ row }) => (
      <Link href={`/crm/clients/${row.original?.id}`}>
        <div className="w-[250px]">
          {
            //@ts-ignore
            //TODO: fix this
            row.getValue("name")
          }
        </div>
      </Link>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.email")} />
    },

    cell: ({ row }) => <div className="w-[150px]">{row.getValue("email")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "contacts",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.accountContact")} />
    },

    cell: ({ row }) => (
      <div className="w-[150px]">
        {row.original.contacts?.map(
          (contact: any) => contact.first_name + " " + contact.last_name
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("CrmAccountsTable.status")} />
    },
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
