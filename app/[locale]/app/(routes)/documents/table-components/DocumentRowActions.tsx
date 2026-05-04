"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import { archiveEntity } from "@/actions/archive/archive-entity";

interface DocumentRowActionsProps {
  row: Row<any>;
}

export function DocumentRowActions({ row }: DocumentRowActionsProps) {
  const router = useRouter();
  const data = row.original;

  const handleDelete = async () => {
    const result = await archiveEntity("document", data.id);
    if (!result.success) throw new Error(result.error);
  };

  return (
    <DataTableRowActions
      row={row}
      entityType="document"
      entityId={data.id}
      entityName={data.document_name}
      onView={() => router.push(`/app/documents/${data.friendlyId}`)}
      onDelete={handleDelete}
      onActionComplete={() => router.refresh()}
    />
  );
}
