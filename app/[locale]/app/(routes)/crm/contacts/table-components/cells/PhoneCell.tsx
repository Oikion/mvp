"use client";

import { useRouter } from "@/navigation";
import axios from "axios";
import { toast } from "sonner";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface PhoneCellProps {
  contactId: string;
  primaryPhone: string | null | undefined;
}

export function PhoneCell({ contactId, primaryPhone }: PhoneCellProps) {
  const router = useRouter();

  const handleSave = async (newValue: string) => {
    await axios.put(`/api/crm/contacts/${contactId}`, { primaryPhone: newValue || null });
    toast.success("Phone updated");
    router.refresh();
  };

  return (
    <EditableTextCell
      value={primaryPhone}
      onSave={handleSave}
      placeholder="Phone number"
    />
  );
}
