"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { archiveEntity } from "@/actions/archive/archive-entity";

import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { EditPropertyForm } from "../[slug]/components/EditPropertyForm";

interface PropertyRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

export function PropertyRowActions({ row }: PropertyRowActionsProps) {
  const router = useRouter();
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    const result = await archiveEntity("property", data.id);
    if (!result.success) throw new Error(result.error);
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={data.property_name ?? "Edit Property"}
        description="Update property details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <EditPropertyForm initialData={data} />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="property"
        entityId={data.id}
        entityName={data.property_name}
        onView={() => router.push(`/app/mls/properties/${data.friendlyId}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        onActionComplete={() => { setEditOpen(false); router.refresh(); }}
      />
    </>
  );
}
