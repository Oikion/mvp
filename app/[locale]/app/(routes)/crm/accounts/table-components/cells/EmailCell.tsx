"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface EmailCellProps {
  clientId: string;
  value: string | null | undefined;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailCell = ({ clientId, value }: EmailCellProps) => {
  const t = useTranslations("crm");

  const validateEmail = (val: string) => {
    if (val && !EMAIL_REGEX.test(val)) return "Invalid email address";
    return null;
  };

  const handleSave = async (newValue: string) => {
    await updateClient(clientId, { primary_email: newValue || null });
    toast.success(t("CrmAccountsTable.emailUpdated"));
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      type="email"
      placeholder="email@example.com"
      validate={validateEmail}
    />
  );
};
