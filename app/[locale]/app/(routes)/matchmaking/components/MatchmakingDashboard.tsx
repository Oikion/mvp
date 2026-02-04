"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Building2, 
  Target, 
  TrendingUp,
  AlertCircle,
  Flame,
  ArrowRight,
  BarChart3
} from "lucide-react";
import type { MatchAnalytics } from "@/lib/matchmaking";
import { TopMatchesGrid } from "./TopMatchesGrid";
import { MatchDistributionChart } from "./MatchDistributionChart";
import { UnmatchedClientsList } from "./UnmatchedClientsList";
import { HotPropertiesList } from "./HotPropertiesList";

interface Props {
  locale: string;
  dict: any;
  analytics: MatchAnalytics;
}

export function MatchmakingDashboard({ locale, dict, analytics }: Props) {
  const t = useTranslations("matchmaking");
  const [activeTab, setActiveTab] = useState("overview");

  const statsCards = [
    {
      title: t("dashboard.stats.activeClients"),
      value: analytics.totalClients,
      icon: Users,
      description: t("dashboard.stats.activeClientsDesc"),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("dashboard.stats.availableProperties"),
      value: analytics.totalProperties,
      icon: Building2,
      description: t("dashboard.stats.availablePropertiesDesc"),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t("dashboard.stats.clientsWithMatches"),
      value: analytics.clientsWithMatches,
      icon: Target,
      description: `${analytics.totalClients > 0 ? Math.round((analytics.clientsWithMatches / analytics.totalClients) * 100) : 0}% ${t("dashboard.stats.clientsWithMatchesDesc")}`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t("dashboard.stats.averageMatchScore"),
      value: `${analytics.averageMatchScore}%`,
      icon: TrendingUp,
      description: t("dashboard.stats.averageMatchScoreDesc"),
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="inline-grid grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 shrink-0" />
            {t("dashboard.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="matches">
            <Target className="h-4 w-4 shrink-0" />
            {t("dashboard.tabs.matches")}
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("dashboard.tabs.unmatched")}
          </TabsTrigger>
          <TabsTrigger value="hot">
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
                <MatchDistributionChart distribution={analytics.matchDistribution} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.charts.qualityOverview")}</CardTitle>
                <CardDescription>
                  {t("dashboard.charts.qualityOverviewDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.matchDistribution.map((bucket) => {
                  const total = analytics.matchDistribution.reduce((sum, b) => sum + b.count, 0);
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
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("matches")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-success">
                      {analytics.topMatches.filter(m => m.overallScore >= 70).length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("dashboard.quickStats.excellentMatches")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("unmatched")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-warning">
                      {analytics.unmatchedClients.length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("dashboard.quickStats.clientsNeedProperties")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("hot")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-destructive">
                      {analytics.hotProperties.length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("dashboard.quickStats.highDemandProperties")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Matches Tab */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("topMatches.title")}
              </CardTitle>
              <CardDescription>
                {t("topMatches.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopMatchesGrid matches={analytics.topMatches} locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unmatched Clients Tab */}
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
              <UnmatchedClientsList clients={analytics.unmatchedClients} locale={locale} />
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
              <HotPropertiesList properties={analytics.hotProperties} locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
