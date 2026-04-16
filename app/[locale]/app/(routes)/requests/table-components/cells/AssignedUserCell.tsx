"use client";

import { useRouter } from "@/navigation";
import { updateRequest } from "@/actions/requests/update-request";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  requestId: string;
  assignedAgentId: string | null;
  users: { id: string; name: string | null }[];
}

export const AssignedUserCell = ({
  requestId,
  assignedAgentId,
  users,
}: AssignedUserCellProps) => {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const handleSave = async (value: string | null) => {
    const result = await updateRequest(requestId, { assignedAgentId: value ?? undefined });
    if (!result.success) throw new Error(result.error);
    toast.success(tCommon("toast.updateSuccess"));
    router.refresh();
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name ?? u.id,
  }));

  return (
    <EditableSelectCell
      value={assignedAgentId}
      onSave={handleSave}
      options={userOptions}
      width="160px"
    />
  );
};
