"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import axios from "axios";

interface StatusCellProps {
  propertyId: string;
  status: string;
}

const statuses = [
  { value: "ACTIVE", label: "Active", variant: "success" },
  { value: "PENDING", label: "Pending", variant: "info" },
  { value: "SOLD", label: "Sold", variant: "purple" },
  { value: "OFF_MARKET", label: "Off Market", variant: "secondary" },
  { value: "WITHDRAWN", label: "Withdrawn", variant: "destructive" },
];

export const StatusCell = ({ propertyId, status }: StatusCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mls");

  const currentStatus = status || "ACTIVE";

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await axios.put("/api/mls/properties", {
        id: propertyId,
        property_status: value,
      });
      toast.success(t("MlsPropertiesTable.statusUpdated") || "Status updated");
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setLoading(false);
    }
  };

  const getVariant = (val: string) => {
    return statuses.find((s) => s.value === val)?.variant || "secondary";
  };

  const getLabel = (val: string) => {
    const statusObj = statuses.find((s) => s.value === val);
    if (statusObj) {
      return t(`PropertyForm.status.${val}`) || statusObj.label;
    }
    return val;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          <Badge
            variant={getVariant(currentStatus) as any}
            className="hover:opacity-80 transition-opacity"
          >
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
            <Badge
              variant={s.variant as any}
              className="mr-2 w-2 h-2 rounded-full p-0"
            />
            {t(`PropertyForm.status.${s.value}`) || s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};













