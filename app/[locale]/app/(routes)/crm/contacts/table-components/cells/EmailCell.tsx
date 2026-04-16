"use client";

import { useRouter } from "@/navigation";
import axios from "axios";
import { toast } from "sonner";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface EmailCellProps {
  contactId: string;
  email: string | null | undefined;
}

export function EmailCell({ contactId, email }: EmailCellProps) {
  const router = useRouter();

  const handleSave = async (newValue: string) => {
    await axios.put(`/api/crm/contacts/${contactId}`, { email: newValue || null });
    toast.success("Email updated");
    router.refresh();
  };

  return (
    <EditableTextCell
      value={email}
      onSave={handleSave}
      type="email"
      placeholder="Email address"
      className="truncate max-w-[180px]"
    />
  );
}
