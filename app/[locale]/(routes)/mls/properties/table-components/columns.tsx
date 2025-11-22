"use client";

import { ColumnDef } from "@tanstack/react-table";
import moment from "moment";
import Link from "next/link";
import { DataTableColumnHeader } from "./data-table-column-header";
import { useTranslations } from "next-intl";
import { DataTableRowActions } from "./data-table-row-actions";
import { statuses } from "../table-data/data";

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.created")} />
    },
    cell: ({ row }) => <div>{moment(row.getValue("createdAt")).format("YY/MM/DD-HH:mm")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.assignedTo")} />
    },
    cell: ({ row }) => {
      const t = useTranslations("mls");
      const assignedUser = row.getValue("assigned_to_user") as { name?: string } | null | undefined;
      return (
        <div className="whitespace-nowrap">
          {assignedUser?.name ?? t("MlsPropertiesTable.unassigned")}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "property_name",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.name")} />
    },
    cell: ({ row }) => (
      <Link href={`/mls/properties/${row.original?.id}`}>
        <div className="whitespace-nowrap">{row.getValue("property_name")}</div>
      </Link>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.price")} />
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("price") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "property_type",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.type")} />
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("property_type") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "property_status",
    header: ({ column }) => {
      const t = useTranslations("mls");
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.status")} />
    },
    cell: ({ row }) => {
      const s = statuses.find((x) => x.value === row.getValue("property_status"));
      if (!s) return null;
      const Icon = s.icon as any;
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
          <span>{s.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  { id: "actions", cell: ({ row }) => <DataTableRowActions row={row} /> },
];


