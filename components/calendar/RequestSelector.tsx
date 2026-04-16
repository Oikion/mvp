"use client";

/**
 * RequestSelector for Calendar Forms — v2.0 replacement for MandateSelector.
 *
 * Uses the unified UnifiedEntitySelector for request search and selection.
 */

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
      disabled={disabled}
      emptyMessage={t("selectors.noRequestsFound")}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}

export default RequestSelector;
