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
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.created")} />
    },
    cell: ({ row }) => <div>{moment(row.getValue("createdAt")).format("YY/MM/DD-HH:mm")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.assignedTo")} />
    },
    cell: ({ row }) => {
      const t = useTranslations();
      return <div className="w-[150px]">{row.getValue("assigned_to_user")?.name ?? t("MlsPropertiesTable.unassigned")}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "property_name",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.name")} />
    },
    cell: ({ row }) => (
      <Link href={`/mls/properties/${row.original?.id}`}>
        <div className="w-[250px]">{row.getValue("property_name")}</div>
      </Link>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.price")} />
    },
    cell: ({ row }) => <div className="w-[120px]">{row.getValue("price") ?? "-"}</div>,
  },
  {
    accessorKey: "property_type",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.type")} />
    },
    cell: ({ row }) => <div className="w-[120px]">{row.getValue("property_type") ?? "-"}</div>,
  },
  {
    accessorKey: "property_status",
    header: ({ column }) => {
      const t = useTranslations();
      return <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.status")} />
    },
    cell: ({ row }) => {
      const s = statuses.find((x) => x.value === row.getValue("property_status"));
      if (!s) return null;
      const Icon = s.icon as any;
      return (
        <div className="flex w-[120px] items-center">
          {Icon ? <Icon className="mr-2 h-4 w-4 text-muted-foreground" /> : null}
          <span>{s.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  { id: "actions", cell: ({ row }) => <DataTableRowActions row={row} /> },
];


