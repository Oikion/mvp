"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AssignedUserCellProps {
  clientId: string;
  assignedTo: string | null;
  users: any[];
}

export const AssignedUserCell = ({
  clientId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("crm");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      const newValue = value === "unassigned" ? null : value;
      await updateClient(clientId, { assigned_to: newValue });
      toast.success(tCommon("saved"));
    } catch (error) {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const currentValue = assignedTo || "unassigned";

  return (
    <Select
      value={currentValue}
      onValueChange={handleValueChange}
      disabled={loading}
    >
      <SelectTrigger className="h-8 w-[180px] border-none bg-transparent shadow-none hover:bg-muted/50 focus:ring-0 px-2">
        <SelectValue placeholder={t("CrmAccountsTable.unassigned")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">{t("CrmAccountsTable.unassigned")}</SelectItem>

        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

