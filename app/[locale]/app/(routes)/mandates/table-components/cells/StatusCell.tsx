"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface StatusCellProps {
  mandateId: string;
  status: string;
}

const statuses = [
  { value: "DRAFT", variant: "secondary" },
  { value: "ACTIVE", variant: "success" },
  { value: "PAUSED", variant: "warning" },
  { value: "FULFILLED", variant: "info" },
  { value: "EXPIRED", variant: "outline" },
  { value: "CANCELLED", variant: "destructive" },
] as const;

export const StatusCell = ({ mandateId, status }: StatusCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, status: value as any });
      toast.success(tCommon("toast.updateSuccess"));
    } catch {
      toast.error(tCommon("toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const current = statuses.find((s) => s.value === status) ?? statuses[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button type="button" className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
            {t(`MandateForm.status.${current.value}` as any)}
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
            {t(`MandateForm.status.${s.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
