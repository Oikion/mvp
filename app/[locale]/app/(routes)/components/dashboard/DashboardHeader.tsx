"use client";

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface DashboardHeaderProps {
  userName: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greetingMorning");
    if (hour < 18) return t("greetingAfternoon");
    return t("greetingEvening");
  };

  const formatDate = (): string => {
    const now = new Date();
    const dateLocale = locale === "el" ? el : enUS;
    return format(now, "EEEE, d MMMM yyyy", { locale: dateLocale });
  };

  const displayName = userName?.split(" ")[0] || t("defaultUser");

  return (
    <div>
      <h1 className="text-h4 tracking-tight">
        {getGreeting()}, {displayName}
      </h1>
      <p className="text-caption text-muted-foreground mt-1">{formatDate()}</p>
    </div>
  );
};
