"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { EventCreateForm } from "./EventCreateForm";
import { TaskEventCard } from "./TaskEventCard";
import { useTranslations } from "next-intl";

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
}

interface Task {
  id: string;
  title: string;
  content?: string | null;
  dueDateAt: string;
  priority: string;
  assigned_user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  crm_accounts?: {
    id: string;
    client_name: string;
  } | null;
  calcomEventId?: string | null;
}

export function CalendarView() {
  const t = useTranslations("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 3);

      const response = await fetch(
        `/api/calendar/events?startTime=${start.toISOString()}&endTime=${end.toISOString()}&includeTasks=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.events || []);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <Card className="flex-1 lg:max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {t("calendarView.title")}
            </CardTitle>
            <EventCreateForm onSuccess={fetchEvents} />
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
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
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event.description && (
                      <p className="text-sm text-muted-foreground">
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

