"use client";

import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";

const CONTACT_STATUSES = [
  "LEAD",
  "CONTACTED",
  "QUALIFIED",
  "ACTIVE",
  "UNDER_CONTRACT",
  "COMPLETED",
  "ON_HOLD",
  "INACTIVE",
] as const;

const STATUS_VARIANTS: Record<string, string> = {
  LEAD: "info",
  CONTACTED: "secondary",
  QUALIFIED: "purple",
  ACTIVE: "success",
  UNDER_CONTRACT: "purple",
  COMPLETED: "success",
  ON_HOLD: "warning",
  INACTIVE: "secondary",
};

interface StatusCellProps {
  contactId: string;
  status: string;
}

export function StatusCell({ contactId, status }: StatusCellProps) {
  const router = useRouter();
  const t = useTranslations("crm");

  const options = CONTACT_STATUSES.map((s) => ({
    value: s,
    label: t(`contacts.status.${s}` as Parameters<typeof t>[0]),
    variant: STATUS_VARIANTS[s] ?? "secondary",
  }));

  const handleSave = async (value: string) => {
    await axios.put(`/api/crm/contacts/${contactId}`, { status: value });
    toast.success("Status updated");
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={status}
      onSave={handleSave}
      options={options}
      useBadge
    />
  );
}
