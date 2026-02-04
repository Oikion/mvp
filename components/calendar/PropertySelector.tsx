"use client";

/**
 * PropertySelector for Calendar Forms
 * 
 * Uses the unified UnifiedEntitySelector with optimized search and caching.
 * Multi-field search: name, address, municipality, price, ID
 */

import { useTranslations } from "next-intl";
import { PropertySelector as UnifiedPropertySelector } from "@/components/entity-selector";

interface PropertySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function PropertySelector({
  value,
  onChange,
  disabled = false,
}: PropertySelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedPropertySelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectProperties")}
      searchPlaceholder={t("selectors.searchProperties")}
      emptyMessage={t("selectors.noPropertiesFound")}
      disabled={disabled}
    />
  );
}
