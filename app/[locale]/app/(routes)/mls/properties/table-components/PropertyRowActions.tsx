"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";

interface PropertyRowActionsProps {
  row: Row<{
    id: string;
    property_name?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Property-specific row actions using the unified DataTableRowActions component.
 * Provides: View, Edit, Schedule Event, Share, Delete
 */
export function PropertyRowActions({ row }: PropertyRowActionsProps) {
  const router = useRouter();
  const data = row.original;

  const handleDelete = async () => {
    await axios.delete(`/api/mls/properties/${data.id}`);
  };

  return (
    <DataTableRowActions
      row={row}
      entityType="property"
      entityId={data.id}
      entityName={data.property_name}
      onView={() => router.push(`/app/mls/properties/${data.id}`)}
      onEdit={() => router.push(`/app/mls/properties/${data.id}?edit=true`)}
      onDelete={handleDelete}
      onSchedule={true}
      onShare={true}
      onActionComplete={() => router.refresh()}
    />
  );
}







