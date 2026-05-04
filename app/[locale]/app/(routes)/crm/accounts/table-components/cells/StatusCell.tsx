"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface StatusCellProps {
  clientId: string;
  status: string;
}

const statuses: DropdownOption[] = [
  { value: "LEAD", label: "Lead", variant: "info" },
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "INACTIVE", label: "Inactive", variant: "secondary" },
  { value: "CONVERTED", label: "Converted", variant: "purple" },
  { value: "LOST", label: "Lost", variant: "destructive" },
];

const normalizeStatus = (s: string) => {
  if (s === "Active") return "ACTIVE";
  if (s === "IN_PROGRESS") return "LEAD";
  return s;
};

export const StatusCell = ({ clientId, status }: StatusCellProps) => {
  const t = useTranslations("crm");

  const handleSave = async (value: string) => {
    await updateClient(clientId, { client_status: value });
    toast.success(t("CrmAccountsTable.statusUpdated"));
  };

  return (
    <EditableDropdownCell
      value={normalizeStatus(status) || "LEAD"}
      onSave={handleSave}
      options={statuses}
      useBadge
    />
  );
};
