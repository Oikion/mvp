"use client";

import { useTranslations } from "next-intl";
import { DataOwnershipSelector } from "@/components/data-ownership/DataOwnershipSelector";
import type { DataOwnershipMode } from "@prisma/client";

interface DataOwnershipStepProps {
  currentMode: DataOwnershipMode;
  onModeChange: (mode: DataOwnershipMode) => void;
}

export function DataOwnershipStep({
  currentMode,
  onModeChange,
}: DataOwnershipStepProps) {
  const t = useTranslations("dataOwnership.selector");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <DataOwnershipSelector
        defaultValue={currentMode}
        onChange={onModeChange}
      />
    </div>
  );
}
