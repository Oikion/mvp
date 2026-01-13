"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
  getYear,
  setMonth,
  setYear,
  getMonth,
} from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: number;
  eventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
  eventType?: string;
}

interface YearViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthOpen?: (month: Date) => void;
  onDateOpen?: (date: Date) => void;
  onWeekOpen?: (anchorDate: Date) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function YearView({
  events,
  selectedDate,
  onDateSelect,
  onMonthOpen,
  onDateOpen,
  onWeekOpen,
  onEventUpdated,
  onEventDeleted,
}: YearViewProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  const year = getYear(selectedDate);

  // Generate all 12 months for the year
  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = setMonth(setYear(new Date(), year), i);
      result.push(monthDate);
    }
    return result;
  }, [year]);

  const navigateYear = (direction: "prev" | "next") => {
    const newDate = direction === "next" 
      ? addYears(selectedDate, 1) 
      : subYears(selectedDate, 1);
    onDateSelect(newDate);
  };

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const eventDate = format(new Date(event.startTime), "yyyy-MM-dd");
      if (!grouped[eventDate]) {
        grouped[eventDate] = [];
      }
      grouped[eventDate].push(event);
    });
    return grouped;
  }, [events]);

  const getEventsForMonth = (month: Date): number => {
    let count = 0;
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    days.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      count += eventsByDate[dayKey]?.length || 0;
    });
    
    return count;
  };

  const totalYearEvents = useMemo(() => {
    return events.filter((e) => {
      const eventYear = getYear(new Date(e.startTime));
      return eventYear === year;
    }).length;
  }, [events, year]);

  const weekdayLabels = locale === "el"
    ? ["Κ", "Δ", "Τ", "Τ", "Π", "Π", "Σ"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-4">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateYear("prev")}
          aria-label={t("views.previousYear")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-xl font-bold">{year}</h2>
          <p className="text-sm text-muted-foreground">
            {totalYearEvents > 0
              ? t("yearView.eventsThisYear", { count: totalYearEvents })
              : t("yearView.noEventsThisYear")}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateYear("next")}
          aria-label={t("views.nextYear")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Months Grid - 4 columns on large screens, 3 on medium, 2 on small */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart);
          const calendarEnd = endOfWeek(monthEnd);
          const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          const eventCount = getEventsForMonth(month);
          const isCurrentMonth = isSameMonth(month, new Date());

          return (
            <Card
              key={month.toISOString()}
              className={cn(
                "overflow-hidden transition-shadow hover:shadow-md cursor-pointer",
                isCurrentMonth && "ring-2 ring-primary"
              )}
              onClick={() => onDateSelect(month)}
              onDoubleClick={() => onMonthOpen?.(month)}
            >
              <CardHeader className="py-2 px-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={cn(
                      "text-xs font-medium",
                      isCurrentMonth && "text-primary"
                    )}
                  >
                    {format(month, "MMMM", { locale: dateLocale })}
                  </CardTitle>
                  {eventCount > 0 && (
                    <Badge
                      variant={isCurrentMonth ? "default" : "secondary"}
                      className="text-[10px] h-4 px-1.5"
                    >
                      {eventCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-1.5">
                {/* Compact weekday headers */}
                <div className="grid grid-cols-7 mb-0.5">
                  {weekdayLabels.map((label, idx) => (
                    <div
                      key={idx}
                      className="text-center text-[8px] text-muted-foreground font-medium"
                      onDoubleClick={(e) => {
                        // drill down to week view anchored to this month
                        e.stopPropagation();
                        onWeekOpen?.(month);
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Compact days grid */}
                <div className="grid grid-cols-7 gap-px">
                  {days.map((day, idx) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate[dayKey] || [];
                    const hasEvents = dayEvents.length > 0;
                    const isCurrentMonthDay = isSameMonth(day, month);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isSameDay(day, new Date());

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateSelect(day);
                        }}
                        onDoubleClick={(e) => {
                          // open day view (and prevent month drill-down)
                          onDateOpen?.(day);
                          e.stopPropagation();
                        }}
                        disabled={!isCurrentMonthDay}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded-sm text-[9px] relative",
                          "transition-colors focus:outline-none focus:ring-1 focus:ring-primary",
                          !isCurrentMonthDay && "text-muted-foreground/20 cursor-not-allowed",
                          isCurrentMonthDay && "hover:bg-muted",
                          isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                          isCurrentDay && !isSelected && "font-bold text-primary"
                        )}
                        aria-label={t("accessibility.selectDate", {
                          date: format(day, "d MMMM yyyy", { locale: dateLocale }),
                        })}
                      >
                        {format(day, "d")}
                        {hasEvents && isCurrentMonthDay && !isSelected && (
                          <div className="absolute bottom-0 w-0.5 h-0.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}







