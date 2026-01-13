"use client";

import { ColumnDef } from "@tanstack/react-table";
import moment from "moment";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { useTranslations } from "next-intl";
import { PropertyRowActions } from "./PropertyRowActions";
import { StatusCell } from "./cells/StatusCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { PriceCell } from "./cells/PriceCell";

export const getColumns = (users: { id: string; name: string | null }[] = []): ColumnDef<{
  id: string;
  createdAt: Date;
  property_name?: string;
  price?: number | null;
  property_type?: string | null;
  property_status?: string | null;
  assigned_to?: string | null;
  assigned_to_user?: { name: string | null } | null;
}>[] => [
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
      return (
        <AssignedUserCell
          propertyId={row.original.id}
          assignedTo={row.original.assigned_to ?? null}
          users={users}
        />
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
      <Link href={`/app/mls/properties/${row.original.id}`}>
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
      return <DataTableColumnHeader column={column} title={`${t("MlsPropertiesTable.price")} €`} />
    },
    cell: ({ row }) => {
      return (
        <PriceCell
          propertyId={row.original.id}
          price={row.getValue("price") as number | null | undefined}
        />
      );
    },
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
      return (
        <StatusCell
          propertyId={row.original.id}
          status={row.original.property_status || row.getValue("property_status")}
        />
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  { id: "actions", cell: ({ row }) => <PropertyRowActions row={row} /> },
];

export const columns = getColumns([]);


