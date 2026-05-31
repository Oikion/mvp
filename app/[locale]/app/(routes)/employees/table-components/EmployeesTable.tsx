"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import type { User } from "./table-data/schema";

interface EmployeesTableProps {
  data: User[];
}

export function EmployeesTable({ data }: EmployeesTableProps) {
  const t = useTranslations("network");
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder={t("employees.searchPlaceholder")}
    />
  );
}
