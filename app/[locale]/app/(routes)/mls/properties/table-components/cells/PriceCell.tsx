"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface PriceCellProps {
  propertyId: string;
  price: number | string | null | undefined;
}

export const PriceCell = ({ propertyId, price }: PriceCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const numericPrice =
    price !== null && price !== undefined && price !== ""
      ? Number(price)
      : null;

  const handleSave = async (newValue: string) => {
    const parsed = parseFloat(newValue.replace(/,/g, ""));
    await axios.put("/api/mls/properties", {
      id: propertyId,
      price: newValue.trim() === "" ? null : parsed,
    });
    toast.success(t("MlsPropertiesTable.priceUpdated") || "Price updated");
    router.refresh();
  };

  const formatPrice = (val: string | number | null | undefined) => {
    const num = val !== null && val !== undefined && val !== "" ? Number(val) : null;
    if (!num) return "—";
    return `€${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const validatePrice = (val: string) => {
    if (val.trim() === "") return null;
    const parsed = parseFloat(val.replace(/,/g, ""));
    if (isNaN(parsed)) return t("MlsPropertiesTable.invalidPrice") || "Invalid price format";
    return null;
  };

  return (
    <EditableTextCell
      value={numericPrice}
      onSave={handleSave}
      prefix="€"
      placeholder="0.00"
      validate={validatePrice}
      formatDisplay={formatPrice}
    />
  );
};
