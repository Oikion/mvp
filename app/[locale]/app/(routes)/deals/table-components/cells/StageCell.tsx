"use client";

import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { EditableDropdownCell } from "@/components/ui/data-table/editable-dropdown-cell";
import type { BadgeVariant } from "@/components/ui/badge";

const DEAL_STAGES = [
  "INTEREST",
  "OFFER",
  "NEGOTIATION",
  "PRELIMINARY_AGREEMENT",
  "DUE_DILIGENCE",
  "TRANSFER_TAX",
  "SIGNING",
  "REGISTRATION",
  "COMPLETED",
  "FALLEN_THROUGH",
] as const;

const STAGE_VARIANTS: Record<string, BadgeVariant> = {
  INTEREST: "secondary",
  OFFER: "info",
  NEGOTIATION: "warning",
  PRELIMINARY_AGREEMENT: "purple",
  DUE_DILIGENCE: "purple",
  TRANSFER_TAX: "amber",
  SIGNING: "success",
  REGISTRATION: "success",
  COMPLETED: "success",
  FALLEN_THROUGH: "destructive",
};

interface StageCellProps {
  dealId: string;
  stage: string;
}

export function StageCell({ dealId, stage }: StageCellProps) {
  const router = useRouter();
  const t = useTranslations("deals");

  const options = DEAL_STAGES.map((s) => ({
    value: s,
    label: t(`stage.${s}` as Parameters<typeof t>[0]),
    variant: STAGE_VARIANTS[s] ?? "secondary",
  }));

  const handleSave = async (value: string) => {
    await axios.put(`/api/deals/${dealId}`, { toStage: value });
    toast.success(t("cell.stageUpdated"));
    router.refresh();
  };

  return (
    <EditableDropdownCell
      value={stage}
      onSave={handleSave}
      options={options}
      useBadge
    />
  );
}
