"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import { useTranslations } from "next-intl";
import { useProperties } from "@/hooks/swr";

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
  const { properties, isLoading } = useProperties();

  return (
    <MultiSelect
      options={properties}
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectProperties")}
      searchPlaceholder={t("selectors.searchProperties")}
      emptyMessage={t("selectors.noPropertiesFound")}
      disabled={disabled || isLoading}
    />
  );
}
