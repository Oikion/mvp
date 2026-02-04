"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Clock, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface EventListSidebarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  className?: string;
}

/**
 * Maps event type to display label and color
 */
const EVENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  PROPERTY_VIEWING: {
    label: "Viewing",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  CLIENT_CONSULTATION: {
    label: "Consultation",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  MEETING: {
    label: "Meeting",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  REMINDER: {
    label: "Reminder",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  TASK_DEADLINE: {
    label: "Deadline",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  OTHER: {
    label: "Other",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

/**
 * Event list sidebar component that displays events for the selected date
 * Clicking an event navigates to its detail page
 */
export function EventListSidebar({
  events,
  selectedDate,
  className,
}: EventListSidebarProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  // Filter events for the selected date and sort by start time
  const eventsForDay = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.startTime);
        return isSameDay(eventDate, selectedDate);
      })
      .sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
  }, [events, selectedDate]);

  /**
   * Navigate to event detail page
   */
  const handleEventClick = (event: CalendarEvent) => {
    if (event.eventId) {
      router.push(`/app/calendar/events/${event.eventId}`);
    }
  };

  /**
   * Get event type configuration for display
   */
  const getEventTypeConfig = (eventType?: string) => {
    if (!eventType) return EVENT_TYPE_CONFIG.OTHER;
    return EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.OTHER;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">
          {t("eventList.eventsForDay")}
        </h4>
        {eventsForDay.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {eventsForDay.length}
          </Badge>
        )}
      </div>

      {/* Event List */}
      {eventsForDay.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("eventList.noEventsForDay")}</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2 pr-2">
            {eventsForDay.map((event) => {
              const typeConfig = getEventTypeConfig(event.eventType);
              
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventClick(event)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    "hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                    event.eventId ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  {/* Event Title and Type Badge */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium line-clamp-2">
                      {event.title}
                    </span>
                    {event.eventType && (
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] shrink-0", typeConfig.className)}
                      >
                        {typeConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* Event Time */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(event.startTime), "HH:mm", { locale: dateLocale })}
                      {" - "}
                      {format(new Date(event.endTime), "HH:mm", { locale: dateLocale })}
                    </span>
                  </div>

                  {/* Event Location (if available) */}
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
