"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import { useTranslations } from "next-intl";
import { useClients } from "@/hooks/swr";

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
  const { clients, isLoading } = useClients();

  return (
    <MultiSelect
      options={clients}
      value={value}
      onChange={onChange}
      placeholder={t("selectors.selectClients")}
      searchPlaceholder={t("selectors.searchClients")}
      emptyMessage={t("selectors.noClientsFound")}
      loadingMessage={t("selectors.loading")}
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
