"use client";

import { ColumnDef } from "@tanstack/react-table";
import moment from "moment";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { DocumentRowActions } from "./DocumentRowActions";
import { Eye, Globe, Lock, FileText } from "lucide-react";

const typeColors: Record<string, string> = {
  INVOICE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  RECEIPT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CONTRACT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  OFFER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export const getColumns = (
  t: (key: string) => string
): ColumnDef<any>[] => [
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
      <DataTableColumnHeader column={column} title={t("DocumentsTable.created")} />
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground whitespace-nowrap">
        {moment(row.getValue("createdAt")).format("YY/MM/DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "document_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("DocumentsTable.name")} />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 max-w-[250px]">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate" title={row.getValue("document_name")}>
          {row.getValue("document_name")}
        </span>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "document_system_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("DocumentsTable.type")} />
    ),
    cell: ({ row }) => {
      const type = row.getValue("document_system_type") as string;
      if (!type) return null;
      return (
        <Badge variant="outline" className={`text-xs ${typeColors[type] || typeColors.OTHER}`}>
          {t(`DocumentSystemType.${type}`)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("DocumentsTable.description")} />
    ),
    cell: ({ row }) => {
      const desc = row.getValue("description") as string;
      if (!desc) return <span className="text-muted-foreground/60 italic text-xs">—</span>;
      return (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block" title={desc}>
          {desc}
        </span>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "sharing",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("DocumentsTable.sharing")} />
    ),
    cell: ({ row }) => {
      const linkEnabled = row.original.linkEnabled;
      const passwordProtected = row.original.passwordProtected;
      if (!linkEnabled) {
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Lock className="h-3 w-3" />
            {t("DocumentsTable.private")}
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-300">
          <Globe className="h-3 w-3" />
          {passwordProtected ? t("DocumentsTable.sharedProtected") : t("DocumentsTable.shared")}
        </Badge>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "viewsCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("DocumentsTable.views")} />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span className="text-sm">{row.getValue("viewsCount") ?? 0}</span>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DocumentRowActions row={row} />,
  },
];
