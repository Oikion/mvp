"use client";

import { ColumnDef } from "@tanstack/react-table";
import moment from "moment";
import { useTranslations } from "next-intl";

import { Opportunity } from "../table-data/schema";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ContactRowActions } from "./ContactRowActions";

export const columns: ColumnDef<Opportunity>[] = [
  {
    accessorKey: "created_on",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.dateCreated") || "Date created"} />;
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {moment(row.getValue("created_on")).format("YY-MM-DD")}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.assignedTo") || "Assigned to"} />;
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {(row.getValue("assigned_to_user") as { name?: string } | null)?.name ?? "Unassigned"}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "assigned_account",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.assignedAccount") || "Assigned account"} />;
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {(row.original as unknown as { assigned_accounts?: { name?: string } }).assigned_accounts?.name ?? "Unassigned"}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.firstName") || "Name"} />;
    },
    cell: ({ row }) => <div>{row.getValue("first_name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.lastName") || "Last name"} />;
    },
    cell: ({ row }) => <div>{row.getValue("last_name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.email") || "E-mail"} />;
    },
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "mobile_phone",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.mobile") || "Mobile"} />;
    },
    cell: ({ row }) => <div>{row.getValue("mobile_phone")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      const t = useTranslations("crm");
      return <DataTableColumnHeader column={column} title={t("ContactsTable.status") || "Status"} />;
    },
    cell: ({ row }) => {
      const t = useTranslations("common");
      return (
        <div>{row.original.status ? t("statusLabels.client.ACTIVE") || "Active" : t("statusLabels.client.INACTIVE") || "Inactive"}</div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <ContactRowActions row={row} />,
  },
];
