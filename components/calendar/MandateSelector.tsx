"use client";

/**
 * MandateSelector for Calendar Forms
 *
 * Uses the unified UnifiedEntitySelector for mandate search and selection.
 */

import { useTranslations } from "next-intl";
import { MandateSelector as UnifiedMandateSelector } from "@/components/entity-selector";

interface MandateSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  createNewLabel?: string;
  onCreateNew?: () => void;
}

export function MandateSelector({
  value,
  onChange,
  disabled = false,
  createNewLabel,
  onCreateNew,
}: MandateSelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedMandateSelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectMandates")}
      searchPlaceholder={t("selectors.searchMandates")}
      emptyMessage={t("selectors.noMandatesFound")}
      disabled={disabled}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}
