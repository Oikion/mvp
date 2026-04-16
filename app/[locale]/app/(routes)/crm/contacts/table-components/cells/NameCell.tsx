"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface NameCellProps {
  /** v1 prop name (legacy getColumns) */
  clientId?: string;
  /** v2 prop name (useContactColumns) */
  contactId?: string;
  /** v1: inline value */
  value?: string | null;
  /** v2: displayName */
  displayName?: string | null;
  isCompany?: boolean;
}

export const NameCell = ({ clientId, contactId, value, displayName }: NameCellProps) => {
  const t = useTranslations("crm");
  const id = contactId ?? clientId ?? "";
  const display = displayName ?? value ?? "";

  const handleSave = async (newValue: string) => {
    await updateClient(id, { client_name: newValue });
    toast.success(t("CrmAccountsTable.nameUpdated"));
  };

  return (
    <EditableTextCell
      value={display}
      onSave={handleSave}
      required
      placeholder="Client name"
    />
  );
};
