"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface EmailCellProps {
  /** v1 prop name (legacy getColumns) */
  clientId?: string;
  /** v2 prop name (useContactColumns) */
  contactId?: string;
  /** v1: inline value */
  value?: string | null;
  /** v2: email field */
  email?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailCell = ({ clientId, contactId, value, email }: EmailCellProps) => {
  const t = useTranslations("crm");
  const id = contactId ?? clientId ?? "";
  const display = email ?? value;

  const validateEmail = (val: string) => {
    if (val && !EMAIL_REGEX.test(val)) return "Invalid email address";
    return null;
  };

  const handleSave = async (newValue: string) => {
    await updateClient(id, { primary_email: newValue || null });
    toast.success(t("CrmAccountsTable.emailUpdated"));
  };

  return (
    <EditableTextCell
      value={display}
      onSave={handleSave}
      type="email"
      placeholder="email@example.com"
      validate={validateEmail}
    />
  );
};
