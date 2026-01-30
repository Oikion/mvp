// app/[locale]/(platform-admin)/platform-admin/logbook/page.tsx
// Platform Admin Logbook - View admin access history

import { getTranslations } from "next-intl/server";
import { BookOpen, Users, Calendar, TrendingUp, Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminLogs, getAdminLogStats } from "@/actions/platform-admin/get-admin-logs";
import { LogbookDataTable } from "./components/LogbookDataTable";

interface LogbookPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PlatformAdminLogbookPage({
  params,
  searchParams,
}: LogbookPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");

  // Parse search params
  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const startDate = search.startDate;
  const endDate = search.endDate;

  // Get logs and stats in parallel
  const [logsData, stats] = await Promise.all([
    getAdminLogs({
      page,
      pageSize: 20,
      search: searchQuery || undefined,
      startDate,
      endDate,
    }),
    getAdminLogStats(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("logbook.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("logbook.description")}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("logbook.stats.totalSessions")}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {t("logbook.stats.allTime")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("logbook.stats.uniqueAdmins")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueAdmins}</div>
              <p className="text-xs text-muted-foreground">
                {t("logbook.stats.totalAdmins")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("logbook.stats.today")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionsToday}</div>
              <p className="text-xs text-muted-foreground">
                {t("logbook.stats.sessionsToday")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("logbook.stats.thisWeek")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionsThisWeek}</div>
              <p className="text-xs text-muted-foreground">
                {t("logbook.stats.sessionsThisWeek")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("logbook.stats.thisMonth")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {t("logbook.stats.sessionsThisMonth")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <LogbookDataTable
          logs={logsData.logs}
          totalCount={logsData.total}
          page={logsData.page}
          totalPages={logsData.totalPages}
          currentSearch={searchQuery}
          currentStartDate={startDate}
          currentEndDate={endDate}
          locale={locale}
        />
      </div>
    </div>
  );
}
