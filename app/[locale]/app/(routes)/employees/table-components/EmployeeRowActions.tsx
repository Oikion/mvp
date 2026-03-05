"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";

interface EmployeeRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

/**
 * Employee-specific row actions using the unified DataTableRowActions component.
 * Provides: View only (employees are managed through admin panel)
 */
export function EmployeeRowActions({ row }: EmployeeRowActionsProps) {
  const router = useRouter();
  const data = row.original;

  return (
    <DataTableRowActions
      row={row}
      entityType="employee"
      entityId={data.id}
      entityName={data.name}
      onView={() => router.push(`/app/employees/${data.id}`)}
      onEdit={false}
      onDelete={false}
    />
  );
}







