"use client";

import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";

const DEAL_TYPES = ["SALE", "RENT"] as const;

const TYPE_VARIANTS: Record<string, string> = {
  SALE: "outline",
  RENT: "secondary",
};

interface DealTypeCellProps {
  dealId: string;
  dealType: string | null;
}

export function DealTypeCell({ dealId, dealType }: DealTypeCellProps) {
  const router = useRouter();
  const t = useTranslations("deals");

  const options = DEAL_TYPES.map((dt) => ({
    value: dt,
    label: t(`dealType.${dt}` as Parameters<typeof t>[0]),
    variant: TYPE_VARIANTS[dt] ?? "outline",
  }));

  const handleSave = async (value: string) => {
    await axios.put(`/api/deals/${dealId}`, { dealType: value });
    toast.success("Deal type updated");
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={dealType}
      onSave={handleSave}
      options={options}
      useBadge={false}
    />
  );
}
