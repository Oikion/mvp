"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions, QuickAction } from "@/components/ui/data-table/data-table-row-actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateContactForm } from "../components/UpdateContactForm";
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
 * Provides: View, Edit (inline sheet), Schedule Event, Share, Delete
 */
export function ContactRowActions({ row }: ContactRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const data = row.original;
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  
  const contactName = data.first_name 
    ? `${data.first_name} ${data.last_name || ""}`.trim()
    : t("unnamed");

  const handleDelete = async () => {
    await axios.delete(`/api/crm/contacts/${data.id}`);
  };

  // Custom action to open edit sheet inline (contact-specific behavior)
  const customActions: QuickAction[] = [];

  return (
    <>
      <DataTableRowActions
        row={row}
        entityType="contact"
        entityId={data.id}
        entityName={contactName}
        onView={() => router.push(`/app/crm/contacts/${data.id}`)}
        onEdit={() => setEditSheetOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        customActions={customActions}
        onActionComplete={() => router.refresh()}
      />
      
      {/* Inline Edit Sheet for Contacts - Using standardized Sheet component */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{`${t("update")} Contact - ${contactName}`}</SheetTitle>
            <SheetDescription>Update contact details</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <UpdateContactForm initialData={row.original} setOpen={setEditSheetOpen} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}







