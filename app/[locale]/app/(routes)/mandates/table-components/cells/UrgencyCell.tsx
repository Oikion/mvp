"use client";

import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface UrgencyCellProps {
  mandateId: string;
  urgency: string | null;
}

const urgencies: DropdownOption[] = [
  { value: "LOW", label: "Low", variant: "secondary" },
  { value: "MEDIUM", label: "Medium", variant: "warning" },
  { value: "HIGH", label: "High", variant: "default" },
  { value: "CRITICAL", label: "Critical", variant: "destructive" },
];

export const UrgencyCell = ({ mandateId, urgency }: UrgencyCellProps) => {
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const translatedUrgencies = urgencies.map((u) => ({
    ...u,
    label: t(`MandateForm.urgency.${u.value}` as any) || u.label,
  }));

  const handleSave = async (value: string) => {
    await updateMandate({ id: mandateId, urgency: value as any });
    toast.success(tCommon("toast.updateSuccess"));
  };

  return (
    <EditableDropdownCell
      value={urgency}
      onSave={handleSave}
      options={translatedUrgencies}
      useBadge
    />
  );
};
