"use client";

import { useRouter } from "next/navigation";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface TitleCellProps {
  mandateId: string;
  value: string | null | undefined;
}

export const TitleCell = ({ mandateId, value }: TitleCellProps) => {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const t = useTranslations("mandates");

  const handleSave = async (newValue: string) => {
    await updateMandate({ id: mandateId, title: newValue });
    toast.success(tCommon("success"));
    router.refresh();
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      required
      placeholder={t("MandateForm.fields.titlePlaceholder")}
      className="font-medium truncate max-w-[200px]"
    />
  );
};
