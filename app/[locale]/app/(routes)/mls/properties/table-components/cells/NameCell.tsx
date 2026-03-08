"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";

interface NameCellProps {
  propertyId: string;
  value: string;
}

export const NameCell = ({ propertyId, value }: NameCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const handleSave = async (newValue: string) => {
    await axios.put("/api/mls/properties", {
      id: propertyId,
      property_name: newValue,
    });
    toast.success(t("MlsPropertiesTable.nameUpdated") || "Name updated");
    router.refresh();
  };

  return (
    <EditableTextCell
      value={value}
      onSave={handleSave}
      required
      placeholder="Property name"
    />
  );
};
