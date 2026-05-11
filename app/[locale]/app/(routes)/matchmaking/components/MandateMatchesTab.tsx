// @ts-nocheck
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
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Bed,
  MapPin,
  Info,
  AlertTriangle,
  BarChart3,
  Euro,
} from "lucide-react";
import Link from "next/link";
import type { MandateMatchAnalytics } from "@/actions/matchmaking/get-mandate-matches";
import { MatchScoreBreakdown } from "./MatchScoreBreakdown";

interface Props {
  analytics: MandateMatchAnalytics;
  locale: string;
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

export function MandateMatchesTab({ analytics, locale }: Props) {
  const t = useTranslations("matchmaking");
  const { mandateStats } = analytics;

  const statsCards = [
    {
      title: t("mandateMatches.stats.totalMandates"),
      value: mandateStats.totalMandates,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("mandateMatches.stats.activeMandates"),
      value: mandateStats.activeMandates,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t("mandateMatches.stats.mandatesWithMatches"),
      value: mandateStats.mandatesWithMatches,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t("mandateMatches.stats.avgMatchScore"),
      value: `${mandateStats.avgMatchScore}%`,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Mandate-Property Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("mandateMatches.topMatches.title")}
          </CardTitle>
          <CardDescription>
            {t("mandateMatches.topMatches.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopMandateMatchesGrid
            matches={analytics.topMatches}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Match Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("mandateMatches.distribution.title")}
          </CardTitle>
          <CardDescription>
            {t("mandateMatches.distribution.description")}
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

      {/* Unmatched Mandates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("mandateMatches.unmatched.title")}
          </CardTitle>
          <CardDescription>
            {t("mandateMatches.unmatched.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnmatchedMandatesList
            mandates={analytics.unmatchedClients}
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

function TopMandateMatchesGrid({
  matches,
  locale,
}: {
  matches: MandateMatchAnalytics["topMatches"];
  locale: string;
}) {
  const t = useTranslations("matchmaking");

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("mandateMatches.topMatches.noMatches")}</p>
        <p className="text-sm mt-2">{t("mandateMatches.topMatches.noMatchesHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <div
          key={`${match.clientId}-${match.propertyId}`}
          className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Mandate Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                href={`/${locale}/app/mandates/${match.client?.friendlyId ?? match.clientId}`}
                className="font-medium hover:text-primary truncate block"
              >
                {match.client.client_name}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {match.client.client_status && (
                  <Badge variant="outline" className="text-xs">
                    {match.client.client_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Match Score */}
          <div className="flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(match.overallScore)}`}
                    >
                      {Math.round(match.overallScore)}%
                    </div>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-80 p-0">
                  <MatchScoreBreakdown breakdown={match.breakdown} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs text-muted-foreground">
              {match.matchedCriteria}/{match.totalCriteria} {t("topMatches.criteria")}
            </span>
          </div>

          {/* Arrow */}
          <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />

          {/* Property Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
              {match.property.imageUrl ? (
                <img
                  src={match.property.imageUrl}
                  alt={match.property.property_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/${locale}/app/mls/properties/${match.property?.friendlyId ?? match.propertyId}`}
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/mandates/${match.client?.friendlyId ?? match.clientId}`}>
                {t("mandateMatches.topMatches.viewMandate")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/mls/properties/${match.property?.friendlyId ?? match.propertyId}`}>
                {t("topMatches.viewProperty")}
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UnmatchedMandatesList({
  mandates,
  locale,
}: {
  mandates: MandateMatchAnalytics["unmatchedClients"];
  locale: string;
}) {
  const t = useTranslations("matchmaking");

  if (mandates.length === 0) {
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
          {t("mandateMatches.unmatched.allMatched")}
        </p>
        <p className="text-sm mt-2">
          {t("mandateMatches.unmatched.allMatchedDesc")}
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
            {mandates.length} {t("mandateMatches.unmatched.needsAttention")}
          </p>
          <p className="text-sm text-warning mt-1">
            {t("mandateMatches.unmatched.attentionDesc")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {mandates.map((mandate) => (
          <div
            key={mandate.id}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-warning/10 text-warning">
                <FileText className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <Link
                href={`/${locale}/app/mandates/${mandate.friendlyId}`}
                className="font-medium hover:text-primary"
              >
                {mandate.client_name}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {mandate.intent || t("common.noIntent")}
                </Badge>
                <span className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  {formatBudget(mandate.budget_min, mandate.budget_max, t)}
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-warning">
                {mandate.bestMatchScore ? `${Math.round(mandate.bestMatchScore)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("unmatchedClients.bestMatch")}
              </div>
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/mandates/${mandate.friendlyId}`}>
                {t("mandateMatches.unmatched.review")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBudget(
  min: number | null | undefined,
  max: number | null | undefined,
  t: ReturnType<typeof useTranslations>,
): string {
  if (!min && !max) return t("common.noBudget");
  if (!min) return t("common.budgetUpTo", { amount: formatPrice(max) });
  if (!max) return t("common.budgetFrom", { amount: formatPrice(min) });
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}
