"use client";

import { useRouter } from "@/navigation";
import { updateRequest } from "@/actions/requests/update-request";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface TitleCellProps {
  requestId: string;
  value: string | null | undefined;
}

export const TitleCell = ({ requestId, value }: TitleCellProps) => {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const t = useTranslations("requests");

  const handleSave = async (newValue: string) => {
    const result = await updateRequest(requestId, { title: newValue });
    if (!result.success) throw new Error(result.error);
    toast.success(tCommon("toast.updateSuccess"));
    router.refresh();
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      required
      placeholder={t("wizard.fields.titlePlaceholder" as any)}
      className="font-medium truncate max-w-[200px]"
    />
  );
};
