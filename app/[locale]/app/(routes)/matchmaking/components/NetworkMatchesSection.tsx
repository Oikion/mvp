"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, Building2, FileText, Clock } from "lucide-react";
import type { CrossOrgMatchSummary, CrossOrgMatchResult } from "@/actions/network/get-cross-org-matches";
import type { FullProperty, AgencyIdentifiedProperty, FullMandate, AgencyIdentifiedMandate } from "@/lib/network/privacy-filter";

interface Props {
  summary: CrossOrgMatchSummary;
  locale: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function AgencyBadge({ name, logo }: { name: string | null; logo: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {logo && <img src={logo} alt="" className="h-4 w-4 rounded-sm object-cover" />}
      {name}
    </span>
  );
}

function MatchCard({ match, locale, t }: { match: CrossOrgMatchResult; locale: string; t: ReturnType<typeof useTranslations> }) {
  const { mandate, property, matchScore } = match;

  const mandateAgency =
    mandate.privacyLevel !== "ANONYMIZED"
      ? (mandate as AgencyIdentifiedMandate | FullMandate).agencyName
      : null;
  const mandateLogo =
    mandate.privacyLevel !== "ANONYMIZED"
      ? (mandate as AgencyIdentifiedMandate | FullMandate).agencyLogo
      : null;
  const propertyAgency =
    property.privacyLevel !== "ANONYMIZED"
      ? (property as AgencyIdentifiedProperty | FullProperty).agencyName
      : null;
  const propertyLogo =
    property.privacyLevel !== "ANONYMIZED"
      ? (property as AgencyIdentifiedProperty | FullProperty).agencyLogo
      : null;

  const propertyFriendlyId =
    property.privacyLevel === "FULL" ? (property as FullProperty).friendlyId : null;
  const mandateFriendlyId =
    mandate.privacyLevel === "FULL" ? (mandate as FullMandate).friendlyId : null;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Mandate side */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {mandate.transaction_type} · {mandate.property_type ?? "—"}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {mandate.municipality && <span>{mandate.municipality}</span>}
            {(mandate.budget_min || mandate.budget_max) && (
              <span>
                {mandate.budget_min ? `€${(mandate.budget_min / 1000).toFixed(0)}k` : ""}
                {mandate.budget_min && mandate.budget_max ? "–" : ""}
                {mandate.budget_max ? `€${(mandate.budget_max / 1000).toFixed(0)}k` : ""}
              </span>
            )}
          </div>
          <AgencyBadge name={mandateAgency ?? null} logo={mandateLogo ?? null} />
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${getScoreColor(matchScore)}`}
        >
          {matchScore}%
        </div>
        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
          <Globe className="h-3 w-3" />
          {t("dashboard.badge")}
        </Badge>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block shrink-0" />

      {/* Property side */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {property.property_type ?? "—"} · {property.transaction_type ?? "—"}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {(property.area || property.address_city || property.municipality) && (
              <span>{property.area ?? property.address_city ?? property.municipality}</span>
            )}
            {property.bedrooms && <span>{property.bedrooms} bd</span>}
            {property.price && <span>€{(property.price / 1000).toFixed(0)}k</span>}
          </div>
          <AgencyBadge name={propertyAgency ?? null} logo={propertyLogo ?? null} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        {mandateFriendlyId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/app/mandates/${mandateFriendlyId}`}>
              {t("dashboard.viewMandate")}
            </Link>
          </Button>
        )}
        {propertyFriendlyId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/app/mls/properties/${propertyFriendlyId}`}>
              {t("dashboard.viewProperty")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function NetworkMatchesSection({ summary, locale }: Props) {
  const t = useTranslations("network.matchmaking");

  if (!summary.isNetworkMember) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-3">{t("dashboard.notMember")}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/app/settings/network`}>{t("dashboard.joinCta")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {t("dashboard.title")}
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{t("dashboard.description")}</span>
          {summary.lastComputedAt && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("dashboard.lastComputed")}: {formatDate(summary.lastComputedAt)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summary.results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("dashboard.noResults")}</p>
            <p className="text-xs mt-1">{t("dashboard.noResultsHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.results.map((match) => (
              <MatchCard key={match.id} match={match} locale={locale} t={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
