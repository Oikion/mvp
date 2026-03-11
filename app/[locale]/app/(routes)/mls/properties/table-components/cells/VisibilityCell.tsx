"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { Lock, Users, Globe } from "lucide-react";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface VisibilityCellProps {
  propertyId: string;
  visibility: string | null | undefined;
}

const visibilities: DropdownOption[] = [
  { value: "PERSONAL", label: "Personal", variant: "secondary", icon: Lock },
  { value: "SECURE", label: "Secure", variant: "info", icon: Users },
  { value: "PUBLIC", label: "Public", variant: "success", icon: Globe },
];

export const VisibilityCell = ({ propertyId, visibility }: VisibilityCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const translatedVisibilities = visibilities.map((v) => ({
    ...v,
    label: t(`PropertyForm.visibility.${v.value}`) || v.label,
  }));

  const handleSave = async (value: string) => {
    await axios.put("/api/mls/properties", {
      id: propertyId,
      visibility: value,
    });
    toast.success(t("MlsPropertiesTable.visibilityUpdated") || "Visibility updated");
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={visibility || "PERSONAL"}
      onSave={handleSave}
      options={translatedVisibilities}
      useBadge
    />
  );
};
