"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Building2,
  Target,
  ArrowRight,
  Bed,
  MapPin,
  Info,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { RequestMatchAnalytics } from "@/actions/matchmaking/get-request-matches";
import type { PersistedMatchItem } from "@/actions/matchmaking/get-persisted-matches";
import { MatchScoreBreakdown } from "./MatchScoreBreakdown";
import { StrikeDealDialog } from "./StrikeDealDialog";

interface Props {
  analytics: RequestMatchAnalytics;
  persistedMatches: PersistedMatchItem[];
  locale: string;
  onRunNow?: () => void;
  isRunning?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getRequestDisplayName(request: PersistedMatchItem["request"]): string {
  if (request.title) return request.title;
  const contact = request.requestContacts[0]?.contact;
  if (!contact) return request.friendlyId ?? request.id;
  const contactName = (contact.displayName ?? [contact.firstName, contact.lastName].filter(Boolean).join(" ")) || null;
  return contactName ?? request.friendlyId ?? request.id;
}

export function RequestMatchesTab({
  analytics,
  persistedMatches,
  locale,
  onRunNow,
  isRunning,
}: Props) {
  const t = useTranslations("matchmaking");

  return (
    <div className="space-y-6">
      {/* Top Request-Property Matches (from persisted results) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("requestMatches.topMatches.title")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("requestMatches.topMatches.description")}
              </CardDescription>
            </div>
            {onRunNow && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRunNow}
                disabled={isRunning}
                className="shrink-0"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                {isRunning
                  ? t("requestMatches.runNow.running")
                  : t("requestMatches.runNow.label")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PersistedMatchesGrid
            matches={persistedMatches}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Match Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("requestMatches.distribution.title")}
          </CardTitle>
          <CardDescription>
            {t("requestMatches.distribution.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analytics.matchDistribution.map((bucket) => {
            const total = analytics.matchDistribution.reduce(
              (sum, b) => sum + b.count,
              0
            );
            const percentage = total > 0 ? (bucket.count / total) * 100 : 0;

            return (
              <div key={bucket.range} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bucket.range}</span>
                  <span className="text-muted-foreground">
                    {bucket.count} {t("common.matches")} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components (private to this file)
// ──────────────────────────────────────────────

function getContactName(contact: { displayName: string | null; firstName: string | null; lastName: string | null }): string {
  if (contact.displayName) return contact.displayName;
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "?";
}

function getContactInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ContactAvatarStack({
  contacts,
}: {
  contacts: PersistedMatchItem["request"]["requestContacts"];
}) {
  const MAX_VISIBLE = 3;
  const visible = contacts.slice(0, MAX_VISIBLE);
  const overflow = contacts.length - MAX_VISIBLE;

  return (
    <div className="flex items-center mt-1">
      <div className="flex -space-x-2">
        {visible.map(({ contact }) => {
          const name = getContactName(contact);
          const initials = getContactInitials(name);
          return (
            <TooltipProvider key={contact.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-border">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {overflow > 0 && (
          <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-border">
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
              +{overflow}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

function PersistedMatchesGrid({
  matches,
  locale,
}: {
  matches: PersistedMatchItem[];
  locale: string;
}) {
  const t = useTranslations("matchmaking");

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("requestMatches.topMatches.noMatches")}</p>
        <p className="text-sm mt-2">{t("requestMatches.topMatches.noMatchesHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const requestName = getRequestDisplayName(match.request);
        const scoreDisplay = Math.round(match.matchScore);

        return (
          <div
            key={match.id}
            className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Request Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link
                  href={`/${locale}/app/requests/${match.request.friendlyId ?? match.requestId}`}
                  className="font-medium hover:text-primary truncate block"
                >
                  {requestName}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {match.status}
                  </Badge>
                </div>
                {match.request.requestContacts.length > 0 && (
                  <ContactAvatarStack contacts={match.request.requestContacts} />
                )}
              </div>
            </div>

            {/* Match Score */}
            <div className="flex flex-col items-center gap-1">
              {match.scoreBreakdown ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(scoreDisplay)}`}
                        >
                          {scoreDisplay}%
                        </div>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-80 p-0">
                      <MatchScoreBreakdown
                        breakdown={match.scoreBreakdown as unknown as Parameters<typeof MatchScoreBreakdown>[0]["breakdown"]}
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(scoreDisplay)}`}
                >
                  {scoreDisplay}%
                </div>
              )}
            </div>

            {/* Arrow */}
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />

            {/* Property Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/${locale}/app/mls/properties/${match.property.friendlyId ?? match.propertyId}`}
                  className="font-medium hover:text-primary truncate block"
                >
                  {match.property.property_name ?? match.propertyId}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  {match.property.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      {match.property.bedrooms}
                    </span>
                  )}
                  {(match.property.area || match.property.address_city) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {match.property.area || match.property.address_city}
                    </span>
                  )}
                  {match.property.price && (
                    <span className="font-medium text-foreground">
                      {formatPrice(match.property.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <StrikeDealDialog match={match} locale={locale} />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/app/requests/${match.request.friendlyId ?? match.requestId}`}>
                  {t("requestMatches.topMatches.viewRequest")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/app/mls/properties/${match.property.friendlyId ?? match.propertyId}`}>
                  {t("topMatches.viewProperty")}
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
