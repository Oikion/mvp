"use client";

import { useRouter } from "@/navigation";
import { updateRequest } from "@/actions/requests/update-request";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface UrgencyCellProps {
  requestId: string;
  urgency: string | null;
}

const urgencies: DropdownOption[] = [
  { value: "LOW", label: "Low", variant: "secondary" },
  { value: "MEDIUM", label: "Medium", variant: "warning" },
  { value: "HIGH", label: "High", variant: "default" },
  { value: "CRITICAL", label: "Critical", variant: "destructive" },
];

export const UrgencyCell = ({ requestId, urgency }: UrgencyCellProps) => {
  const router = useRouter();
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");

  const translatedUrgencies = urgencies.map((u) => ({
    ...u,
    label: t(`urgency.${u.value}` as any) || u.label,
  }));

  const handleSave = async (value: string) => {
    const result = await updateRequest(requestId, { urgency: value as any });
    if (!result.success) throw new Error(result.error);
    toast.success(tCommon("toast.updateSuccess"));
    router.refresh();
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
