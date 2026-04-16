"use client";

import { useTranslations } from "next-intl";
import { RequestSelector as UnifiedRequestSelector } from "@/components/entity-selector";

interface RequestSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  createNewLabel?: string;
  onCreateNew?: () => void;
}

export function RequestSelector({
  value,
  onChange,
  disabled = false,
  createNewLabel,
  onCreateNew,
}: RequestSelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedRequestSelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectRequests")}
      searchPlaceholder={t("selectors.searchRequests")}
      emptyMessage={t("selectors.noRequestsFound")}
      disabled={disabled}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}
