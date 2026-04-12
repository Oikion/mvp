"use client";

import { useRouter } from "@/navigation";
import { updateRequest } from "@/actions/requests/update-request";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface StatusCellProps {
  requestId: string;
  status: string | null | undefined;
}

const statuses: DropdownOption[] = [
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "MATCHED", label: "Matched", variant: "info" },
  { value: "UNDER_OFFER", label: "Under Offer", variant: "warning" },
  { value: "PAUSED", label: "Paused", variant: "secondary" },
  { value: "CLOSED", label: "Closed", variant: "outline" },
];

export const StatusCell = ({ requestId, status }: StatusCellProps) => {
  const router = useRouter();
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");

  const translatedStatuses = statuses.map((s) => ({
    ...s,
    label: t(`status.${s.value}` as any) || s.label,
  }));

  const handleSave = async (value: string) => {
    const result = await updateRequest(requestId, { status: value as any });
    if (!result.success) throw new Error(result.error);
    toast.success(tCommon("toast.updateSuccess"));
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={status || "ACTIVE"}
      onSave={handleSave}
      options={translatedStatuses}
      useBadge
    />
  );
};
