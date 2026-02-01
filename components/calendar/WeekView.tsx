"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  addMinutes,
} from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { EventActionsMenu } from "./EventActionsMenu";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  snapPixelsToTime,
  getEventPosition,
  timeToPixels,
  createDateWithTime,
} from "./calendar-utils";

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
  onCreateEvent?: (startTime: Date, endTime: Date) => void;
  draftStartTime?: Date | null;
  draftEndTime?: Date | null;
  onDraftSelectionClick?: () => void;
}

const START_HOUR = DEFAULT_START_HOUR;
const END_HOUR = DEFAULT_END_HOUR;
const MIN_CREATE_MINUTES = 15;

type CreateDragState = {
  day: Date;
  startY: number;
  startTime: Date;
  endTime: Date;
};

export function WeekView({
  events,
  selectedDate,
  onDateSelect,
  onWeekChange,
  onEventUpdated,
  onEventDeleted,
  onCreateEvent,
  draftStartTime,
  draftEndTime,
  onDraftSelectionClick,
}: WeekViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const createPointerIdRef = useRef<number | null>(null);
  const createColumnRectRef = useRef<DOMRect | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = eachHourOfInterval({
    start: setHours(startOfDay(selectedDate), START_HOUR),
    end: setHours(startOfDay(selectedDate), END_HOUR),
  });

  // Prevent browser text/element selection while dragging.
  useEffect(() => {
    if (!isDragging) return;
    const body = document.body;
    const prevUserSelect = body.style.userSelect;
    const prevWebkitUserSelect = (body.style as unknown as { WebkitUserSelect?: string })
      .WebkitUserSelect;
    const prevCursor = body.style.cursor;

    body.style.userSelect = "none";
    (body.style as unknown as { WebkitUserSelect?: string }).WebkitUserSelect = "none";
    body.style.cursor = "grabbing";

    return () => {
      body.style.userSelect = prevUserSelect;
      (body.style as unknown as { WebkitUserSelect?: string }).WebkitUserSelect =
        prevWebkitUserSelect ?? "";
      body.style.cursor = prevCursor;
    };
  }, [isDragging]);

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

  const getEventPositionForDay = (event: CalendarEvent, day: Date) => {
    return getEventPosition(
      new Date(event.startTime),
      new Date(event.endTime),
      START_HOUR,
      END_HOUR
    );
  };

  const weekdayLabels = locale === "el"
    ? ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handleDayColumnPointerDown = useCallback(
    (day: Date, e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".event-card")) return;
      e.preventDefault();

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      createColumnRectRef.current = rect;
      createPointerIdRef.current = e.pointerId;

      const rawY = e.clientY - rect.top;
      const y = Math.max(0, Math.min(rect.height, rawY));
      const { hours, minutes } = snapPixelsToTime(y, START_HOUR);
      const startTime = createDateWithTime(day, hours, minutes);

      setCreateDrag({
        day,
        startY: y,
        startTime,
        endTime: addMinutes(startTime, MIN_CREATE_MINUTES),
      });
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!createDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;
      const rect = createColumnRectRef.current;
      if (!rect) return;

      const rawY = e.clientY - rect.top;
      const y = Math.max(0, Math.min(rect.height, rawY));

      const startY = Math.min(createDrag.startY, y);
      const endY = Math.max(createDrag.startY, y);

      const { hours: startH, minutes: startM } = snapPixelsToTime(startY, START_HOUR);
      const { hours: endH, minutes: endM } = snapPixelsToTime(endY, START_HOUR);

      const startTime = createDateWithTime(createDrag.day, startH, startM);
      let endTime = createDateWithTime(createDrag.day, endH, endM);
      if (endTime <= startTime) {
        endTime = addMinutes(startTime, MIN_CREATE_MINUTES);
      }

      setCreateDrag((prev) =>
        prev
          ? {
              ...prev,
              startTime,
              endTime,
            }
          : prev
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;
      if (onCreateEvent) {
        onCreateEvent(createDrag.startTime, createDrag.endTime);
      }
      createPointerIdRef.current = null;
      createColumnRectRef.current = null;
      setCreateDrag(null);
      setIsDragging(false);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;
      createPointerIdRef.current = null;
      createColumnRectRef.current = null;
      setCreateDrag(null);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [createDrag, onCreateEvent]);

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
                <div
                  key={dayIdx}
                  className="relative border-r last:border-r-0 select-none touch-none"
                  onPointerDown={(e) => handleDayColumnPointerDown(day, e)}
                >
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

                  {/* Drag preview for creating */}
                  {createDrag && isSameDay(createDrag.day, day) && (
                    <div
                      className="absolute left-1 right-1 bg-primary/20 border-2 border-dashed border-primary rounded z-20 transition-all duration-75"
                      style={{
                        top: `${timeToPixels(
                          createDrag.startTime.getHours(),
                          createDrag.startTime.getMinutes(),
                          START_HOUR
                        )}px`,
                        height: `${Math.max(
                          30,
                          timeToPixels(
                            createDrag.endTime.getHours(),
                            createDrag.endTime.getMinutes(),
                            START_HOUR
                          ) -
                            timeToPixels(
                              createDrag.startTime.getHours(),
                              createDrag.startTime.getMinutes(),
                              START_HOUR
                            )
                        )}px`,
                      }}
                    >
                      <div className="p-2 text-xs text-primary font-medium">
                        {format(createDrag.startTime, "HH:mm")} - {format(createDrag.endTime, "HH:mm")}
                      </div>
                    </div>
                  )}

                  {/* Draft selection (persists after form closes) */}
                  {draftStartTime &&
                    draftEndTime &&
                    isSameDay(draftStartTime, day) &&
                    isSameDay(draftEndTime, day) && (
                      <Card
                        className={cn(
                          "event-card absolute left-1 right-1 p-2 overflow-hidden cursor-pointer z-20",
                          "bg-primary/10 border-primary/40 border-2 border-dashed",
                          "select-none touch-none"
                        )}
                        style={{
                          top: `${getEventPosition(draftStartTime, draftEndTime, START_HOUR, END_HOUR).top}px`,
                          height: `${getEventPosition(draftStartTime, draftEndTime, START_HOUR, END_HOUR).height}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDraftSelectionClick?.();
                        }}
                      >
                        <div className="text-xs font-medium text-primary">
                          {format(draftStartTime, "HH:mm")} - {format(draftEndTime, "HH:mm")}
                        </div>
                      </Card>
                    )}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPositionForDay(event, day);
                    const startHour = new Date(event.startTime).getHours();
                    
                    // Only show events within the visible hours
                    if (startHour < START_HOUR || startHour > END_HOUR) return null;

                    return (
                      <Card
                        key={event.id}
                        className={cn(
                          "event-card absolute left-1 right-1 p-1.5 overflow-hidden cursor-pointer",
                          "hover:shadow-md transition-shadow z-10",
                          "bg-primary/10 border-primary/30 border-l-4 border-l-primary",
                          "select-none touch-none"
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        onClick={() => {
                          if (event.eventId) {
                            router.push(`/app/calendar/events/${event.eventId}`);
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





