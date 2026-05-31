"use client";

import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface TitleCellProps {
  dealId: string;
  title: string | null;
  fallback: string;
}

export function TitleCell({ dealId, title, fallback }: TitleCellProps) {
  const router = useRouter();
  const t = useTranslations("deals");

  const handleSave = async (value: string) => {
    await axios.put(`/api/deals/${dealId}`, { title: value || null });
    toast.success(t("cell.titleUpdated"));
    router.refresh();
  };

  return (
    <EditableTextCell
      value={title || fallback}
      onSave={handleSave}
      placeholder={fallback}
    />
  );
}
