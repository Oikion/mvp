"use client";

import { useRouter } from "@/navigation";
import { updateRequest } from "@/actions/requests/update-request";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface TransactionTypeCellProps {
  requestId: string;
  requestType: string | null;
}

const requestTypes: DropdownOption[] = [
  { value: "BUY", label: "Buy", variant: "default" },
  { value: "RENT", label: "Rent", variant: "secondary" },
];

export const TransactionTypeCell = ({
  requestId,
  requestType,
}: TransactionTypeCellProps) => {
  const router = useRouter();
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");

  const translatedTypes = requestTypes.map((rt) => ({
    ...rt,
    label: t(`requestType.${rt.value}` as any) || rt.label,
  }));

  const handleSave = async (value: string) => {
    const result = await updateRequest(requestId, { requestType: value as any });
    if (!result.success) throw new Error(result.error);
    toast.success(tCommon("toast.updateSuccess"));
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={requestType}
      onSave={handleSave}
      options={translatedTypes}
      useBadge
    />
  );
};
