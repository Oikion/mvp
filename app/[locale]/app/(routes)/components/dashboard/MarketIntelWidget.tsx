"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import {
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  RefreshCw,
} from "lucide-react";
import moment from "moment";

interface ScrapeStats {
  platform: string;
  listingsFound: number;
  listingsNew: number;
  lastScrape: Date | null;
  status: "completed" | "failed" | "running" | "pending";
}

interface MarketIntelWidgetProps {
  isEnabled: boolean;
  lastScrapeAt: Date | null;
  nextScrapeAt: Date | null;
  status: string;
  platformStats: ScrapeStats[];
  totalListings?: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case "running":
      return <Loader2 className="h-3.5 w-3.5 text-info animate-spin" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

type BadgeVariant = BadgeProps["variant"];

const getStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "info";
    default:
      return "secondary";
  }
};

export const MarketIntelWidget: React.FC<MarketIntelWidgetProps> = ({
  isEnabled,
  lastScrapeAt,
  nextScrapeAt,
  status,
  platformStats,
  totalListings = 0,
}) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const totalNew = platformStats.reduce((sum, p) => sum + (p.listingsNew || 0), 0);
  const totalFound = platformStats.reduce((sum, p) => sum + (p.listingsFound || 0), 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("marketIntel")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/market-intelligence`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {!isEnabled ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("marketIntelDisabled")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("marketIntelHint")}
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href={`/${locale}/app/market-intelligence/settings`}>
                {t("enableMarketIntel")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status overview */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="text-sm font-medium">
                  {t(`scrapeStatus.${status}`)}
                </span>
              </div>
              <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                {totalListings.toLocaleString()} {t("listings")}
              </Badge>
            </div>

            {/* Last/Next scrape times */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("lastScrape")}</p>
                <p className="font-medium">
                  {lastScrapeAt ? moment(lastScrapeAt).fromNow() : t("never")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("nextScrape")}</p>
                <p className="font-medium">
                  {nextScrapeAt ? moment(nextScrapeAt).fromNow() : t("notScheduled")}
                </p>
              </div>
            </div>

            {/* Latest run summary */}
            {totalFound > 0 && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{t("latestRun")}</span>
                  <span className="text-xs text-muted-foreground">
                    {totalNew} {t("newListings")}
                  </span>
                </div>
                <div className="space-y-2">
                  {platformStats.slice(0, 3).map((platform) => (
                    <div key={platform.platform} className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1 capitalize">
                        {platform.platform.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {platform.listingsFound}
                      </span>
                      {platform.listingsNew > 0 && (
                        <Badge variant="success" className="text-[10px] px-1 py-0">
                          +{platform.listingsNew}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action */}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/${locale}/app/market-intelligence/listings`} className="inline-flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("browseListings")}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
