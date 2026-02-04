"use client";

import moment from "moment";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNowStrict } from "date-fns";

import { statuses } from "../table-data/data";
import { AdminUser } from "../table-data/schema";
import { DataTableRowActions } from "./data-table-row-actions";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";

interface TranslationFn {
  (key: string): string;
}

export const getColumns = (t: TranslationFn): ColumnDef<AdminUser>[] => [
  {
    accessorKey: "created_on",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("dateCreated")} />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {moment(row.getValue("created_on")).format("YYYY/MM/DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "lastLoginAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("lastLogin")} />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatDistanceToNowStrict(
          new Date(row.original.lastLoginAt || new Date()),
          {
            addSuffix: true,
          }
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("name")} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("email")} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("email")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "orgRole",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("role")} />
    ),
    cell: ({ row }) => {
      const role = row.original.orgRole;
      const displayRole = role === "org:admin" ? t("roleAdmin") : t("roleMember");
      return (
        <div className={role === "org:admin" ? "font-semibold text-primary" : ""}>
          {displayRole}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "userStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("status")} />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("userStatus")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex items-center">
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
    accessorKey: "userLanguage",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("language")} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("userLanguage")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];

// Default export for backward compatibility
export const columns: ColumnDef<AdminUser>[] = getColumns((key) => {
  const translations: Record<string, string> = {
    dateCreated: "Date created",
    lastLogin: "Last login",
    name: "Name",
    email: "E-mail",
    role: "Role",
    roleAdmin: "Admin",
    roleMember: "Member",
    status: "Status",
    language: "Language",
  };
  return translations[key] || key;
});
