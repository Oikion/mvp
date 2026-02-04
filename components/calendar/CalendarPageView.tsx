"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { EventCreateForm, EventCreateTrigger, EventCreateSidePanel } from "./EventCreateForm";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { SemesterView } from "./SemesterView";
import { YearView } from "./YearView";
import { TaskEventCard } from "./TaskEventCard";
import { EventActionsMenu } from "./EventActionsMenu";
import { MiniMonthCalendar } from "./MiniMonthCalendar";
import { DayHourView } from "./DayHourView";
import { EventListSidebar } from "./EventListSidebar";
import { useCalendarEvents, useOrgUsers, useClients, useProperties } from "@/hooks/swr";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/export";

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
  calendarEventId?: string | null;
}

const CALENDAR_VIEWMODE_STORAGE_KEY = "oikion.calendar.viewMode";
const CALENDAR_SELECTED_DATE_STORAGE_KEY = "oikion.calendar.selectedDate";

function isCalendarViewMode(value: string | null): value is CalendarViewMode {
  return value === "day" || value === "week" || value === "month" || value === "semester" || value === "year";
}

function parseLocalYyyyMmDd(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function CalendarPageView() {
  const t = useTranslations("calendar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [activeTab, setActiveTab] = useState("myEvents");
  const [filters, setFilters] = useState<CalendarFiltersState>({});
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createEventStartTime, setCreateEventStartTime] = useState<Date | null>(null);
  const [createEventEndTime, setCreateEventEndTime] = useState<Date | null>(null);
  const didInitViewModeRef = useRef(false);
  const didInitSelectedDateRef = useRef(false);

  const handleCreateEventOpenChange = useCallback((open: boolean) => {
    setCreateEventOpen(open);
  }, []);

  // Initialize viewMode from URL (?view=day) with localStorage fallback.
  useEffect(() => {
    const urlView = searchParams.get("view");
    if (isCalendarViewMode(urlView)) {
      setViewMode(urlView);
      didInitViewModeRef.current = true;
      return;
    }

    try {
      const stored = window.localStorage.getItem(CALENDAR_VIEWMODE_STORAGE_KEY);
      if (isCalendarViewMode(stored)) {
        setViewMode(stored);
      }
    } catch {
      // ignore storage errors
    } finally {
      didInitViewModeRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize selectedDate from URL (?date=YYYY-MM-DD) with localStorage fallback.
  useEffect(() => {
    const urlDate = searchParams.get("date");
    const parsedUrlDate = parseLocalYyyyMmDd(urlDate);
    if (parsedUrlDate) {
      setSelectedDate(parsedUrlDate);
      didInitSelectedDateRef.current = true;
      return;
    }

    try {
      const stored = window.localStorage.getItem(CALENDAR_SELECTED_DATE_STORAGE_KEY);
      const parsedStoredDate = parseLocalYyyyMmDd(stored);
      if (parsedStoredDate) {
        setSelectedDate(parsedStoredDate);
      }
    } catch {
      // ignore storage errors
    } finally {
      didInitSelectedDateRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist viewMode to URL + localStorage so it survives refresh/navigation.
  useEffect(() => {
    if (!didInitViewModeRef.current) return;

    try {
      window.localStorage.setItem(CALENDAR_VIEWMODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore storage errors
    }

    const current = searchParams.get("view");
    if (current === viewMode) return;

    const next = new URLSearchParams(searchParams.toString());
    next.set("view", viewMode);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, viewMode]);

  // Persist selectedDate to URL + localStorage so it survives refresh/navigation.
  useEffect(() => {
    if (!didInitSelectedDateRef.current) return;

    const dateParam = format(selectedDate, "yyyy-MM-dd");
    try {
      window.localStorage.setItem(CALENDAR_SELECTED_DATE_STORAGE_KEY, dateParam);
    } catch {
      // ignore storage errors
    }

    const current = searchParams.get("date");
    if (current === dateParam) return;

    const next = new URLSearchParams(searchParams.toString());
    next.set("date", dateParam);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedDate]);

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

  // Prefetch selector data so dropdowns open instantly
  useClients();
  useProperties();

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
  const handleEventCreated = () => {
    mutate();
    setCreateEventOpen(false);
    setCreateEventStartTime(null);
    setCreateEventEndTime(null);
  };

  const handleEventMove = useCallback(async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      const { useUpdateEvent } = await import("@/hooks/swr");
      // We need to get the event first to preserve other fields
      const event = events.find((e) => e.eventId === eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      // Use dynamic import to avoid circular dependencies
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      mutate();
    } catch (error) {
      console.error("Failed to move event:", error);
      throw error;
    }
  }, [events, mutate]);

  const handleEventResize = useCallback(async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      const event = events.find((e) => e.eventId === eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      mutate();
    } catch (error) {
      console.error("Failed to resize event:", error);
      throw error;
    }
  }, [events, mutate]);

  const navigateToday = () => setSelectedDate(new Date());

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleCreateEventFromDrag = useCallback((startTime: Date, endTime: Date) => {
    setCreateEventStartTime(startTime);
    setCreateEventEndTime(endTime);
    setCreateEventOpen(true);
  }, []);

  const handleDraftSelectionChange = useCallback((startTime: Date, endTime: Date) => {
    setCreateEventStartTime(startTime);
    setCreateEventEndTime(endTime);
  }, []);

  const handleDraftSelectionClick = useCallback(() => {
    setCreateEventOpen(true);
  }, []);

  // Render day view content with mini calendar and hour view
  const renderDayViewContent = () => (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Mini Calendar sidebar */}
      <Card className="lg:w-[280px] flex-shrink-0">
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
        <CardContent className="space-y-4">
          <MiniMonthCalendar
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          <Separator />
          <EventListSidebar
            events={filteredEvents}
            selectedDate={selectedDate}
          />
        </CardContent>
      </Card>

      {/* Day hour view */}
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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("calendarView.loading")}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row min-h-[500px]">
              <div className="flex-1 min-w-0">
                <DayHourView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                  onCreateEvent={handleCreateEventFromDrag}
                  onEventMove={handleEventMove}
                  onEventResize={handleEventResize}
                  draftStartTime={createEventStartTime}
                  draftEndTime={createEventEndTime}
                  onDraftSelectionChange={handleDraftSelectionChange}
                  onDraftSelectionClick={handleDraftSelectionClick}
                />
              </div>

              {createEventOpen && (
                <EventCreateSidePanel
                  open={createEventOpen}
                  onOpenChange={handleCreateEventOpenChange}
                  onSuccess={handleEventCreated}
                  defaultStartTime={createEventStartTime}
                  defaultEndTime={createEventEndTime}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <TabsList className="inline-grid grid-cols-3">
            <TabsTrigger value="myEvents">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              {t("tabs.myEvents")}
            </TabsTrigger>
            <TabsTrigger value="invited">
              <Users className="h-4 w-4 shrink-0" />
              {t("tabs.invitedEvents")}
            </TabsTrigger>
            <TabsTrigger value="all">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {t("tabs.allEvents")}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            <ViewSelector value={viewMode} onChange={setViewMode} />
            <ExportButton
              module="calendar"
              calendarViewOptions
              filters={{
                eventType: filters.eventType ? [filters.eventType] : undefined,
                startDate: dateRange.start.toISOString().split("T")[0],
                endDate: dateRange.end.toISOString().split("T")[0],
                month: format(selectedDate, "yyyy-MM"),
              }}
            />
            <EventCreateTrigger onClick={() => setCreateEventOpen(true)} />
          </div>
          
          {viewMode !== "day" && (
            <EventCreateForm
              open={createEventOpen}
              onOpenChange={handleCreateEventOpenChange}
              onSuccess={handleEventCreated}
              defaultStartTime={createEventStartTime}
              defaultEndTime={createEventEndTime}
            />
          )}
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
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                  {/* Mini Calendar sidebar for week view */}
                  <Card className="lg:w-[280px] flex-shrink-0">
                    <CardContent className="pt-6 space-y-4">
                      <MiniMonthCalendar
                        events={filteredEvents}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                      />
                      <Separator />
                      <EventListSidebar
                        events={filteredEvents}
                        selectedDate={selectedDate}
                      />
                    </CardContent>
                  </Card>
                  {/* Week view */}
                  <div className="flex-1">
                    <WeekView
                      events={filteredEvents}
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      onEventUpdated={handleEventUpdated}
                      onEventDeleted={handleEventDeleted}
                      onCreateEvent={handleCreateEventFromDrag}
                      draftStartTime={createEventStartTime}
                      draftEndTime={createEventEndTime}
                      onDraftSelectionClick={() => setCreateEventOpen(true)}
                    />
                  </div>
                </div>
              )}
              {viewMode === "month" && (
                <MonthView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "semester" && (
                <SemesterView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onMonthOpen={(month) => {
                    setSelectedDate(month);
                    setViewMode("month");
                  }}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "year" && (
                <YearView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onMonthOpen={(month) => {
                    setSelectedDate(month);
                    setViewMode("month");
                  }}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
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
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                  {/* Mini Calendar sidebar for week view */}
                  <Card className="lg:w-[280px] flex-shrink-0">
                    <CardContent className="pt-6 space-y-4">
                      <MiniMonthCalendar
                        events={filteredEvents}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                      />
                      <Separator />
                      <EventListSidebar
                        events={filteredEvents}
                        selectedDate={selectedDate}
                      />
                    </CardContent>
                  </Card>
                  {/* Week view */}
                  <div className="flex-1">
                    <WeekView
                      events={filteredEvents}
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      onEventUpdated={handleEventUpdated}
                      onEventDeleted={handleEventDeleted}
                      onCreateEvent={handleCreateEventFromDrag}
                      draftStartTime={createEventStartTime}
                      draftEndTime={createEventEndTime}
                      onDraftSelectionClick={() => setCreateEventOpen(true)}
                    />
                  </div>
                </div>
              )}
              {viewMode === "month" && (
                <MonthView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "semester" && (
                <SemesterView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onMonthOpen={(month) => {
                    setSelectedDate(month);
                    setViewMode("month");
                  }}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
                  onEventUpdated={handleEventUpdated}
                  onEventDeleted={handleEventDeleted}
                />
              )}
              {viewMode === "year" && (
                <YearView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onMonthOpen={(month) => {
                    setSelectedDate(month);
                    setViewMode("month");
                  }}
                  onDateOpen={(date) => {
                    setSelectedDate(date);
                    setViewMode("day");
                  }}
                  onWeekOpen={(anchorDate) => {
                    setSelectedDate(anchorDate);
                    setViewMode("week");
                  }}
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





