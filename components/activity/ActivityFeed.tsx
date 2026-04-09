"use client";

import { useTranslations } from "next-intl";
import { useActivities } from "@/hooks/swr/useActivities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  parentType: ActivityParentType;
  parentId: string;
}

export function ActivityFeed({ parentType, parentId }: ActivityFeedProps) {
  const t = useTranslations("activities");
  const { activities, isLoading } = useActivities({ parentType, parentId });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border space-y-6 pl-6">
      {activities.map((activity) => (
        <li key={activity.id} className="relative">
          <span
            className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
            aria-hidden
          />
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {t(`kinds.${activity.kind}`)}
                {activity.subject ? ` — ${activity.subject}` : ""}
              </span>
              <time
                dateTime={activity.occurredAt}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatDistanceToNow(new Date(activity.occurredAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
            {activity.body && (
              <p className="mt-1 text-muted-foreground line-clamp-2">
                {activity.body}
              </p>
            )}
            {activity.CreatedBy && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[activity.CreatedBy.firstName, activity.CreatedBy.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
