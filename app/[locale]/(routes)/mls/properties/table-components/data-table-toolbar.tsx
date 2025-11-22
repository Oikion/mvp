"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { statuses } from "../table-data/data";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useTranslations } from "next-intl";

export function DataTableToolbar<TData>({ table }: { table: Table<TData> }) {
  const t = useTranslations("mls");
  const commonT = useTranslations("common");
  const isFiltered = table.getState().columnFilters.length > 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={t("MlsPropertiesTable.filterPlaceholder")}
          value={(table.getColumn("property_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("property_name")?.setFilterValue(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("property_status") && (
          <DataTableFacetedFilter column={table.getColumn("property_status")} title={t("MlsPropertiesTable.status")} options={statuses} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            {commonT("reset")}
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}


