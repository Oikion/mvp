"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Home,
} from "lucide-react";
import moment from "moment";
import type { UpcomingEvent } from "@/actions/dashboard/get-upcoming-events";

interface UpcomingEventsProps {
  events: UpcomingEvent[];
}

type BadgeVariant = BadgeProps["variant"];

const getEventTypeVariant = (eventType: string | null): BadgeVariant => {
  switch (eventType) {
    case "PROPERTY_VIEWING":
      return "info";
    case "CLIENT_CONSULTATION":
      return "success";
    case "MEETING":
      return "purple";
    case "REMINDER":
      return "warning";
    case "TASK_DEADLINE":
      return "destructive";
    default:
      return "secondary";
  }
};

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events }) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  };

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return t("today");
    if (isTomorrow(date)) return t("tomorrow");
    return moment(date).format("ddd, MMM D");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("upcomingEvents")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/calendar`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("noUpcomingEvents")}
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-3 pr-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/${locale}/app/calendar/events/${event.id}`}
                  className="block rounded-lg border p-3 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {event.title || t("untitledEvent")}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {getDateLabel(new Date(event.startTime))},{" "}
                          {moment(event.startTime).format("h:mm A")}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {(event.clients.length > 0 || event.properties.length > 0) && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {event.clients.slice(0, 2).map((client) => (
                            <Badge
                              key={client.id}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 gap-1"
                            >
                              <Users className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[60px]">{client.name}</span>
                            </Badge>
                          ))}
                          {event.properties.slice(0, 1).map((property) => (
                            <Badge
                              key={property.id}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 gap-1"
                            >
                              <Home className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[60px]">{property.name}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {event.eventType && (
                      <Badge variant={getEventTypeVariant(event.eventType)} className="text-[10px] shrink-0">
                        {t(`eventType.${event.eventType}`)}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
