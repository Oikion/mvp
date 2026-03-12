"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

interface AssignedUserCellProps {
  propertyId: string;
  assignedTo: string | null;
  users: any[];
}

export const AssignedUserCell = ({
  propertyId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const router = useRouter();
  const t = useTranslations("mls");

  const handleSave = async (value: string | null) => {
    await axios.put("/api/mls/properties", {
      id: propertyId,
      assigned_to: value,
    });
    toast.success(t("MlsPropertiesTable.assignmentUpdated"));
    router.refresh();
  };

  const userOptions = users.map((u: any) => ({
    value: u.id,
    label: u.name || u.email || u.id,
  }));

  return (
    <EditableSelectCell
      value={assignedTo}
      onSave={handleSave}
      options={userOptions}
      nullLabel={t("MlsPropertiesTable.unassigned")}
      placeholder={t("MlsPropertiesTable.unassigned")}
    />
  );
};
