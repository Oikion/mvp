"use client";

import { format, formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import Container from "../../components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckSquare,
  Bell,
  Clock,
  MapPin,
  AlertTriangle,
  Sun,
  Sunrise,
  CalendarDays,
  ChevronRight,
  Building2,
  User,
} from "lucide-react";
import { Link } from "@/navigation";

export interface UpcomingItem {
  id: string;
  type: "event" | "task" | "reminder";
  title: string;
  description?: string;
  datetime: string;
  endDatetime?: string;
  location?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  status?: string;
  linkedEntity?: {
    type: "property" | "client";
    id: string;
    name: string;
  };
  isOverdue?: boolean;
  isToday?: boolean;
  isTomorrow?: boolean;
  isThisWeek?: boolean;
}

interface FeedPageProps {
  upcomingItems: {
    today: UpcomingItem[];
    tomorrow: UpcomingItem[];
    thisWeek: UpcomingItem[];
    overdue: UpcomingItem[];
  };
  dict: any;
  locale: string;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case "event":
      return <Calendar className="h-4 w-4" />;
    case "task":
      return <CheckSquare className="h-4 w-4" />;
    case "reminder":
      return <Bell className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getItemColor = (type: string, isOverdue?: boolean) => {
  if (isOverdue) return "bg-red-500/10 text-red-500 border-red-500/20";
  
  switch (type) {
    case "event":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "task":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "reminder":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "HIGH":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "LOW":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

const getItemLink = (item: UpcomingItem) => {
  if (item.type === "event") return "/calendar";
  if (item.type === "task") return "/calendar"; // or tasks page
  return "#";
};

function UpcomingItemCard({ item, locale, t }: { item: UpcomingItem; locale: string; t: any }) {
  const dateLocale = locale === "el" ? el : enUS;
  const datetime = new Date(item.datetime);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className={`rounded-full p-2 shrink-0 ${getItemColor(item.type, item.isOverdue)}`}>
        {getItemIcon(item.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs capitalize">
                {t.types?.[item.type] || item.type}
              </Badge>
              {item.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </Badge>
              )}
              {item.isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t.overdue || "Overdue"}
                </Badge>
              )}
            </div>
            <Link href={getItemLink(item)} className="font-medium hover:text-primary transition-colors line-clamp-1">
              {item.title}
            </Link>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-medium">
              {format(datetime, "HH:mm", { locale: dateLocale })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(datetime, "MMM d", { locale: dateLocale })}
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{item.location}</span>
            </span>
          )}
          {item.linkedEntity && (
            <Link 
              href={item.linkedEntity.type === "property" 
                ? `/app/mls/properties/${item.linkedEntity.id}` 
                : `/app/crm/clients/${item.linkedEntity.id}`
              }
              className="flex items-center gap-1 hover:text-primary"
            >
              {item.linkedEntity.type === "property" ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="truncate max-w-[120px]">{item.linkedEntity.name}</span>
            </Link>
          )}
          {item.endDatetime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.datetime), "HH:mm")} - {format(new Date(item.endDatetime), "HH:mm")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ 
  title, 
  icon, 
  items, 
  locale, 
  t,
  variant = "default",
  emptyMessage,
}: { 
  title: string;
  icon: React.ReactNode;
  items: UpcomingItem[];
  locale: string;
  t: any;
  variant?: "default" | "warning" | "muted";
  emptyMessage?: string;
}) {
  const headerClasses = {
    default: "border-l-4 border-l-primary",
    warning: "border-l-4 border-l-red-500 bg-red-500/5",
    muted: "",
  };

  if (items.length === 0 && !emptyMessage) return null;

  return (
    <Card className={headerClasses[variant]}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => (
            <UpcomingItemCard key={item.id} item={item} locale={locale} t={t} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function FeedPage({ upcomingItems, dict, locale }: FeedPageProps) {
  const t = dict.feed || {};
  const { today, tomorrow, thisWeek, overdue } = upcomingItems;
  const totalItems = today.length + tomorrow.length + thisWeek.length + overdue.length;

  return (
    <Container
      title={t.title || "Upcoming"}
      description={t.description || "Your upcoming events, tasks, and reminders"}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-red-500/10 text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdue.length}</p>
                <p className="text-xs text-muted-foreground">{t.stats?.overdue || "Overdue"}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-purple-500/10 text-purple-500">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{today.length}</p>
                <p className="text-xs text-muted-foreground">{t.stats?.today || "Today"}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-blue-500/10 text-blue-500">
                <Sunrise className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tomorrow.length}</p>
                <p className="text-xs text-muted-foreground">{t.stats?.tomorrow || "Tomorrow"}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-emerald-500/10 text-emerald-500">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{thisWeek.length}</p>
                <p className="text-xs text-muted-foreground">{t.stats?.thisWeek || "This Week"}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty State */}
        {totalItems === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t.empty?.title || "All caught up!"}</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                {t.empty?.description || "You have no upcoming events, tasks, or reminders. Enjoy your free time!"}
              </p>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline">
                  <Link href="/app/calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t.empty?.viewCalendar || "View Calendar"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Overdue */}
            <SectionCard
              title={t.sections?.overdue || "Overdue"}
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              items={overdue}
              locale={locale}
              t={t}
              variant="warning"
            />

            {/* Today */}
            <SectionCard
              title={t.sections?.today || "Today"}
              icon={<Sun className="h-4 w-4 text-purple-500" />}
              items={today}
              locale={locale}
              t={t}
              emptyMessage={totalItems > 0 ? (t.sections?.noItemsToday || "Nothing scheduled for today") : undefined}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Tomorrow */}
            <SectionCard
              title={t.sections?.tomorrow || "Tomorrow"}
              icon={<Sunrise className="h-4 w-4 text-blue-500" />}
              items={tomorrow}
              locale={locale}
              t={t}
            />

            {/* This Week */}
            <SectionCard
              title={t.sections?.thisWeek || "Later This Week"}
              icon={<CalendarDays className="h-4 w-4 text-emerald-500" />}
              items={thisWeek}
              locale={locale}
              t={t}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t.quickActions?.description || "Need to schedule something?"}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t.quickActions?.calendar || "Calendar"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
