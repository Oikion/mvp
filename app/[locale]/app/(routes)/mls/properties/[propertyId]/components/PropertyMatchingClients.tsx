"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Euro, Info, Target, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPropertyMatches } from "@/actions/matchmaking";
import type { MatchResultWithClient, CriterionScore } from "@/lib/matchmaking";

interface Props {
  propertyId: string;
  locale?: string;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}


function getScoreColor(score: number): string {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function MatchScoreTooltip({ breakdown }: { breakdown: CriterionScore[] }) {
  const t = useTranslations("matchmaking");
  const sortedBreakdown = [...breakdown].sort((a, b) => b.weightedScore - a.weightedScore);
  const topCriteria = sortedBreakdown.slice(0, 5);
  
  return (
    <div className="p-2 space-y-1 text-xs">
      <div className="font-semibold mb-2">{t("common.topMatchingFactors")}</div>
      {topCriteria.map((item) => (
        <div key={item.criterion} className="flex justify-between gap-4">
          <span className="capitalize">{item.criterion.replace("_", " ")}</span>
          <span className={item.score >= 70 ? "text-success" : "text-warning"}>
            {Math.round(item.score)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function PropertyMatchingClients({ propertyId, locale = "en" }: Props) {
  const t = useTranslations("matchmaking");

  function formatBudget(min: number | null | undefined, max: number | null | undefined): string {
    if (!min && !max) return t("common.noBudget");
    if (!min) return t("common.budgetUpTo", { amount: formatPrice(max) });
    if (!max) return t("common.budgetFrom", { amount: formatPrice(min) });
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  const [matches, setMatches] = useState<MatchResultWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await getPropertyMatches(propertyId, {
        limit: 10,
        minScoreThreshold: 40,
        includeBreakdown: true,
      });
      setMatches(results);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setError(t("errors.failedToLoadClients"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [propertyId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{t("matchingClients.title")}</CardTitle>
              <CardDescription>
                {t("matchingClients.description")}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMatches}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              {t("matchingClients.refresh")}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/matchmaking`}>
                {t("matchingClients.viewAll")}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMatches} className="mt-2">
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t("matchingClients.noMatches")}</p>
            <p className="text-sm mt-1">
              {t("matchingClients.noMatchesHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.clientId}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Client Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${locale}/app/crm/clients/${match.clientId}`}
                    className="font-medium hover:text-primary truncate block"
                  >
                    {match.client.full_name || match.client.client_name}
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {match.client.intent && (
                      <Badge variant="outline" className="text-xs">
                        {match.client.intent}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {formatBudget(match.client.budget_min, match.client.budget_max)}
                    </span>
                    {match.client.client_status && (
                      <Badge 
                        variant={match.client.client_status === "ACTIVE" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {match.client.client_status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Match Score */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getScoreColor(match.overallScore)}`}
                        >
                          {Math.round(match.overallScore)}%
                        </div>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="p-0">
                      <MatchScoreTooltip breakdown={match.breakdown} />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* View Button */}
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/${locale}/app/crm/clients/${match.clientId}`}>
                    {t("common.view")}
                  </Link>
                </Button>
              </div>
            ))}

            {matches.length >= 10 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/app/matchmaking`}>
                    {t("matchingClients.viewMore")}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
