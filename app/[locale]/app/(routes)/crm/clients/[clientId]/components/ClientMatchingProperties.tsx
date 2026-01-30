"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Bed, MapPin, Euro, Info, Target, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getClientMatches } from "@/actions/matchmaking";
import type { MatchResultWithProperty, CriterionScore } from "@/lib/matchmaking";

interface Props {
  clientId: string;
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
  const sortedBreakdown = [...breakdown].sort((a, b) => b.weightedScore - a.weightedScore);
  const topCriteria = sortedBreakdown.slice(0, 5);
  
  return (
    <div className="p-2 space-y-1 text-xs">
      <div className="font-semibold mb-2">Top Matching Factors</div>
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

export function ClientMatchingProperties({ clientId, locale = "en" }: Props) {
  const [matches, setMatches] = useState<MatchResultWithProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await getClientMatches(clientId, {
        limit: 10,
        minScoreThreshold: 40,
        includeBreakdown: true,
      });
      setMatches(results);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setError("Failed to load matching properties");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [clientId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Matching Properties</CardTitle>
              <CardDescription>
                Properties that match this client&apos;s preferences
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
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/matchmaking`}>
                View All Matches
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
                <Skeleton className="h-12 w-12 rounded" />
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
              Try Again
            </Button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No matching properties found</p>
            <p className="text-sm mt-1">
              Update this client&apos;s preferences to find better matches
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.propertyId}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Property Image */}
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {match.property.imageUrl ? (
                    <img
                      src={match.property.imageUrl}
                      alt={match.property.property_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* Property Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${locale}/app/mls/properties/${match.propertyId}`}
                    className="font-medium hover:text-primary truncate block"
                  >
                    {match.property.property_name}
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Euro className="h-3 w-3" />
                        {formatPrice(match.property.price)}
                      </span>
                    )}
                    {match.property.property_type && (
                      <Badge variant="outline" className="text-xs">
                        {match.property.property_type}
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
                  <Link href={`/${locale}/app/mls/properties/${match.propertyId}`}>
                    View
                  </Link>
                </Button>
              </div>
            ))}

            {matches.length >= 10 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/app/matchmaking`}>
                    View More Matches
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
