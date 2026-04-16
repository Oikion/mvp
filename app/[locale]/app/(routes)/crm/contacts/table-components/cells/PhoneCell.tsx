"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface PhoneCellProps {
  /** v1 prop name (legacy getColumns) */
  clientId?: string;
  /** v2 prop name (useContactColumns) */
  contactId?: string;
  /** v1: inline value */
  value?: string | null;
  /** v2: primaryPhone field */
  primaryPhone?: string | null;
}

export const PhoneCell = ({ clientId, contactId, value, primaryPhone }: PhoneCellProps) => {
  const t = useTranslations("crm");
  const id = contactId ?? clientId ?? "";
  const display = primaryPhone ?? value;

  const handleSave = async (newValue: string) => {
    await updateClient(id, { primary_phone: newValue || null });
    toast.success(t("CrmAccountsTable.phoneUpdated"));
  };

  return (
    <EditableTextCell
      value={display}
      onSave={handleSave}
      placeholder="Phone number"
    />
  );
};
