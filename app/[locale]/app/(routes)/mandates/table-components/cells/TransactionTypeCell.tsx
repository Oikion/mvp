"use client";

import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { DropdownOption } from "@/components/ui/data-table/editable-dropdown-cell";

interface TransactionTypeCellProps {
  mandateId: string;
  transactionType: string | null;
}

const transactionTypes: DropdownOption[] = [
  { value: "SALE", label: "Sale", variant: "default" },
  { value: "RENTAL", label: "Rental", variant: "secondary" },
  { value: "SHORT_TERM", label: "Short Term", variant: "outline" },
  { value: "EXCHANGE", label: "Exchange", variant: "outline" },
  { value: "AUCTION", label: "Auction", variant: "destructive" },
];

export const TransactionTypeCell = ({
  mandateId,
  transactionType,
}: TransactionTypeCellProps) => {
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const translatedTypes = transactionTypes.map((tt) => ({
    ...tt,
    label: t(`MandateForm.transactionType.${tt.value}` as any) || tt.label,
  }));

  const handleSave = async (value: string) => {
    await updateMandate({ id: mandateId, transaction_type: value as any });
    toast.success(tCommon("toast.updateSuccess"));
  };

  return (
    <EditableDropdownCell
      value={transactionType}
      onSave={handleSave}
      options={translatedTypes}
      useBadge
    />
  );
};
