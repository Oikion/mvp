"use client";

import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations } from "next-intl";
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
    type: "property" | "contact";
    id: string;
    friendlyId: string;
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
  locale: string;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case "event":
      return <Calendar className="h-4 w-4" aria-hidden="true" />;
    case "task":
      return <CheckSquare className="h-4 w-4" aria-hidden="true" />;
    case "reminder":
      return <Bell className="h-4 w-4" aria-hidden="true" />;
    default:
      return <Calendar className="h-4 w-4" aria-hidden="true" />;
  }
};

const getItemColorClasses = (type: string, isOverdue?: boolean) => {
  if (isOverdue) return "bg-destructive/10 text-destructive border-destructive/20";

  switch (type) {
    case "event":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "task":
      return "bg-primary/10 text-primary border-primary/20";
    case "reminder":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getPriorityColorClasses = (priority?: string) => {
  switch (priority) {
    case "HIGH":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "MEDIUM":
      return "bg-warning/10 text-warning border-warning/30";
    case "LOW":
      return "bg-success/10 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getItemLink = (item: UpcomingItem) => {
  if (item.type === "event" || item.type === "task") return "/calendar";
  return "#";
};

function UpcomingItemCard({ item, locale }: { item: UpcomingItem; locale: string }) {
  const t = useTranslations("feed");
  const dateLocale = locale === "el" ? el : enUS;
  const datetime = new Date(item.datetime);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* Type icon */}
      <div
        className={`rounded-full p-2 shrink-0 ${getItemColorClasses(item.type, item.isOverdue)}`}
        aria-hidden="true"
      >
        {getItemIcon(item.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs capitalize">
                {t(`types.${item.type}` as "types.event" | "types.task" | "types.reminder")}
              </Badge>
              {item.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColorClasses(item.priority)}`}>
                  {t(`priority.${item.priority}` as "priority.HIGH" | "priority.MEDIUM" | "priority.LOW")}
                </Badge>
              )}
              {item.isOverdue && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {t("overdue")}
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
            <div className="text-sm font-medium tabular-nums">
              {format(datetime, "HH:mm", { locale: dateLocale })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(datetime, "MMM d", { locale: dateLocale })}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{item.location}</span>
            </span>
          )}
          {item.linkedEntity && (
            <Link
              href={
                item.linkedEntity.type === "property"
                  ? `/app/mls/properties/${item.linkedEntity.friendlyId}`
                  : `/app/crm/contacts/${item.linkedEntity.friendlyId}`
              }
              className="flex items-center gap-1 hover:text-primary"
            >
              {item.linkedEntity.type === "property" ? (
                <Building2 className="h-3 w-3" aria-hidden="true" />
              ) : (
                <User className="h-3 w-3" aria-hidden="true" />
              )}
              <span className="truncate max-w-[120px]">{item.linkedEntity.name}</span>
            </Link>
          )}
          {item.endDatetime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span className="tabular-nums">
                {format(new Date(item.datetime), "HH:mm")} – {format(new Date(item.endDatetime), "HH:mm")}
              </span>
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
  variant = "default",
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  items: UpcomingItem[];
  locale: string;
  variant?: "default" | "warning" | "muted";
  emptyMessage?: string;
}) {
  const cardClasses = {
    default: "",
    warning: "bg-destructive/5",
    muted: "",
  };

  if (items.length === 0 && !emptyMessage) return null;

  return (
    <Card className={cardClasses[variant]}>
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
            <UpcomingItemCard key={item.id} item={item} locale={locale} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function FeedPage({ upcomingItems, locale }: FeedPageProps) {
  const t = useTranslations("feed");
  const { today, tomorrow, thisWeek, overdue } = upcomingItems;
  const totalItems = today.length + tomorrow.length + thisWeek.length + overdue.length;

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-destructive/10 text-destructive" aria-hidden="true">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{overdue.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.overdue")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-purple-500/10 text-purple-500" aria-hidden="true">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{today.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.today")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary/10 text-primary" aria-hidden="true">
                <Sunrise className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{tomorrow.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.tomorrow")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-success/10 text-success" aria-hidden="true">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{thisWeek.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.thisWeek")}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty State */}
        {totalItems === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium">{t("empty.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                {t("empty.description")}
              </p>
              <div className="flex gap-2 mt-4">
                <Button asChild>
                  <Link href="/app/calendar">
                    <CheckSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t("empty.createTask")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/calendar">
                    <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t("empty.viewCalendar")}
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
            <SectionCard
              title={t("sections.overdue")}
              icon={<AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />}
              items={overdue}
              locale={locale}
              variant="warning"
            />
            <SectionCard
              title={t("sections.today")}
              icon={<Sun className="h-4 w-4 text-purple-500" aria-hidden="true" />}
              items={today}
              locale={locale}
              emptyMessage={totalItems > 0 ? t("sections.noItemsToday") : undefined}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SectionCard
              title={t("sections.tomorrow")}
              icon={<Sunrise className="h-4 w-4 text-primary" aria-hidden="true" />}
              items={tomorrow}
              locale={locale}
            />
            <SectionCard
              title={t("sections.thisWeek")}
              icon={<CalendarDays className="h-4 w-4 text-success" aria-hidden="true" />}
              items={thisWeek}
              locale={locale}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("quickActions.description")}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/calendar">
                    <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t("quickActions.calendar")}
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
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
