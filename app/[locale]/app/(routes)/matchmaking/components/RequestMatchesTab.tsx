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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Building2,
  Target,
  ArrowRight,
  Bed,
  MapPin,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { RequestMatchAnalytics } from "@/actions/matchmaking/types";
import type { PersistedMatchItem } from "@/actions/matchmaking/get-persisted-matches";
import type { CriterionScore } from "@/lib/matchmaking";
import { MatchScoreBreakdown } from "./MatchScoreBreakdown";

interface Props {
  analytics: RequestMatchAnalytics;
  persistedMatches: PersistedMatchItem[];
  locale: string;
  onRunNow?: () => void;
  isRunning?: boolean;
  isCoolingDown?: boolean;
  cooldownMinutesLeft?: number;
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

export function RequestMatchesTab({
  analytics,
  persistedMatches,
  locale,
  onRunNow,
  isRunning,
  isCoolingDown,
  cooldownMinutesLeft,
}: Props) {
  const t = useTranslations("matchmaking");

  return (
    <div className="space-y-6">
      {/* Action bar */}
      {onRunNow && (
        <div className="flex justify-end items-center gap-2">
          {isCoolingDown && cooldownMinutesLeft !== undefined && (
            <span className="text-xs text-muted-foreground">
              {t("requestMatches.runNow.cooldown", { minutes: cooldownMinutesLeft })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRunNow}
            disabled={isRunning || isCoolingDown}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning
              ? t("requestMatches.runNow.running")
              : isCoolingDown
              ? t("requestMatches.runNow.cooldownLabel")
              : t("requestMatches.runNow.label")}
          </Button>
        </div>
      )}

      {/* Top Request-Property Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("requestMatches.topMatches.title")}
          </CardTitle>
          <CardDescription>
            {t("requestMatches.topMatches.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopRequestMatchesGrid
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
              0,
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

      {/* Unmatched Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("unmatchedClients.title")}
          </CardTitle>
          <CardDescription>
            {t("unmatchedClients.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnmatchedRequestsList
            requests={analytics.unmatchedClients}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components (private to this file)
// ──────────────────────────────────────────────

function TopRequestMatchesGrid({
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
      {matches.map((match) => (
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
                href={`/${locale}/app/matchmaking/matches/${match.id}`}
                className="font-medium hover:text-primary truncate block"
              >
                {match.request.name ?? match.requestId}
              </Link>
              <div className="text-xs text-muted-foreground">
                {match.request.requestContacts.length > 0 && (
                  <span>
                    {match.request.requestContacts
                      .map((rc) =>
                        rc.contact.displayName ??
                        [rc.contact.firstName, rc.contact.lastName].filter(Boolean).join(" ") ??
                        ""
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match Score */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold cursor-help ${match.matchScore != null ? getScoreColor(match.matchScore) : "bg-muted"}`}
                  >
                    {match.matchScore != null ? `${Math.round(match.matchScore)}%` : "—"}
                  </div>
                </TooltipTrigger>
                {match.scoreBreakdown && (
                  <TooltipContent side="top" className="p-0 w-72" sideOffset={8}>
                    <MatchScoreBreakdown
                      breakdown={match.scoreBreakdown as unknown as CriterionScore[]}
                      maxItems={5}
                    />
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Arrow */}
          <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block shrink-0" />

          {/* Property Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/${locale}/app/mls/properties/${match.property.friendlyId ?? match.propertyId}`}
                className="font-medium hover:text-primary truncate block"
              >
                {match.property.property_name}
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
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" asChild>
              <Link href={`/${locale}/app/matchmaking/matches/${match.id}`}>
                {t("requestMatches.topMatches.viewMatch")}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2" aria-label="More actions">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/app/requests/${match.request.friendlyId ?? match.requestId}`} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("requestMatches.topMatches.viewRequest")}
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/app/mls/properties/${match.property.friendlyId ?? match.propertyId}`} className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("topMatches.viewProperty")}
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

function UnmatchedRequestsList({
  requests,
  locale,
}: {
  requests: RequestMatchAnalytics["unmatchedClients"];
  locale: string;
}) {
  const t = useTranslations("matchmaking");

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-success mb-4">
          <svg
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="font-medium text-success">
          {t("unmatchedClients.allClientsMatched")}
        </p>
        <p className="text-sm mt-2">
          {t("unmatchedClients.allClientsMatchedDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">
            {requests.length} {t("unmatchedClients.needsAttention")}
          </p>
          <p className="text-sm text-warning mt-1">
            {t("unmatchedClients.attentionDesc")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-warning/10 text-warning">
                <FileText className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <Link
                href={`/${locale}/app/requests/${req.friendlyId}`}
                className="font-medium hover:text-primary"
              >
                {(req as any).displayName ?? (req as any).client_name ?? req.id}
              </Link>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-warning">
                {req.bestMatchScore ? `${Math.round(req.bestMatchScore)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("unmatchedClients.bestMatch")}
              </div>
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/requests/${req.friendlyId}`}>
                {t("unmatchedClients.review")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
