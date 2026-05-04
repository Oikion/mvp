"use client";

import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface StatusCellProps {
  mandateId: string;
  status: string;
}

const statuses: DropdownOption[] = [
  { value: "DRAFT", label: "Draft", variant: "secondary" },
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "PAUSED", label: "Paused", variant: "warning" },
  { value: "FULFILLED", label: "Fulfilled", variant: "info" },
  { value: "EXPIRED", label: "Expired", variant: "outline" },
  { value: "CANCELLED", label: "Cancelled", variant: "destructive" },
];

export const StatusCell = ({ mandateId, status }: StatusCellProps) => {
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const translatedStatuses = statuses.map((s) => ({
    ...s,
    label: t(`MandateForm.status.${s.value}` as any) || s.label,
  }));

  const handleSave = async (value: string) => {
    await updateMandate({ id: mandateId, status: value as any });
    toast.success(tCommon("toast.updateSuccess"));
  };

  return (
    <EditableDropdownCell
      value={status || "DRAFT"}
      onSave={handleSave}
      options={translatedStatuses}
      useBadge
    />
  );
};
