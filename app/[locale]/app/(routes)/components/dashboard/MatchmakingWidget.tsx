"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Sparkles,
  Flame,
  Users,
  Home,
  TrendingUp,
  Target,
} from "lucide-react";

interface HotProperty {
  id: string;
  property_name: string;
  price: number | null;
  address_city: string | null;
  image_url: string | null;
  matchCount: number;
  averageMatchScore: number;
  topMatchScore: number;
}

interface TopMatch {
  clientId: string;
  propertyId: string;
  overallScore: number;
  clientName: string;
  propertyName: string;
}

interface MatchmakingWidgetProps {
  hotProperties: HotProperty[];
  topMatches: TopMatch[];
  totalMatches?: number;
  averageScore?: number;
}

const getScoreColor = (score: number): string => {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-info";
  if (score >= 50) return "text-warning";
  return "text-muted-foreground";
};

type BadgeVariant = BadgeProps["variant"];

const getScoreBadgeVariant = (score: number): BadgeVariant => {
  if (score >= 85) return "success";
  if (score >= 70) return "info";
  if (score >= 50) return "warning";
  return "secondary";
};

export const MatchmakingWidget: React.FC<MatchmakingWidgetProps> = ({
  hotProperties,
  topMatches,
  totalMatches = 0,
  averageScore = 0,
}) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const hasData = hotProperties.length > 0 || topMatches.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("matchmaking")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/matchmaking`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("noMatchesYet")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("matchesHint")}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="hot" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="hot" className="text-xs gap-1">
                <Flame className="h-3 w-3" />
                {t("hotProperties")}
              </TabsTrigger>
              <TabsTrigger value="top" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                {t("topMatches")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hot" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[280px]">
                <div className="space-y-2 pr-4">
                  {hotProperties.slice(0, 5).map((property, index) => (
                    <Link
                      key={property.id}
                      href={`/${locale}/app/mls/properties/${property.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                        {property.image_url ? (
                          <Image
                            src={property.image_url}
                            alt={property.property_name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Home className="h-4 w-4" />
                          </div>
                        )}
                        {index < 3 && (
                          <div className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-warning flex items-center justify-center">
                            <Flame className="h-2.5 w-2.5 text-warning-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {property.property_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {property.price && (
                            <span>€{property.price.toLocaleString()}</span>
                          )}
                          {property.address_city && (
                            <span className="truncate">{property.address_city}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <Users className="h-3 w-3" />
                          {property.matchCount}
                        </div>
                        <div className={`text-[10px] ${getScoreColor(property.topMatchScore)}`}>
                          {Math.round(property.topMatchScore)}% {t("topScore")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="top" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[280px]">
                <div className="space-y-2 pr-4">
                  {topMatches.slice(0, 5).map((match) => (
                    <Link
                      key={`${match.clientId}-${match.propertyId}`}
                      href={`/${locale}/app/matchmaking?client=${match.clientId}&property=${match.propertyId}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="rounded-full bg-muted p-2 shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {match.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          → {match.propertyName}
                        </p>
                      </div>
                      <Badge variant={getScoreBadgeVariant(match.overallScore)} className="text-xs shrink-0">
                        {Math.round(match.overallScore)}%
                      </Badge>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
