"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface StatusCellProps {
  propertyId: string;
  status: string;
}

const statuses: DropdownOption[] = [
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "PENDING", label: "Pending", variant: "info" },
  { value: "SOLD", label: "Sold", variant: "purple" },
  { value: "OFF_MARKET", label: "Off Market", variant: "secondary" },
  { value: "WITHDRAWN", label: "Withdrawn", variant: "destructive" },
];

export const StatusCell = ({ propertyId, status }: StatusCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const translatedStatuses = statuses.map((s) => ({
    ...s,
    label: t(`PropertyForm.status.${s.value}` as Parameters<typeof t>[0]) || s.label,
  }));

  const handleSave = async (value: string) => {
    await axios.put("/api/mls/properties", {
      id: propertyId,
      property_status: value,
    });
    toast.success(t("MlsPropertiesTable.statusUpdated") || "Status updated");
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={status || "ACTIVE"}
      onSave={handleSave}
      options={translatedStatuses}
      useBadge
    />
  );
};
