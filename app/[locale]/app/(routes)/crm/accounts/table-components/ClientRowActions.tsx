"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";

interface ClientRowActionsProps {
  row: Row<{
    id: string;
    name?: string;
    client_name?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Client-specific row actions using the unified DataTableRowActions component.
 * Provides: View, Edit, Schedule Event, Share, Delete
 */
export function ClientRowActions({ row }: ClientRowActionsProps) {
  const router = useRouter();
  const data = row.original;

  const handleDelete = async () => {
    await axios.delete(`/api/crm/account/${data.id}`);
  };

  return (
    <DataTableRowActions
      row={row}
      entityType="client"
      entityId={data.id}
      entityName={data.name || data.client_name}
      onView={() => router.push(`/app/crm/clients/${data.id}`)}
      onEdit={() => router.push(`/app/crm/clients/${data.id}?edit=true`)}
      onDelete={handleDelete}
      onSchedule={true}
      onShare={true}
      onActionComplete={() => router.refresh()}
    />
  );
}







