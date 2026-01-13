"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ModuleColumn = {
  id: string;
  name: string;
  enabled: boolean;
};

interface TranslationFn {
  (key: string): string;
}

export const getModuleColumns = (t: TranslationFn): ColumnDef<ModuleColumn>[] => [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: t("name"),
  },
  {
    accessorKey: "enabled",
    header: t("status"),
  },
  {
    id: "actions",
    header: t("actions"),
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];

// Default export for backward compatibility
export const columns: ColumnDef<ModuleColumn>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "enabled",
    header: "Status",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
