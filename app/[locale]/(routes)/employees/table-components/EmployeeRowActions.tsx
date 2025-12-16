"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";

interface EmployeeRowActionsProps {
  row: Row<{
    id: string;
    name?: string | null;
    [key: string]: unknown;
  }>;
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
      onView={() => router.push(`/employees/${data.id}`)}
      onEdit={false}
      onDelete={false}
    />
  );
}



