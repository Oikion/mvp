"use client";

import { useRouter } from "@/navigation";
import axios from "axios";
import { toast } from "sonner";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  contactId: string;
  assignedAgentId: string | null;
  users: { id: string; name: string | null }[];
}

export function AssignedUserCell({ contactId, assignedAgentId, users }: AssignedUserCellProps) {
  const router = useRouter();

  const options = users.map((u) => ({
    value: u.id,
    label: u.name ?? u.id,
  }));

  const handleSave = async (value: string | null) => {
    await axios.put(`/api/crm/contacts/${contactId}`, { assignedAgentId: value });
    toast.success("Agent updated");
    router.refresh();
  };

  return (
    <EditableSelectCell
      value={assignedAgentId}
      onSave={handleSave}
      options={options}
      width="160px"
    />
  );
}
