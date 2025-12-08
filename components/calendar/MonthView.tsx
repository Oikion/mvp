"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { EventActionsMenu } from "./EventActionsMenu";

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
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function MonthView({
  events,
  selectedDate,
  onDateSelect,
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

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth("prev")}
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
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b">
          {(locale === "el" 
            ? ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
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
                className={`min-h-[100px] border-r border-b last:border-r-0 p-1 ${
                  !isCurrentMonthDay ? "bg-muted/30" : ""
                } ${isSelectedDay ? "bg-primary/10" : ""} ${
                  isTodayDay ? "ring-2 ring-primary" : ""
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isTodayDay ? "text-primary font-bold" : ""
                  } ${!isCurrentMonthDay ? "text-muted-foreground" : ""}`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Card
                      key={event.id}
                      className="p-1.5 hover:shadow-sm transition-shadow cursor-pointer text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.eventId) {
                          router.push(`/calendar/events/${event.eventId}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
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
                      +{dayEvents.length - 3} more
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

