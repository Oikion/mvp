"use client";

/**
 * ClientSelector for Calendar Forms
 * 
 * Uses the unified UnifiedEntitySelector with optimized search and caching.
 * Multi-field search: name, email, phone, ID
 */

import { useTranslations } from "next-intl";
import { ClientSelector as UnifiedClientSelector } from "@/components/entity-selector";

interface ClientSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function ClientSelector({
  value,
  onChange,
  disabled = false,
}: ClientSelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedClientSelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectClients")}
      searchPlaceholder={t("selectors.searchClients")}
      emptyMessage={t("selectors.noClientsFound")}
      disabled={disabled}
    />
  );
}
