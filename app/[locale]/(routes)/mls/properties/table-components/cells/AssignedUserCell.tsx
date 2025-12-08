"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "axios";

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
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mls");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      const newValue = value === "unassigned" ? null : value;
      await axios.put("/api/mls/properties", {
        id: propertyId,
        assigned_to: newValue,
      });
      toast.success(tCommon("saved") || "Saved");
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error(tCommon("error") || "Error");
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
        <SelectValue placeholder={t("MlsPropertiesTable.unassigned")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          {t("MlsPropertiesTable.unassigned")}
        </SelectItem>

        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};








