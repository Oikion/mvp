"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface StatusCellProps {
  clientId: string;
  status: string;
}

const statuses = [
  { value: "LEAD", label: "Lead", variant: "info" },
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "INACTIVE", label: "Inactive", variant: "secondary" },
  { value: "CONVERTED", label: "Converted", variant: "purple" },
  { value: "LOST", label: "Lost", variant: "destructive" },
];

export const StatusCell = ({ clientId, status }: StatusCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("crm");

  // If the status from DB is not in our list (e.g. from legacy mapping), defaulting to something reasonable or showing it as is?
  // The getClients action returns "Active" or "IN_PROGRESS". 
  // We should map those to our enum values if possible or handle them.
  // "Active" -> "ACTIVE"
  // "IN_PROGRESS" -> "LEAD"? or just keep it.
  
  // Assuming we want to start using the real enums.
  
  const normalizeStatus = (s: string) => {
    if (s === "Active") return "ACTIVE";
    if (s === "IN_PROGRESS") return "LEAD"; // Best guess
    return s;
  };

  const currentStatus = normalizeStatus(status) || "LEAD";

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateClient(clientId, { client_status: value });
      toast.success(t("CrmAccountsTable.statusUpdated"));
    } catch (error) {
      // Using a string directly or a key that exists in crm.json. 
      // common.error is in common.json not crm.json if t is scoped to crm.
      // However, let's assuming we want to fix this properly.
      toast.error("Error updating status"); 
    } finally {
      setLoading(false);
    }
  };

  const getVariant = (val: string) => {
    return statuses.find(s => s.value === val)?.variant || "secondary";
  }

  const getLabel = (val: string) => {
     return statuses.find(s => s.value === val)?.label || val;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
            <Badge variant={getVariant(currentStatus) as any} className="hover:opacity-80 transition-opacity">
                 {getLabel(currentStatus)}
                 <ChevronDown className="ml-1 h-3 w-3" />
            </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statuses.map((s) => (
          <DropdownMenuItem 
            key={s.value} 
            onClick={() => handleValueChange(s.value)}
            className="cursor-pointer"
          >
             <Badge variant={s.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
             {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

