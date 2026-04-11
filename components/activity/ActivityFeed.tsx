"use client";

import { useTranslations, useLocale } from "next-intl";
import { el, enUS } from "date-fns/locale";
import { useActivities } from "@/hooks/swr/useActivities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/navigation";
import { formatDistanceToNow } from "date-fns";
import { FileText, User, Building2, Plus, GitCommitHorizontal, LinkIcon, Unlink } from "lucide-react";

interface ActivityFeedProps {
  parentType: ActivityParentType;
  parentId: string;
  unified?: boolean;
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface ActivityEntry {
  _source: "activity";
  id: string;
  kind: string;
  subject?: string | null;
  body?: string | null;
  occurredAt: string;
  CreatedBy?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  RelatedContact?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  RelatedProperty?: { id: string; property_name?: string | null; friendlyId?: string | null } | null;
  RelatedDocument?: { id: string; document_name?: string | null } | null;
}

interface ChangedField {
  field: string;
  from: unknown;
  to: unknown;
}

interface LinkTarget {
  type: string;
  id: string;
  friendlyId?: string;
  label?: string;
}

interface ChangelogEntry {
  _source: "changelog";
  id: string;
  eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
  changedFields?: ChangedField[] | null;
  linkTarget?: LinkTarget | null;
  occurredAt: string;
  Actor?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

type FeedEntry = ActivityEntry | ChangelogEntry;

// ─── Type guard ───────────────────────────────────────────────────────────────

function isFeedEntry(item: unknown): item is FeedEntry {
  return (
    typeof item === "object" &&
    item !== null &&
    "_source" in item &&
    ((item as FeedEntry)._source === "activity" || (item as FeedEntry)._source === "changelog")
  );
}

// ─── Changelog icons ──────────────────────────────────────────────────────────

const CHANGELOG_ICONS = {
  CREATED: Plus,
  UPDATED: GitCommitHorizontal,
  LINKED: LinkIcon,
  UNLINKED: Unlink,
} as const;

// ─── Empty state mapping ──────────────────────────────────────────────────────

const PARENT_TYPE_TO_EMPTY_STATE = {
  CONTACT: "clients",
  PROPERTY: "properties",
  REQUEST: "generic",
  DEAL: "generic",
  SHOWING: "generic",
} as const satisfies Record<ActivityParentType, import("@/components/ui/empty-state").EmptyStateType>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actorName(actor?: { firstName?: string | null; lastName?: string | null } | null, t?: ReturnType<typeof useTranslations>): string {
  return [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || (t ? t("changelog.systemActor") : "System");
}

// ─── Changelog row ────────────────────────────────────────────────────────────

function ChangelogRow({
  entry,
  t,
  dateLocale,
}: Readonly<{
  entry: ChangelogEntry;
  t: ReturnType<typeof useTranslations>;
  dateLocale: Locale;
}>) {
  const Icon = CHANGELOG_ICONS[entry.eventType];
  const iconLabel = entry.eventType.toLowerCase();
  const actor = actorName(entry.Actor, t);

  let sentence: React.ReactNode;

  if (entry.eventType === "CREATED") {
    sentence = t("changelog.created", { actor });
  } else if (entry.eventType === "UPDATED" && entry.changedFields && entry.changedFields.length > 0) {
    sentence = (
      <span>
        {entry.changedFields.map((cf, i) => (
          <span key={cf.field}>
            {i > 0 && " · "}
            <span className="font-medium">{t(`watchedFields.${cf.field}` as Parameters<typeof t>[0])}</span>
            {" "}
            {t("changelog.fieldChangedNoLabel", { from: String(cf.from ?? "—"), to: String(cf.to ?? "—") })}
          </span>
        ))}
      </span>
    );
  } else if (entry.eventType === "UPDATED") {
    sentence = t("changelog.updated", { actor });
  } else if (entry.eventType === "LINKED" && entry.linkTarget) {
    sentence = t("changelog.linked", {
      targetType: entry.linkTarget.type,
      label: entry.linkTarget.label ?? entry.linkTarget.friendlyId ?? entry.linkTarget.id,
    });
  } else if (entry.eventType === "UNLINKED" && entry.linkTarget) {
    sentence = t("changelog.unlinked", {
      targetType: entry.linkTarget.type,
      label: entry.linkTarget.label ?? entry.linkTarget.friendlyId ?? entry.linkTarget.id,
    });
  } else {
    sentence = t("changelog.updated", { actor });
  }

  return (
    <li className="relative py-1.5 flex items-start gap-2">
      <span
        className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
        aria-hidden
      />
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-label={iconLabel} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-foreground">{sentence}</span>
        <span className="text-xs text-muted-foreground">
          {actor} ·{" "}
          <time dateTime={entry.occurredAt}>
            {formatDistanceToNow(new Date(entry.occurredAt), { addSuffix: true, locale: dateLocale })}
          </time>
        </span>
      </div>
    </li>
  );
}

// ─── Activity row (existing treatment) ───────────────────────────────────────

function ActivityRow({
  activity,
  t,
  dateLocale,
}: Readonly<{
  activity: ActivityEntry;
  t: ReturnType<typeof useTranslations>;
  dateLocale: Locale;
}>) {
  return (
    <li className="relative">
      <span
        className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
        aria-hidden
      />
      <div className="rounded-lg border border-border bg-card p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">
            {t(`kinds.${activity.kind}` as Parameters<typeof t>[0])}
            {activity.subject ? ` — ${activity.subject}` : ""}
          </span>
          <time
            dateTime={activity.occurredAt}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true, locale: dateLocale })}
          </time>
        </div>

        {activity.body && (
          <p className="mt-1 text-muted-foreground line-clamp-2">{activity.body}</p>
        )}

        {(activity.RelatedContact || activity.RelatedProperty || activity.RelatedDocument) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.RelatedContact && (
              <Link href={`/app/crm/contacts/${activity.RelatedContact.id}`}>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal hover:bg-accent transition-colors cursor-pointer">
                  <User className="h-3 w-3 shrink-0" aria-hidden />
                  {[activity.RelatedContact.firstName, activity.RelatedContact.lastName].filter(Boolean).join(" ") || activity.RelatedContact.id}
                </Badge>
              </Link>
            )}
            {activity.RelatedProperty && (
              <Link href={`/app/mls/properties/${activity.RelatedProperty.friendlyId ?? activity.RelatedProperty.id}`}>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal hover:bg-accent transition-colors cursor-pointer">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                  {activity.RelatedProperty.property_name ?? activity.RelatedProperty.friendlyId ?? activity.RelatedProperty.id}
                </Badge>
              </Link>
            )}
            {activity.RelatedDocument && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs font-normal">
                <FileText className="h-3 w-3 shrink-0" aria-hidden />
                {activity.RelatedDocument.document_name}
              </Badge>
            )}
          </div>
        )}

        {activity.CreatedBy && (
          <p className="mt-1 text-xs text-muted-foreground">
            {[activity.CreatedBy.firstName, activity.CreatedBy.lastName].filter(Boolean).join(" ")}
          </p>
        )}
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityFeed({ parentType, parentId, unified = false }: Readonly<ActivityFeedProps>) {
  const t = useTranslations("activities");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const { activities, isLoading, error } = useActivities({ parentType, parentId, unified });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState variant="server" onRetry={() => window.location.reload()} />;
  }

  const feed = activities.filter(isFeedEntry);

  if (feed.length === 0) {
    return <EmptyState type={PARENT_TYPE_TO_EMPTY_STATE[parentType]} />;
  }

  return (
    <ol className="relative border-l border-border space-y-6 pl-6">
      {feed.map((entry) =>
        entry._source === "changelog" ? (
          <ChangelogRow key={entry.id} entry={entry} t={t} dateLocale={dateLocale} />
        ) : (
          <ActivityRow key={entry.id} activity={entry} t={t} dateLocale={dateLocale} />
        )
      )}
    </ol>
  );
}
