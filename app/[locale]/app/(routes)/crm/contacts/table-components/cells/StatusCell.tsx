"use client";

import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface StatusCellProps {
  /** v1 prop name (legacy getColumns) */
  clientId?: string;
  /** v2 prop name (useContactColumns) */
  contactId?: string;
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

export const StatusCell = ({ clientId, contactId, status }: StatusCellProps) => {
  const t = useTranslations("crm");
  const id = contactId ?? clientId ?? "";

  const handleSave = async (value: string) => {
    await updateClient(id, { client_status: value });
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
