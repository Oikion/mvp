"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, User, ArrowRight, Info, Bed, MapPin, Euro } from "lucide-react";
import Link from "next/link";
import type { MatchResultWithClient, MatchResultWithProperty } from "@/lib/matchmaking";
import { MatchScoreBreakdown } from "./MatchScoreBreakdown";

interface Props {
  matches: Array<MatchResultWithClient & MatchResultWithProperty>;
  locale: string;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 70) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function TopMatchesGrid({ matches, locale }: Props) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No matches found above the threshold.</p>
        <p className="text-sm mt-2">Add more client preferences or properties to see matches.</p>
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
          {/* Client Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-blue-700">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link 
                href={`/${locale}/app/crm/clients/${match.clientId}`}
                className="font-medium hover:text-primary truncate block"
              >
                {match.client.full_name || match.client.client_name}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {match.client.intent}
                </Badge>
                {match.client.budget_max && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {formatPrice(match.client.budget_max)}
                  </span>
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
              {match.matchedCriteria}/{match.totalCriteria} criteria
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
                href={`/${locale}/app/mls/properties/${match.propertyId}`}
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
              <Link href={`/${locale}/app/crm/clients/${match.clientId}`}>
                View Client
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/mls/properties/${match.propertyId}`}>
                View Property
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
