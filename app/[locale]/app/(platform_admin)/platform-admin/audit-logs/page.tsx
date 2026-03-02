// app/[locale]/(platform-admin)/platform-admin/audit-logs/page.tsx
// Platform Admin Audit Logs - View all admin actions for compliance

import { Shield, Activity, Calendar, TrendingUp, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLogs, getAuditLogStats } from "@/actions/platform-admin/get-audit-logs";
import { AuditLogsDataTable } from "./components/AuditLogsDataTable";

interface AuditLogsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    adminId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PlatformAdminAuditLogsPage({
  params,
  searchParams,
}: AuditLogsPageProps) {
  const { locale } = await params;
  const search = await searchParams;

  // Parse search params
  const page = parseInt(search.page || "1", 10);
  const adminId = search.adminId;
  const action = search.action as any;
  const startDate = search.startDate;
  const endDate = search.endDate;

  // Get logs and stats in parallel
  const [logsData, stats] = await Promise.all([
    getAuditLogs({
      page,
      pageSize: 50,
      adminId,
      action,
      startDate,
      endDate,
    }),
    getAuditLogStats(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Admin Audit Logs
            </h1>
            <p className="text-muted-foreground">
              Security and compliance tracking of all platform admin actions
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logsToday.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Actions today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Week
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logsThisWeek.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Actions this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Month
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logsThisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Actions this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Actions */}
        {stats.topActions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Top Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topActions.map((item, index) => (
                  <div key={item.action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-mono">{item.action}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <AuditLogsDataTable
          logs={logsData.logs}
          totalCount={logsData.total}
          page={logsData.page}
          totalPages={logsData.totalPages}
          currentAdminId={adminId}
          currentAction={action}
          currentStartDate={startDate}
          currentEndDate={endDate}
          locale={locale}
        />
      </div>
    </div>
  );
}
