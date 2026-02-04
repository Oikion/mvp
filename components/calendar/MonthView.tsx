"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { EventActionsMenu } from "./EventActionsMenu";
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

interface MonthViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateOpen?: (date: Date) => void;
  onWeekOpen?: (anchorDate: Date) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function MonthView({
  events,
  selectedDate,
  onDateSelect,
  onDateOpen,
  onWeekOpen,
  onEventUpdated,
  onEventDeleted,
}: MonthViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const getEventsForDay = (day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    return eventsByDate[dayKey] || [];
  };

  const isToday = (day: Date) => isSameDay(day, new Date());
  const isSelected = (day: Date) => selectedDate && isSameDay(day, selectedDate);
  const isCurrentMonth = (day: Date) => isSameMonth(day, currentMonth);

  const weekdayLabels = locale === "el"
    ? ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4" role="region" aria-label={t("accessibility.calendarNavigation")}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth("prev")}
          aria-label={t("views.previousMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth("next")}
          aria-label={t("views.nextMonth")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg" role="grid" aria-label={t("accessibility.eventList")}>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50" role="row">
          {weekdayLabels.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
              onDoubleClick={() => onWeekOpen?.(selectedDate)}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonthDay = isCurrentMonth(day);
            const isSelectedDay = isSelected(day);
            const isTodayDay = isToday(day);

            return (
              <div
                key={idx}
                onClick={() => onDateSelect(day)}
                onDoubleClick={() => onDateOpen?.(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDateSelect(day);
                  }
                }}
                className={cn(
                  "min-h-[100px] md:min-h-[120px] border-r border-b last:border-r-0 p-1 text-left transition-colors cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                  !isCurrentMonthDay && "bg-muted/30",
                  isSelectedDay && "bg-primary/10",
                  isTodayDay && "ring-2 ring-primary ring-inset",
                  isCurrentMonthDay && "hover:bg-muted/50"
                )}
                role="gridcell"
                aria-label={t("accessibility.selectDate", {
                  date: format(day, "d MMMM yyyy", { locale: dateLocale }),
                })}
                aria-selected={isSelectedDay}
                tabIndex={isCurrentMonthDay ? 0 : -1}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isTodayDay && "text-primary font-bold",
                    !isCurrentMonthDay && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1 max-h-[60px] md:max-h-[80px] overflow-y-auto">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Card
                      key={event.id}
                      className={cn(
                        "p-1.5 hover:shadow-sm transition-shadow cursor-pointer text-xs",
                        "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.eventId) {
                          router.push(`/app/calendar/events/${event.eventId}`);
                        }
                      }}
                      onDoubleClick={(e) => {
                        // prevent day drill-down from double-clicking an event card
                        e.stopPropagation();
                      }}
                      aria-label={t("accessibility.eventCard", { title: event.title })}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span className="truncate">
                              {format(new Date(event.startTime), "HH:mm")}
                            </span>
                          </div>
                        </div>
                        {event.eventId && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <EventActionsMenu
                              eventId={event.eventId}
                              event={event}
                              onEventUpdated={onEventUpdated}
                              onEventDeleted={onEventDeleted}
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      {t("calendarView.moreEvents", { count: dayEvents.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

