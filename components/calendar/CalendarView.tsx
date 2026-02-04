"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { EventCreateForm } from "./EventCreateForm";
import { TaskEventCard } from "./TaskEventCard";
import { EventActionsMenu } from "./EventActionsMenu";
import { MonthView } from "./MonthView";
import { useTranslations, useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarEvents } from "@/hooks/swr";

type ViewMode = "day" | "month";

export function CalendarView() {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Calculate date range for fetching events (1 month ago to 3 months ahead)
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return { start, end };
  }, []);

  // Use SWR for calendar events
  const { events, tasks, isLoading, mutate } = useCalendarEvents({
    startTime: dateRange.start.toISOString(),
    endTime: dateRange.end.toISOString(),
    includeTasks: true,
  });

  const getDayEvents = () => {
    if (!selectedDate) return { events: [], tasks: [] };

    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    const dayTasks = tasks.filter((task) => {
      const taskDate = new Date(task.dueDateAt);
      return (
        taskDate.getDate() === selectedDate.getDate() &&
        taskDate.getMonth() === selectedDate.getMonth() &&
        taskDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    return { events: dayEvents, tasks: dayTasks };
  };

  const { events: dayEvents, tasks: dayTasks } = getDayEvents();

  const handleEventUpdated = () => {
    mutate();
  };

  const handleEventDeleted = () => {
    mutate();
  };

  const handleEventCreated = () => {
    mutate();
  };

  if (viewMode === "month") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {t("calendarView.title")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">
                      {t("calendarView.dayView")}
                    </SelectItem>
                    <SelectItem value="month">
                      {t("calendarView.monthView")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <EventCreateForm 
                  open={isCreateEventOpen} 
                  onOpenChange={setIsCreateEventOpen} 
                  onSuccess={handleEventCreated} 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MonthView
              events={events}
              selectedDate={selectedDate || new Date()}
              onDateSelect={setSelectedDate}
              onEventUpdated={handleEventUpdated}
              onEventDeleted={handleEventDeleted}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full w-full">
      <Card className="w-fit h-fit">
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {t("calendarView.title")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">
                    {t("calendarView.dayView")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("calendarView.monthView")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <EventCreateForm 
                open={isCreateEventOpen} 
                onOpenChange={setIsCreateEventOpen} 
                onSuccess={handleEventCreated} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            locale={dateLocale}
          />
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col w-full">
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale })
              : t("calendarView.selectDate")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {t("calendarView.loading")}
            </div>
          )}
          {!isLoading && dayEvents.length === 0 && dayTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t("calendarView.noEventsOrTasks")}
            </div>
          )}
          {!isLoading && (dayEvents.length > 0 || dayTasks.length > 0) && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {dayEvents.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle 
                        className="text-base cursor-pointer flex-1"
                        onClick={() => {
                          if (event.eventId) {
                            router.push(`/app/calendar/events/${event.eventId}`);
                          }
                        }}
                      >
                        {event.title}
                      </CardTitle>
                      {event.eventId && (
                        <EventActionsMenu
                          eventId={event.eventId}
                          event={event}
                          onEventUpdated={handleEventUpdated}
                          onEventDeleted={handleEventDeleted}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.startTime), "HH:mm")} -{" "}
                        {format(new Date(event.endTime), "HH:mm")}
                      </Badge>
                      {event.location && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </Badge>
                      )}
                      {event.eventType && (
                        <Badge variant="outline">{event.eventType}</Badge>
                      )}
                      {event.status && (
                        <Badge variant="secondary">{event.status}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dayTasks.map((task) => (
                <TaskEventCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
