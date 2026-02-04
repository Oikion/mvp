"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getMonth,
  setMonth,
  getYear,
  setYear,
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

interface SemesterViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthOpen?: (month: Date) => void;
  onDateOpen?: (date: Date) => void;
  onWeekOpen?: (anchorDate: Date) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function SemesterView({
  events,
  selectedDate,
  onDateSelect,
  onMonthOpen,
  onDateOpen,
  onWeekOpen,
  onEventUpdated,
  onEventDeleted,
}: SemesterViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  // Determine which semester we're in (first: Jan-Jun, second: Jul-Dec)
  const currentMonth = getMonth(selectedDate);
  const isFirstSemester = currentMonth < 6;
  const semesterStartMonth = isFirstSemester ? 0 : 6;
  const year = getYear(selectedDate);

  // Generate 6 months for the semester
  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = setMonth(setYear(new Date(), year), semesterStartMonth + i);
      result.push(monthDate);
    }
    return result;
  }, [year, semesterStartMonth]);

  const navigateSemester = (direction: "prev" | "next") => {
    const newDate = direction === "next" 
      ? addMonths(selectedDate, 6) 
      : subMonths(selectedDate, 6);
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

  const weekdayLabels = locale === "el"
    ? ["Κ", "Δ", "Τ", "Τ", "Π", "Π", "Σ"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  const semesterLabel = isFirstSemester 
    ? t("semesterView.firstHalf") 
    : t("semesterView.secondHalf");

  return (
    <div className="space-y-4">
      {/* Semester Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateSemester("prev")}
          aria-label={t("views.previousSemester")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {year} • {semesterLabel}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateSemester("next")}
          aria-label={t("views.nextSemester")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Months Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart);
          const calendarEnd = endOfWeek(monthEnd);
          const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          const eventCount = getEventsForMonth(month);

          return (
            <Card
              key={month.toISOString()}
              className="overflow-hidden"
              onDoubleClick={() => onMonthOpen?.(month)}
            >
              <CardHeader className="py-3 px-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {format(month, "MMMM", { locale: dateLocale })}
                  </CardTitle>
                  {eventCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {eventCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {weekdayLabels.map((label, idx) => (
                    <div
                      key={idx}
                      className="text-center text-[10px] text-muted-foreground font-medium py-1"
                      onDoubleClick={() => onWeekOpen?.(month)}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((day, idx) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate[dayKey] || [];
                    const hasEvents = dayEvents.length > 0;
                    const isCurrentMonth = isSameMonth(day, month);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isSameDay(day, new Date());

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onDateSelect(day)}
                        onDoubleClick={(e) => {
                          // open day view (and prevent month drill-down)
                          onDateOpen?.(day);
                          e.stopPropagation();
                        }}
                        disabled={!isCurrentMonth}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-sm text-xs relative",
                          "transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                          !isCurrentMonth && "text-muted-foreground/30 cursor-not-allowed",
                          isCurrentMonth && "hover:bg-muted cursor-pointer",
                          isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                          isCurrentDay && !isSelected && "ring-1 ring-primary"
                        )}
                        aria-label={t("accessibility.selectDate", {
                          date: format(day, "d MMMM yyyy", { locale: dateLocale }),
                        })}
                        aria-selected={isSelected}
                      >
                        <span>{format(day, "d")}</span>
                        {hasEvents && isCurrentMonth && !isSelected && (
                          <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
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

      {/* Semester Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="text-center text-sm text-muted-foreground">
            {t("semesterView.eventsInPeriod", {
              count: events.filter((e) => {
                const eventDate = new Date(e.startTime);
                const eventMonth = getMonth(eventDate);
                const eventYear = getYear(eventDate);
                return (
                  eventYear === year &&
                  eventMonth >= semesterStartMonth &&
                  eventMonth < semesterStartMonth + 6
                );
              }).length,
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}







