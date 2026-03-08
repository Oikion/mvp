"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { DataTableToolbar as SharedDataTableToolbar } from "@/components/ui/data-table/data-table-toolbar";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  rightContent?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  rightContent,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations("documents");

  return (
    <SharedDataTableToolbar
      table={table}
      searchKey="document_name"
      searchPlaceholder={t("DocumentsTable.filterPlaceholder")}
      rightContent={rightContent}
    />
  );
}
