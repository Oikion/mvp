"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface TypeCellProps {
  propertyId: string;
  value: string | null | undefined;
}

const propertyTypes: DropdownOption[] = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PARKING", label: "Parking" },
  { value: "PLOT", label: "Plot" },
  { value: "FARM", label: "Farm" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Other" },
];

export const TypeCell = ({ propertyId, value }: TypeCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const translatedTypes = propertyTypes.map((pt) => ({
    ...pt,
    label: t(`PropertyForm.propertyType.${pt.value}` as any) || pt.label,
  }));

  const handleSave = async (newValue: string) => {
    await axios.put("/api/mls/properties", {
      id: propertyId,
      property_type: newValue,
    });
    toast.success(t("MlsPropertiesTable.typeUpdated") || "Type updated");
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={value}
      onSave={handleSave}
      options={translatedTypes}
      useBadge={false}
    />
  );
};
