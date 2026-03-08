"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface PhoneCellProps {
  clientId: string;
  value: string | null | undefined;
}

export const PhoneCell = ({ clientId, value }: PhoneCellProps) => {
  const tCommon = useTranslations("common");

  const handleSave = async (newValue: string) => {
    await updateClient(clientId, { primary_phone: newValue || null });
    toast.success(tCommon("success"));
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      placeholder="Phone number"
    />
  );
};
