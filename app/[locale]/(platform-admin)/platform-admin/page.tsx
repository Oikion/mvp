// app/[locale]/(platform-admin)/platform-admin/page.tsx
// Platform Admin Dashboard - App-wide metrics and management

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Building2,
  Users,
  UserCheck,
  UserPlus,
  Clock,
  UserX,
  Shield,
  Settings,
  LayoutDashboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformMetrics } from "@/actions/platform-admin/get-metrics";
import { getPlatformAdminUser } from "@/lib/platform-admin";
import { PlatformAdminHeader } from "./components/PlatformAdminHeader";

export default async function PlatformAdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("platformAdmin");
  
  // Get admin user info
  const adminUser = await getPlatformAdminUser();
  
  // Get platform metrics
  const metrics = await getPlatformMetrics();

  return (
    <div className="flex flex-col min-h-screen">
      <PlatformAdminHeader 
        adminUser={adminUser} 
        locale={locale}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("dashboard.description")}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button asChild>
            <Link href={`/${locale}/platform-admin/users`}>
              <Users className="h-4 w-4 mr-2" />
              {t("dashboard.manageUsers")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/platform-admin/organizations`}>
              <Building2 className="h-4 w-4 mr-2" />
              {t("dashboard.viewOrganizations")}
            </Link>
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Total Organizations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.totalOrganizations")}
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.registeredOrganizations")}
              </p>
            </CardContent>
          </Card>

          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.totalUsers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.allRegisteredUsers")}
              </p>
            </CardContent>
          </Card>

          {/* Active Users (Last 30 Days) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.activeUsers")}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsersLast30Days}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.last30Days")}
              </p>
            </CardContent>
          </Card>

          {/* New Users This Month */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.newUsers")}
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.newUsersThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.thisMonth")}
              </p>
            </CardContent>
          </Card>

          {/* Pending Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.pendingUsers")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendingUsers}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.awaitingActivation")}
              </p>
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("metrics.inactiveUsers")}
              </CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.inactiveUsers}</div>
              <p className="text-xs text-muted-foreground">
                {t("metrics.suspendedOrDeactivated")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Info Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" />
              {t("dashboard.adminInfo")}
            </CardTitle>
            <CardDescription>
              {t("dashboard.adminInfoDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">{t("dashboard.loggedInAs")}</p>
                <p className="text-sm text-muted-foreground">
                  {adminUser?.email || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t("dashboard.adminId")}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {adminUser?.clerkId?.slice(0, 16)}...
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {t("dashboard.auditNote")}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
