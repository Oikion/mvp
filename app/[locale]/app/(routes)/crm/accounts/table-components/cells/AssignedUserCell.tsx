"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  clientId: string;
  assignedTo: string | null;
  users: any[];
}

export const AssignedUserCell = ({
  clientId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const t = useTranslations("crm");

  const handleSave = async (value: string | null) => {
    await updateClient(clientId, { assigned_to: value });
    toast.success(t("CrmAccountsTable.assignmentUpdated"));
  };

  const userOptions = users.map((u: any) => ({
    value: u.id,
    label: u.name || u.email || u.id,
  }));

  return (
    <EditableSelectCell
      value={assignedTo}
      onSave={handleSave}
      options={userOptions}
      nullLabel={t("CrmAccountsTable.unassigned")}
      placeholder={t("CrmAccountsTable.unassigned")}
    />
  );
};
