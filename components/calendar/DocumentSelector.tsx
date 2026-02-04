"use client";

/**
 * DocumentSelector for Calendar Forms
 * 
 * Uses the unified UnifiedEntitySelector with optimized search and caching.
 * Multi-field search: name, description, ID
 */

import { useTranslations } from "next-intl";
import { DocumentSelector as UnifiedDocumentSelector } from "@/components/entity-selector";

interface DocumentSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function DocumentSelector({
  value,
  onChange,
  disabled = false,
}: DocumentSelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedDocumentSelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectDocuments")}
      searchPlaceholder={t("selectors.searchDocuments")}
      emptyMessage={t("selectors.noDocumentsFound")}
      disabled={disabled}
    />
  );
}
