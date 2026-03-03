"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import type { User } from "./table-data/schema";

interface EmployeesTableProps {
  data: User[];
}

export function EmployeesTable({ data }: EmployeesTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Filter employees..."
    />
  );
}
