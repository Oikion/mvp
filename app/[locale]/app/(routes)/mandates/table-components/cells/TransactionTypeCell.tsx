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

interface TransactionTypeCellProps {
  mandateId: string;
  transactionType: string | null;
}

const transactionTypes = [
  { value: "SALE", variant: "default" },
  { value: "RENTAL", variant: "secondary" },
  { value: "SHORT_TERM", variant: "outline" },
  { value: "EXCHANGE", variant: "outline" },
] as const;

export const TransactionTypeCell = ({
  mandateId,
  transactionType,
}: TransactionTypeCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, transaction_type: value as any });
      toast.success(tCommon("toast.updateSuccess"));
    } catch {
      toast.error(tCommon("toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const current = transactionTypes.find((tt) => tt.value === transactionType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          {current ? (
            <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
              {t(`MandateForm.transactionType.${current.value}` as any)}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs flex items-center gap-0.5">
              — <ChevronDown className="h-3 w-3" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {transactionTypes.map((tt) => (
          <DropdownMenuItem
            key={tt.value}
            onClick={() => handleValueChange(tt.value)}
            className="cursor-pointer"
          >
            <Badge variant={tt.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
            {t(`MandateForm.transactionType.${tt.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
