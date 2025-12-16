"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Bell,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

import { ViewSelector, CalendarViewMode } from "./ViewSelector";
import { CalendarFilters, CalendarFiltersState } from "./CalendarFilters";
import { EventCreateForm } from "./EventCreateForm";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { SemesterView } from "./SemesterView";
import { YearView } from "./YearView";
import { TaskEventCard } from "./TaskEventCard";
import { EventActionsMenu } from "./EventActionsMenu";
import { useCalendarEvents, useOrgUsers } from "@/hooks/swr";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
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

interface CalendarTask {
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

export function CalendarPageView() {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [activeTab, setActiveTab] = useState("myEvents");
  const [filters, setFilters] = useState<CalendarFiltersState>({});

  // Calculate date range for fetching events (dynamic based on view mode)
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (viewMode) {
      case "day":
        start.setMonth(now.getMonth() - 1);
        end.setMonth(now.getMonth() + 1);
        break;
      case "week":
        start.setMonth(now.getMonth() - 1);
        end.setMonth(now.getMonth() + 2);
        break;
      case "month":
        start.setMonth(now.getMonth() - 2);
        end.setMonth(now.getMonth() + 3);
        break;
      case "semester":
        start.setMonth(now.getMonth() - 6);
        end.setMonth(now.getMonth() + 6);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        end.setFullYear(now.getFullYear() + 1);
        break;
    }

    return { start, end };
  }, [viewMode]);

  // Fetch events and users
  const { events, tasks, isLoading, mutate } = useCalendarEvents({
    startTime: dateRange.start.toISOString(),
    endTime: dateRange.end.toISOString(),
    includeTasks: true,
  });

  const { users } = useOrgUsers();

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Event type filter
    if (filters.eventType) {
      result = result.filter((e) => e.eventType === filters.eventType);
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filters.dateRangePreset) {
      const now = new Date();
      let rangeStart: Date | undefined;
      let rangeEnd: Date | undefined;

      switch (filters.dateRangePreset) {
        case "today":
          rangeStart = startOfDay(now);
          rangeEnd = endOfDay(now);
          break;
        case "thisWeek":
          rangeStart = startOfWeek(now, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "thisMonth":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "custom":
          rangeStart = filters.customStartDate;
          rangeEnd = filters.customEndDate;
          break;
      }

      if (rangeStart && rangeEnd) {
        result = result.filter((e) => {
          const eventDate = new Date(e.startTime);
          return isWithinInterval(eventDate, { start: rangeStart!, end: rangeEnd! });
        });
      }
    }

    return result;
  }, [events, filters]);

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const next7Days = addDays(now, 7);

    const upcomingEvents = events.filter((e) => {
      const eventDate = new Date(e.startTime);
      return eventDate >= now && eventDate <= next7Days;
    }).length;

    const thisWeekEvents = events.filter((e) => {
      const eventDate = new Date(e.startTime);
      return eventDate >= now && eventDate <= weekEnd;
    }).length;

    // TODO: Implement pending invitations count when invitations are implemented
    const pendingInvitations = 0;

    return {
      upcoming: upcomingEvents,
      thisWeek: thisWeekEvents,
      pendingInvitations,
      total: events.length,
    };
  }, [events]);

  // Get events for selected day (day view)
  const getDayEvents = useCallback(() => {
    if (!selectedDate) return { events: [] as CalendarEvent[], tasks: [] as CalendarTask[] };

    const dayEvents = filteredEvents.filter((event) => {
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
  }, [selectedDate, filteredEvents, tasks]);

  const { events: dayEvents, tasks: dayTasks } = getDayEvents();

  // Handlers
  const handleEventUpdated = () => mutate();
  const handleEventDeleted = () => mutate();
  const handleEventCreated = () => mutate();

  const navigateToday = () => setSelectedDate(new Date());

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Render day view content
  const renderDayViewContent = () => (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Calendar sidebar */}
      <Card className="lg:w-[320px] flex-shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDay("prev")}
              aria-label={t("views.previousDay")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={navigateToday}>
              {t("views.today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDay("next")}
              aria-label={t("views.nextDay")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <MonthView
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventUpdated={handleEventUpdated}
            onEventDeleted={handleEventDeleted}
          />
        </CardContent>
      </Card>

      {/* Day events */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>
            {format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale })}
          </CardTitle>
          <CardDescription>
            {dayEvents.length + dayTasks.length > 0
              ? t("accessibility.eventCount", { count: dayEvents.length + dayTasks.length })
              : t("calendarView.noEventsOrTasks")}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[calc(100vh-450px)]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("calendarView.loading")}
            </div>
          ) : dayEvents.length === 0 && dayTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("empty.noEvents")}</p>
              <p className="text-sm mt-1">{t("empty.noEventsDescription")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (event.eventId) {
                      router.push(`/calendar/events/${event.eventId}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startTime), "HH:mm")} -{" "}
                            {format(new Date(event.endTime), "HH:mm")}
                          </Badge>
                          {event.location && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{event.location}</span>
                            </Badge>
                          )}
                          {event.eventType && (
                            <Badge variant="secondary">{event.eventType}</Badge>
                          )}
                        </div>
                      </div>
                      {event.eventId && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <EventActionsMenu
                            eventId={event.eventId}
                            event={event}
                            onEventUpdated={handleEventUpdated}
                            onEventDeleted={handleEventDeleted}
                          />
                        </div>
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

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("stats.upcomingEvents")}
          value={stats.upcoming.toString()}
          icon={<CalendarIcon className="h-4 w-4" />}
          description={t("stats.upcomingEventsDesc")}
          emptyMessage={t("stats.noUpcomingEvents")}
          actionLabel={t("stats.scheduleFirst")}
        />
        <StatsCard
          title={t("stats.thisWeek")}
          value={stats.thisWeek.toString()}
          icon={<CalendarDays className="h-4 w-4" />}
          description={t("stats.thisWeekDesc")}
        />
        <StatsCard
          title={t("stats.pendingInvitations")}
          value={stats.pendingInvitations.toString()}
          icon={<Bell className="h-4 w-4" />}
          description={t("stats.pendingInvitationsDesc")}
          emptyMessage={t("empty.noInvitations")}
        />
        <StatsCard
          title={t("stats.totalEvents")}
          value={stats.total.toString()}
          icon={<Users className="h-4 w-4" />}
          description={t("stats.totalEventsDesc")}
        />
      </div>

      {/* Calendar Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="myEvents" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.myEvents")}</span>
            </TabsTrigger>
            <TabsTrigger value="invited" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.invitedEvents")}</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.allEvents")}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            <ViewSelector value={viewMode} onChange={setViewMode} />
            <EventCreateForm onSuccess={handleEventCreated} />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-3">
            <CalendarFilters
              filters={filters}
              onFiltersChange={setFilters}
              users={users}
            />
          </CardContent>
        </Card>

        {/* Calendar Views */}
        <TabsContent value="myEvents" className="mt-0">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {viewMode === "day" && renderDayViewContent()}
              {viewMode === "week" && (
                <WeekView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "semester" && (
                <SemesterView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "year" && (
                <YearView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invited" className="mt-0">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("empty.noInvitations")}</p>
              <p className="text-sm mt-1">{t("empty.noInvitationsDescription")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {viewMode === "day" && renderDayViewContent()}
              {viewMode === "week" && (
                <WeekView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "semester" && (
                <SemesterView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "year" && (
                <YearView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

