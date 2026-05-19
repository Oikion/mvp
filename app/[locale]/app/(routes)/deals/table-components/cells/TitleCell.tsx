"use client";

import { useRouter } from "@/navigation";
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

  const handleSave = async (value: string) => {
    await axios.put(`/api/deals/${dealId}`, { title: value || null });
    toast.success("Title updated");
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
