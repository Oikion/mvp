"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Target,
  TrendingUp,
  AlertCircle,
  Flame,
  ArrowRight,
  BarChart3,
  FileText,
  Globe,
  RefreshCw,
} from "lucide-react";
import type { RequestMatchAnalytics } from "@/actions/matchmaking/types";
import type { PersistedMatchItem } from "@/actions/matchmaking/get-persisted-matches";
import type { CrossOrgMatchSummary } from "@/actions/network/get-cross-org-matches";
import { triggerIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import { MatchDistributionChart } from "./MatchDistributionChart";
import { UnmatchedClientsList } from "./UnmatchedClientsList";
import { HotPropertiesList } from "./HotPropertiesList";
import { RequestMatchesTab } from "./RequestMatchesTab";
import { NetworkMatchesSection } from "./NetworkMatchesSection";
import { PolisSettingsSheet } from "@/components/matchmaking/PolisSettingsSheet";
import { useAppToast } from "@/hooks/use-app-toast";
import type { OrgNetworkSettings } from "@prisma/client";

type Partner = Awaited<ReturnType<typeof import("@/actions/network/manage-network-settings").getNetworkPartners>>[number];

interface Props {
  locale: string;
  dict: any;
  requestAnalytics: RequestMatchAnalytics;
  persistedMatches: PersistedMatchItem[];
  networkMatches?: CrossOrgMatchSummary;
  networkSettings?: OrgNetworkSettings | null;
  networkPartners?: Partner[];
}

type Mode = "org" | "polis";

export function MatchmakingDashboard({
  locale,
  requestAnalytics,
  persistedMatches,
  networkMatches,
  networkSettings,
  networkPartners,
}: Props) {
  const t = useTranslations("matchmaking");
  const { toast } = useAppToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [mode, setMode] = useState<Mode>("org");
  const [isPending, startTransition] = useTransition();

  const { requestStats, matchDistribution } = requestAnalytics;

  const excellentMatches = persistedMatches.filter((m) => m.matchScore >= 70).length;

  const statsCards = [
    {
      title: t("dashboard.stats.activeClients"),
      value: requestStats.activeRequests,
      icon: FileText,
      description: t("dashboard.stats.activeClientsDesc"),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("dashboard.stats.availableProperties"),
      value: requestAnalytics.totalProperties,
      icon: Building2,
      description: t("dashboard.stats.availablePropertiesDesc"),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t("dashboard.stats.clientsWithMatches"),
      value: requestStats.requestsWithMatches,
      icon: Target,
      description: `${requestStats.activeRequests > 0 ? Math.round((requestStats.requestsWithMatches / requestStats.activeRequests) * 100) : 0}% ${t("dashboard.stats.clientsWithMatchesDesc")}`,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: t("dashboard.stats.averageMatchScore"),
      value: `${requestStats.avgMatchScore}%`,
      icon: TrendingUp,
      description: t("dashboard.stats.averageMatchScoreDesc"),
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  function handleRunNow() {
    startTransition(async () => {
      const result = await triggerIntraOrgMatches();
      if (result && "error" in result) {
        toast.error(result.error ?? t("requestMatches.runNow.error"), { isTranslationKey: false });
      } else {
        toast.success(t("requestMatches.runNow.success"), {
          description: t("requestMatches.runNow.successHint"),
          isTranslationKey: false,
        });
      }
    });
  }

  return (
    <div className="space-y-6" data-tour="matchmaking-results">
      {/* Mode Toggle + Polis Settings */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border bg-muted p-1 gap-1">
          <Button
            variant={mode === "org" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setMode("org")}
          >
            <Building2 className="h-4 w-4" />
            {t("mode.orgOnly")}
          </Button>
          <Button
            variant={mode === "polis" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setMode("polis")}
          >
            <Globe className="h-4 w-4" />
            {t("mode.polis")}
          </Button>
        </div>
        {mode === "polis" && (
          <PolisSettingsSheet
            initialSettings={networkSettings ?? null}
            initialPartners={networkPartners ?? []}
          />
        )}
      </div>

      {/* Oikion Polis View */}
      {mode === "polis" && networkMatches && (
        <NetworkMatchesSection summary={networkMatches} locale={locale} />
      )}
      {mode === "polis" && !networkMatches && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("mode.polisUnavailable")}</p>
          </CardContent>
        </Card>
      )}

      {/* Org-Only View */}
      {mode === "org" && (
        <>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex w-full overflow-x-auto sm:inline-grid sm:grid-cols-4">
              <TabsTrigger value="overview" className="shrink-0">
                <BarChart3 className="h-4 w-4 shrink-0" />
                {t("dashboard.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger value="matches" className="shrink-0">
                <FileText className="h-4 w-4 shrink-0" />
                {t("dashboard.tabs.matches")}
              </TabsTrigger>
              <TabsTrigger value="unmatched" className="shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t("dashboard.tabs.unmatched")}
              </TabsTrigger>
              <TabsTrigger value="hot" className="shrink-0">
                <Flame className="h-4 w-4 shrink-0" />
                {t("dashboard.tabs.hot")}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Match Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {t("dashboard.charts.distribution")}
                    </CardTitle>
                    <CardDescription>
                      {t("dashboard.charts.distributionDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MatchDistributionChart distribution={matchDistribution} />
                  </CardContent>
                </Card>

                {/* Match Quality Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dashboard.charts.qualityOverview")}</CardTitle>
                    <CardDescription>
                      {t("dashboard.charts.qualityOverviewDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {matchDistribution.map((bucket) => {
                      const total = matchDistribution.reduce((sum, b) => sum + b.count, 0);
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

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveTab("matches")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {excellentMatches}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.quickStats.excellentMatches")}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveTab("unmatched")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-warning">
                          {requestStats.activeRequests - requestStats.requestsWithMatches}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.quickStats.clientsNeedProperties")}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveTab("matches")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {persistedMatches.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.quickStats.persistedMatches")}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="matches">
              <RequestMatchesTab
                analytics={requestAnalytics}
                persistedMatches={persistedMatches}
                locale={locale}
                onRunNow={handleRunNow}
                isRunning={isPending}
              />
            </TabsContent>

            {/* Unmatched Tab */}
            <TabsContent value="unmatched">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    {t("unmatchedClients.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("unmatchedClients.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UnmatchedClientsList clients={requestAnalytics.unmatchedClients} locale={locale} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hot Properties Tab */}
            <TabsContent value="hot">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-destructive" />
                    {t("hotProperties.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("hotProperties.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HotPropertiesList properties={requestAnalytics.hotProperties} locale={locale} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
