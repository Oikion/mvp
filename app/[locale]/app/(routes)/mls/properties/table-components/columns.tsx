"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { PropertyRowActions } from "./PropertyRowActions";
import { StatusCell } from "./cells/StatusCell";
import { VisibilityCell } from "./cells/VisibilityCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { PriceCell } from "./cells/PriceCell";
import { NameCell } from "./cells/NameCell";
import { TypeCell } from "./cells/TypeCell";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";

export interface PropertyRow {
  id: string;
  friendlyId: string;
  createdAt: Date;
  property_name?: string;
  price?: number | string | null;
  property_type?: string | null;
  property_status?: string | null;
  visibility?: string | null;
  assigned_to?: string | null;
  assigned_to_user?: { name: string | null } | null;
}

export function usePropertyColumns(
  users: { id: string; name: string | null }[] = []
): ColumnDef<PropertyRow>[] {
  const t = useTranslations("mls");
  const commonT = useTranslations("common");

  return React.useMemo<ColumnDef<PropertyRow>[]>(
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
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.created")} />
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
        accessorKey: "property_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.name")} />
        ),
        cell: ({ row }) => (
          <NameCell
            propertyId={row.original.id}
            value={row.original.property_name ?? ""}
          />
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={`${t("MlsPropertiesTable.price")} €`} />
        ),
        cell: ({ row }) => (
          <PriceCell
            propertyId={row.original.id}
            price={row.getValue("price") as number | null | undefined}
          />
        ),
      },
      {
        accessorKey: "property_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.type")} />
        ),
        cell: ({ row }) => (
          <TypeCell
            propertyId={row.original.id}
            value={row.original.property_type}
          />
        ),
      },
      {
        accessorKey: "property_status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.status")} />
        ),
        cell: ({ row }) => (
          <StatusCell
            propertyId={row.original.id}
            status={row.original.property_status || row.getValue("property_status")}
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "visibility",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.visibility")} />
        ),
        cell: ({ row }) => (
          <VisibilityCell
            propertyId={row.original.id}
            visibility={row.original.visibility || row.getValue("visibility")}
          />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "assigned_to_user",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("MlsPropertiesTable.assignedTo")} />
        ),
        cell: ({ row }) => (
          <AssignedUserCell
            propertyId={row.original.id}
            assignedTo={row.original.assigned_to ?? null}
            users={users}
          />
        ),
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{commonT("actions")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <PropertyRowActions row={row} />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, commonT, users]
  );
}
