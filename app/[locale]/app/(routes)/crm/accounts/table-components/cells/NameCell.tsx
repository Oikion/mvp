"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface NameCellProps {
  clientId: string;
  value: string | null | undefined;
}

export const NameCell = ({ clientId, value }: NameCellProps) => {
  const tCommon = useTranslations("common");

  const handleSave = async (newValue: string) => {
    await updateClient(clientId, { client_name: newValue });
    toast.success(tCommon("success"));
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      required
      placeholder="Client name"
    />
  );
};
