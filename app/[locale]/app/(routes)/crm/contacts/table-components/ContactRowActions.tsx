"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions, QuickAction } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateContactForm } from "../components/UpdateContactForm";
import { Edit } from "lucide-react";
import { useTranslations } from "next-intl";

interface ContactRowActionsProps {
  row: Row<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    [key: string]: unknown;
  }>;
}

/**
 * Contact-specific row actions using the unified DataTableRowActions component.
 * Provides: View, Edit (inline modal), Schedule Event, Share, Delete
 */
export function ContactRowActions({ row }: ContactRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const data = row.original;
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const contactName = data.first_name 
    ? `${data.first_name} ${data.last_name || ""}`.trim()
    : t("unnamed");

  const handleDelete = async () => {
    await axios.delete(`/api/crm/contacts/${data.id}`);
  };

  // Custom action to open edit modal inline (contact-specific behavior)
  const customActions: QuickAction[] = [];

  return (
    <>
      <DataTableRowActions
        row={row}
        entityType="contact"
        entityId={data.id}
        entityName={contactName}
        onView={() => router.push(`/app/crm/contacts/${data.id}`)}
        onEdit={() => setEditModalOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        customActions={customActions}
        onActionComplete={() => router.refresh()}
      />
      
      {/* Inline Edit Modal for Contacts */}
      <RightViewModalNoTrigger
        title={`${t("update")} Contact - ${contactName}`}
        description="Update contact details"
        open={editModalOpen}
        setOpen={setEditModalOpen}
      >
        <UpdateContactForm initialData={row.original} setOpen={setEditModalOpen} />
      </RightViewModalNoTrigger>
    </>
  );
}







