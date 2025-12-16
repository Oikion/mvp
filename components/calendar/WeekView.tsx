"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  setHours,
} from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { EventActionsMenu } from "./EventActionsMenu";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

interface WeekViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange?: (date: Date) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6;
const END_HOUR = 22;

export function WeekView({
  events,
  selectedDate,
  onDateSelect,
  onWeekChange,
  onEventUpdated,
  onEventDeleted,
}: WeekViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = eachHourOfInterval({
    start: setHours(startOfDay(selectedDate), START_HOUR),
    end: setHours(startOfDay(selectedDate), END_HOUR),
  });

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = direction === "next" 
      ? addWeeks(selectedDate, 1) 
      : subWeeks(selectedDate, 1);
    onDateSelect(newDate);
    onWeekChange?.(newDate);
  };

  const eventsByDayAndHour = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      const eventStart = new Date(event.startTime);
      const dayKey = format(eventStart, "yyyy-MM-dd");
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });

    return grouped;
  }, [events]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dayKey = format(day, "yyyy-MM-dd");
    return eventsByDayAndHour[dayKey] || [];
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    
    const top = Math.max(0, (startHour - START_HOUR) * HOUR_HEIGHT);
    const height = Math.max(30, (endHour - startHour) * HOUR_HEIGHT);
    
    return { top, height };
  };

  const weekdayLabels = locale === "el"
    ? ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col h-full">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateWeek("prev")}
          aria-label={t("views.previousWeek")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {t("weekView.weekOf", { 
            date: format(weekStart, "d MMM yyyy", { locale: dateLocale }) 
          })}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateWeek("next")}
          aria-label={t("views.nextWeek")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="border rounded-lg flex-1 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b bg-muted/50">
          {/* Time column header */}
          <div className="p-2 text-center text-sm font-medium text-muted-foreground border-r w-16">
            {/* Empty */}
          </div>
          {/* Day columns */}
          {days.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                "p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/70 transition-colors",
                isToday(day) && "bg-primary/10",
                isSameDay(day, selectedDate) && "bg-primary/20"
              )}
              onClick={() => onDateSelect(day)}
              role="button"
              aria-label={t("accessibility.selectDate", { 
                date: format(day, "EEEE, d MMMM", { locale: dateLocale }) 
              })}
            >
              <div className="text-xs text-muted-foreground">{weekdayLabels[idx]}</div>
              <div
                className={cn(
                  "text-lg font-semibold mt-0.5",
                  isToday(day) && "text-primary"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
          <div className="grid grid-cols-8 relative">
            {/* Time labels column */}
            <div className="border-r w-16">
              {hours.map((hour) => (
                <div
                  key={hour.toISOString()}
                  className="h-[60px] border-b text-xs text-muted-foreground p-1 text-right pr-2"
                >
                  {format(hour, "HH:mm")}
                </div>
              ))}
            </div>

            {/* Day columns with events */}
            {days.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              
              return (
                <div key={dayIdx} className="relative border-r last:border-r-0">
                  {/* Hour grid lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour.toISOString()}
                      className={cn(
                        "h-[60px] border-b",
                        isToday(day) && "bg-primary/5"
                      )}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event);
                    const startHour = new Date(event.startTime).getHours();
                    
                    // Only show events within the visible hours
                    if (startHour < START_HOUR || startHour > END_HOUR) return null;

                    return (
                      <Card
                        key={event.id}
                        className={cn(
                          "absolute left-1 right-1 p-1.5 overflow-hidden cursor-pointer",
                          "hover:shadow-md transition-shadow z-10",
                          "bg-primary/10 border-primary/30 border-l-4 border-l-primary"
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        onClick={() => {
                          if (event.eventId) {
                            router.push(`/calendar/events/${event.eventId}`);
                          }
                        }}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-medium truncate flex-1">
                              {event.title}
                            </span>
                            {event.eventId && height > 40 && (
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
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              {format(new Date(event.startTime), "HH:mm")}
                            </span>
                          </div>
                          {height > 60 && event.location && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}

