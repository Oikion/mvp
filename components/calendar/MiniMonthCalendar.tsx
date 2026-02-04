"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: number;
  eventId?: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface MiniMonthCalendarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  className?: string;
}

export function MiniMonthCalendar({
  events,
  selectedDate,
  onDateSelect,
  className,
}: MiniMonthCalendarProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  // Sync currentMonth when selectedDate changes significantly
  useEffect(() => {
    const selectedMonth = startOfMonth(selectedDate);
    if (!isSameMonth(currentMonth, selectedMonth)) {
      setCurrentMonth(selectedMonth);
    }
  }, [selectedDate, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, number> = {};
    events.forEach((event) => {
      const eventDate = format(new Date(event.startTime), "yyyy-MM-dd");
      grouped[eventDate] = (grouped[eventDate] || 0) + 1;
    });
    return grouped;
  }, [events]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const getEventCount = (day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    return eventsByDate[dayKey] || 0;
  };

  const isToday = (day: Date) => isSameDay(day, new Date());
  const isSelected = (day: Date) => selectedDate && isSameDay(day, selectedDate);
  const isCurrentMonth = (day: Date) => isSameMonth(day, currentMonth);

  const weekdayLabels = locale === "el"
    ? ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigateMonth("prev")}
          aria-label={t("views.previousMonth")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <h3 className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigateMonth("next")}
          aria-label={t("views.nextMonth")}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((day) => (
            <div
              key={day}
              className="text-[10px] text-center text-muted-foreground font-medium py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const eventCount = getEventCount(day);
            const isCurrentMonthDay = isCurrentMonth(day);
            const isSelectedDay = isSelected(day);
            const isTodayDay = isToday(day);

            return (
              <button
                key={dayKey}
                onClick={() => onDateSelect(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDateSelect(day);
                  }
                }}
                className={cn(
                  "aspect-square text-xs font-medium rounded-md transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                  !isCurrentMonthDay && "text-muted-foreground/50",
                  isSelectedDay && "bg-primary text-primary-foreground font-semibold",
                  !isSelectedDay && isCurrentMonthDay && "hover:bg-muted",
                  isTodayDay && !isSelectedDay && "ring-1 ring-primary"
                )}
                aria-label={format(day, "d MMMM yyyy", { locale: dateLocale })}
                aria-selected={isSelectedDay}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{format(day, "d")}</span>
                  {eventCount > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 rounded-full",
                            isSelectedDay ? "bg-primary-foreground/60" : "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
