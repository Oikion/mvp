"use client";

/**
 * ContactSelector for Calendar Forms (v2.0 — replaces ClientSelector)
 *
 * Uses the unified UnifiedEntitySelector with optimized search and caching.
 * Multi-field search: name, email, phone, ID
 */

import { useTranslations } from "next-intl";
import { ContactSelector as UnifiedContactSelector } from "@/components/entity-selector";

interface ContactSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  createNewLabel?: string;
  onCreateNew?: () => void;
}

/** @deprecated Use ContactSelector instead */
export function ClientSelector(props: ContactSelectorProps) {
  return <ContactSelector {...props} />;
}

export function ContactSelector({
  value,
  onChange,
  disabled = false,
  createNewLabel,
  onCreateNew,
}: ContactSelectorProps) {
  const t = useTranslations("calendar");

  return (
    <UnifiedContactSelector
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectContacts")}
      searchPlaceholder={t("selectors.searchContacts")}
      emptyMessage={t("selectors.noContactsFound")}
      disabled={disabled}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}
