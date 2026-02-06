"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Home,
  Users,
  FileText,
  Calendar,
  Activity,
} from "lucide-react";
import moment from "moment";
import type { ActivityItem } from "@/actions/feed/get-recent-activities";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "property":
      return <Home className="h-4 w-4" />;
    case "client":
      return <Users className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    case "event":
      return <Calendar className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

type BadgeVariant = BadgeProps["variant"];

const getActionColor = (action: ActivityItem["action"]): BadgeVariant => {
  switch (action) {
    case "created":
      return "success";
    case "updated":
      return "info";
    case "deleted":
      return "destructive";
    default:
      return "secondary";
  }
};

const getActivityHref = (activity: ActivityItem, locale: string): string => {
  switch (activity.type) {
    case "property":
      return `/${locale}/app/mls/properties/${activity.entityId}`;
    case "client":
      return `/${locale}/app/crm/clients/${activity.entityId}`;
    case "document":
      return `/${locale}/app/documents?id=${activity.entityId}`;
    case "event":
      return `/${locale}/app/calendar/events/${activity.entityId}`;
    default:
      return `/${locale}/app`;
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("recentActivity")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/feed`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("noRecentActivity")}
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-3 pr-4">
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={getActivityHref(activity, locale)}
                  className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 rounded-full bg-muted p-2 shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <Badge variant={getActionColor(activity.action)} className="text-xs shrink-0">
                        {t(`action.${activity.action}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.actor && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={activity.actor.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {activity.actor.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {activity.actor.name}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {moment(activity.timestamp).fromNow()}
                      </span>
                    </div>
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
