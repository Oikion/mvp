"use client";

import { useRouter } from "@/navigation";
import { useFormatter, useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface DealPriceCellProps {
  dealId: string;
  /** "agreedPrice" for SALE, "monthlyRentAmount" for RENT */
  field: "agreedPrice" | "monthlyRentAmount";
  value: number | string | null | undefined;
  currency?: string | null;
}

export function DealPriceCell({ dealId, field, value, currency = "EUR" }: DealPriceCellProps) {
  const router = useRouter();
  const format = useFormatter();
  const t = useTranslations("deals");

  const numeric = value !== null && value !== undefined && value !== "" ? Number(value) : null;

  const handleSave = async (newValue: string) => {
    const parsed = parseFloat(newValue.replace(/,/g, ""));
    await axios.put(`/api/deals/${dealId}`, {
      [field]: newValue.trim() === "" ? null : parsed,
    });
    toast.success(t("cell.priceUpdated"));
    router.refresh();
  };

  const formatDisplay = (val: string | number | null | undefined) => {
    const num = val !== null && val !== undefined && val !== "" ? Number(val) : null;
    if (num == null || isNaN(num)) return "—";
    return format.number(num, {
      style: "currency",
      currency: currency ?? "EUR",
      maximumFractionDigits: 0,
    });
  };

  const validate = (val: string) => {
    if (val.trim() === "") return null;
    const parsed = parseFloat(val.replace(/,/g, ""));
    if (isNaN(parsed)) return t("cell.invalidPrice");
    return null;
  };

  return (
    <EditableTextCell
      value={numeric}
      onSave={handleSave}
      type="number"
      placeholder="0"
      validate={validate}
      formatDisplay={formatDisplay}
    />
  );
}
