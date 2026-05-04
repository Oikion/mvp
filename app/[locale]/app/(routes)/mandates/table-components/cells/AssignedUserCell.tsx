"use client";

import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  mandateId: string;
  assignedTo: string | null;
  users: { id: string; name: string | null }[];
}

export const AssignedUserCell = ({
  mandateId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const tCommon = useTranslations("common");

  const handleSave = async (value: string | null) => {
    await updateMandate({ id: mandateId, assigned_to: value ?? undefined });
    toast.success(tCommon("toast.updateSuccess"));
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name ?? u.id,
  }));

  return (
    <EditableSelectCell
      value={assignedTo}
      onSave={handleSave}
      options={userOptions}
      width="160px"
    />
  );
};
