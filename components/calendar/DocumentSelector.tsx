"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import { useTranslations } from "next-intl";
import { useDocuments } from "@/hooks/swr";

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
  const { documents, isLoading } = useDocuments();

  return (
    <MultiSelect
      options={documents}
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectDocuments")}
      searchPlaceholder={t("selectors.searchDocuments")}
      emptyMessage={t("selectors.noDocumentsFound")}
      disabled={disabled || isLoading}
    />
  );
}
