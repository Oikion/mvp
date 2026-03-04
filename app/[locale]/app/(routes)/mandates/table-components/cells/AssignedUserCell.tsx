"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AssignedUserCellProps {
  mandateId: string;
  assignedTo: string | null;
  users: { id: string; name: string | null }[];
}

export const AssignedUserCell = ({
  mandateId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      const newValue = value === "unassigned" ? undefined : value;
      await updateMandate({ id: mandateId, assigned_to: newValue });
      toast.success(tCommon("toast.updateSuccess"));
    } catch {
      toast.error(tCommon("toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const currentValue = assignedTo ?? "unassigned";

  return (
    <Select value={currentValue} onValueChange={handleValueChange} disabled={loading}>
      <SelectTrigger className="h-8 w-[160px] border-none bg-transparent shadow-none hover:bg-muted/50 focus:ring-0 px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">—</span>
        </SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name ?? user.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
