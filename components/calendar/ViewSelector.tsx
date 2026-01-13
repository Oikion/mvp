"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  CalendarCheck,
} from "lucide-react";

export type CalendarViewMode = "day" | "week" | "month" | "semester" | "year";

interface ViewSelectorProps {
  value: CalendarViewMode;
  onChange: (view: CalendarViewMode) => void;
  className?: string;
}

const viewIcons: Record<CalendarViewMode, React.ReactNode> = {
  day: <Calendar className="h-4 w-4" />,
  week: <CalendarDays className="h-4 w-4" />,
  month: <CalendarRange className="h-4 w-4" />,
  semester: <LayoutGrid className="h-4 w-4" />,
  year: <CalendarCheck className="h-4 w-4" />,
};

export function ViewSelector({ value, onChange, className }: ViewSelectorProps) {
  const t = useTranslations("calendar.views");

  const views: { value: CalendarViewMode; label: string }[] = [
    { value: "day", label: t("day") },
    { value: "week", label: t("week") },
    { value: "month", label: t("month") },
    { value: "semester", label: t("semester") },
    { value: "year", label: t("year") },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-muted p-1 gap-1",
        className
      )}
      role="tablist"
      aria-label={t("day")}
    >
      {views.map((view) => (
        <Button
          key={view.value}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(view.value)}
          className={cn(
            "h-8 px-3 gap-1.5 text-sm font-medium transition-all",
            value === view.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent"
          )}
          role="tab"
          aria-selected={value === view.value}
          aria-controls={`calendar-${view.value}-view`}
        >
          <span className="hidden sm:inline-flex">{viewIcons[view.value]}</span>
          <span className="hidden md:inline">{view.label}</span>
          <span className="md:hidden">{view.label.slice(0, 3)}</span>
        </Button>
      ))}
    </div>
  );
}







