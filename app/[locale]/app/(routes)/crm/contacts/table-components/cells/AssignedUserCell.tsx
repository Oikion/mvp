"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  /** v1 prop name (legacy getColumns) */
  clientId?: string;
  /** v2 prop name (useContactColumns) */
  contactId?: string;
  /** v1: assigned_to user id */
  assignedTo?: string | null;
  /** v2: assignedAgentId */
  assignedAgentId?: string | null;
  users: any[];
}

export const AssignedUserCell = ({
  clientId,
  contactId,
  assignedTo,
  assignedAgentId,
  users,
}: AssignedUserCellProps) => {
  const t = useTranslations("crm");
  const id = contactId ?? clientId ?? "";
  const currentValue = assignedAgentId ?? assignedTo ?? null;

  const handleSave = async (value: string | null) => {
    await updateClient(id, { assigned_to: value });
    toast.success(t("CrmAccountsTable.assignmentUpdated"));
  };

  const userOptions = users.map((u: any) => ({
    value: u.id,
    label: u.name || u.email || u.id,
  }));

  return (
    <EditableSelectCell
      value={currentValue}
      onSave={handleSave}
      options={userOptions}
      nullLabel={t("CrmAccountsTable.unassigned")}
      placeholder={t("CrmAccountsTable.unassigned")}
    />
  );
};
