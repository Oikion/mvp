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

interface UrgencyCellProps {
  mandateId: string;
  urgency: string | null;
}

const urgencies = [
  { value: "LOW", variant: "secondary" },
  { value: "MEDIUM", variant: "warning" },
  { value: "HIGH", variant: "default" },
  { value: "CRITICAL", variant: "destructive" },
] as const;

export const UrgencyCell = ({ mandateId, urgency }: UrgencyCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, urgency: value as any });
      toast.success(tCommon("toast.updateSuccess"));
    } catch {
      toast.error(tCommon("toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const current = urgencies.find((u) => u.value === urgency);

  const trigger = current ? (
    <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
      {t(`MandateForm.urgency.${current.value}` as any)}
      <ChevronDown className="ml-1 h-3 w-3" />
    </Badge>
  ) : (
    <span className="text-muted-foreground text-xs flex items-center gap-0.5">
      — <ChevronDown className="h-3 w-3" />
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button type="button" className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {trigger}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {urgencies.map((u) => (
          <DropdownMenuItem
            key={u.value}
            onClick={() => handleValueChange(u.value)}
            className="cursor-pointer"
          >
            <Badge variant={u.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
            {t(`MandateForm.urgency.${u.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
