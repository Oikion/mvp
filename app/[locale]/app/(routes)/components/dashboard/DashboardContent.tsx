"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  DollarSignIcon,
  Building2,
  Users,
  Activity,
  Home,
  Settings2,
} from "lucide-react";

import { DashboardConfigProvider } from "@/lib/dashboard";
import { DashboardGrid, WidgetWrapper, WidgetSettingsPanel } from "@/components/dashboard";
import type { DashboardConfig, WidgetConfig } from "@/lib/dashboard/types";
import { DashboardHeader } from "./DashboardHeader";
import { QuickActions } from "./QuickActions";
import { ActivityFeed } from "./ActivityFeed";
import { UpcomingEvents } from "./UpcomingEvents";
import { DocumentsWidget } from "./DocumentsWidget";
import { RecentMessages } from "./RecentMessages";
import { QuickViewList } from "./QuickViewList";
import { VisitorsChart } from "./VisitorsChart";
import { StatsChart } from "./StatsChart";
import { StatsCard } from "@/components/ui/stats-card";
import { FinancialReportDialog } from "@/components/dashboard/FinancialReportDialog";
import { Button } from "@/components/ui/button";
import type { ActivityItem } from "@/actions/feed/get-recent-activities";
import type { UpcomingEvent } from "@/actions/dashboard/get-upcoming-events";
import type { RecentDocument } from "@/actions/dashboard/get-recent-documents";
import type { Conversation } from "./RecentMessages";
import type { QuickViewItem } from "./QuickViewList";

// Types for trend data
type TrendDirection = "up" | "down" | "neutral";
interface TrendData {
  value: number;
  direction: TrendDirection;
}

// Types for dashboard data
interface DashboardData {
  user: {
    id: string;
    name: string | null;
  };
  users: number;
  recentClients: Array<Record<string, unknown>>;
  recentProperties: Array<Record<string, unknown>>;
  clientsByStatus: { name: string; value: number }[];
  propertiesByStatus: { name: string; value: number }[];
  propertiesCount: number;
  clientsCount: number;
  activityTimeline: { date: string; clients: number; properties: number }[];
  totalRevenue: number;
  revenueTrend: TrendData;
  clientsTrend: TrendData;
  propertiesTrend: TrendData;
  usersTrend: TrendData;
  upcomingEvents: UpcomingEvent[];
  recentDocuments: RecentDocument[];
  recentActivities: ActivityItem[];
  conversations: Array<Record<string, unknown>>;
}

interface DashboardContentProps {
  data: DashboardData;
  initialConfig: DashboardConfig | null;
  dict: DashboardDictionaryContainer;
}

type DashboardDictionary = Record<string, string>;
interface DashboardDictionaryContainer {
  dashboard: DashboardDictionary;
  [key: string]: unknown;
}

/**
 * DashboardContentInner
 * 
 * The actual dashboard grid that uses the dashboard config context.
 */
function DashboardContentInner({ data, dict }: Readonly<{ data: DashboardData; dict: DashboardDictionaryContainer }>) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  // Render individual widget based on ID
  const renderWidget = (widgetId: string, widgetConfig: WidgetConfig) => {
    const wrapContent = (content: React.ReactNode) => (
      <WidgetWrapper widgetConfig={widgetConfig}>
        {content}
      </WidgetWrapper>
    );

    switch (widgetId) {
      case "quick-actions":
        return wrapContent(<QuickActions />);

      case "revenue-stats":
        return wrapContent(
          <StatsCard
            title={dict.dashboard.totalRevenue}
            value={`€${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSignIcon className="h-4 w-4" />}
            trend={data.revenueTrend.value > 0 ? `${data.revenueTrend.direction === "up" ? "+" : "-"}${data.revenueTrend.value.toFixed(1)}%` : undefined}
            trendUp={data.revenueTrend.direction === "up"}
            description={dict.dashboard.fromLastMonth}
            emptyMessage={dict.dashboard.noRevenueYet}
            customActions={
              !data.totalRevenue || data.totalRevenue === 0 ? undefined : (
                <FinancialReportDialog locale={locale} />
              )
            }
          />
        );

      case "clients-stats":
        return wrapContent(
          <StatsCard
            title={dict.dashboard.clients}
            value={data.clientsCount.toString()}
            icon={<Users className="h-4 w-4" />}
            trend={data.clientsTrend.value > 0 ? `${data.clientsTrend.direction === "up" ? "+" : "-"}${data.clientsTrend.value.toFixed(1)}%` : undefined}
            trendUp={data.clientsTrend.direction === "up"}
            description={dict.dashboard.fromLastMonth}
            emptyMessage={dict.dashboard.noClientsYet}
            actionHref={`/${locale}/app/crm`}
            actionLabel={dict.dashboard.addFirstClient}
            viewHref={`/${locale}/app/crm`}
            viewLabel={dict.dashboard.viewClients}
            addHref={`/${locale}/app/crm?action=create`}
            addLabel={dict.dashboard.addClient}
          />
        );

      case "properties-stats":
        return wrapContent(
          <StatsCard
            title={dict.dashboard.properties}
            value={data.propertiesCount.toString()}
            icon={<Home className="h-4 w-4" />}
            trend={data.propertiesTrend.value > 0 ? `${data.propertiesTrend.direction === "up" ? "+" : "-"}${data.propertiesTrend.value.toFixed(1)}%` : undefined}
            trendUp={data.propertiesTrend.direction === "up"}
            description={dict.dashboard.fromLastMonth}
            emptyMessage={dict.dashboard.noPropertiesYet}
            actionHref={`/${locale}/app/mls`}
            actionLabel={dict.dashboard.addFirstProperty}
            viewHref={`/${locale}/app/mls`}
            viewLabel={dict.dashboard.viewProperties}
            addHref={`/${locale}/app/mls?action=create`}
            addLabel={dict.dashboard.addProperty}
          />
        );

      case "active-users-stats":
        return wrapContent(
          <StatsCard
            title={dict.dashboard.activeUsers}
            value={data.users.toString()}
            icon={<Activity className="h-4 w-4" />}
            trend={data.usersTrend.value > 0 && data.usersTrend.direction !== "neutral" ? `${data.usersTrend.direction === "up" ? "+" : "-"}${data.usersTrend.value.toFixed(1)}%` : undefined}
            trendUp={data.usersTrend.direction === "up"}
            description={data.usersTrend.direction === "neutral" ? dict.dashboard.currentlyActiveUsers : dict.dashboard.fromLastPeriod}
            emptyMessage={dict.dashboard.noTeamMembersYet}
            actionHref={`/${locale}/app/employees`}
            actionLabel={dict.dashboard.inviteTeamMember}
            viewHref={`/${locale}/app/employees`}
            viewLabel={dict.dashboard.viewTeam}
            addHref={`/${locale}/app/employees?action=invite`}
            addLabel={dict.dashboard.addUser}
          />
        );

      case "activity-chart":
        return wrapContent(
          <div className="h-[400px]">
            <VisitorsChart
              title={dict.dashboard.activityTimeline}
              description={dict.dashboard.activityTimelineDescription}
              propertiesLabel={dict.dashboard.propertiesLabel}
              clientsLabel={dict.dashboard.clientsLabel}
              data={data.activityTimeline}
              emptyTitle={dict.dashboard.gatheringInsights}
              emptyHint={dict.dashboard.activityDataHint}
            />
          </div>
        );

      case "activity-feed":
        return wrapContent(
          <ActivityFeed activities={data.recentActivities} />
        );

      case "upcoming-events":
        return wrapContent(
          <UpcomingEvents events={data.upcomingEvents} />
        );

      case "recent-messages":
        return wrapContent(
          <RecentMessages
            conversations={data.conversations as unknown as Conversation[]}
            currentUserId={data.user.id}
          />
        );

      case "clients-status-chart":
        if (data.clientsByStatus.length === 0) return null;
        return wrapContent(
          <StatsChart
            title={dict.dashboard.clientsByStatus}
            description={dict.dashboard.clientsDistribution?.replace("{count}", data.clientsCount.toString())}
            data={data.clientsByStatus}
          />
        );

      case "properties-status-chart":
        if (data.propertiesByStatus.length === 0) return null;
        return wrapContent(
          <StatsChart
            title={dict.dashboard.propertiesByStatus}
            description={dict.dashboard.propertiesDistribution?.replace("{count}", data.propertiesCount.toString())}
            data={data.propertiesByStatus}
          />
        );

      case "recent-clients":
        return wrapContent(
          <QuickViewList
            title={dict.dashboard.recentClients}
            items={data.recentClients as unknown as QuickViewItem[]}
            viewAllHref={`/${locale}/app/crm`}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
        );

      case "recent-properties":
        return wrapContent(
          <QuickViewList
            title={dict.dashboard.recentProperties}
            items={data.recentProperties as unknown as QuickViewItem[]}
            viewAllHref={`/${locale}/app/mls`}
            icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
          />
        );

      case "documents":
        return wrapContent(
          <DocumentsWidget documents={data.recentDocuments} />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with personalized greeting and customize button */}
      <div className="flex items-center justify-between">
        <DashboardHeader userName={data.user.name} />
        <WidgetSettingsPanel
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {t("customize.button")}
            </Button>
          }
        />
      </div>

      {/* Customizable widget grid */}
      <DashboardGrid renderWidget={renderWidget} />
    </div>
  );
}

/**
 * DashboardContent
 * 
 * Client component wrapper that provides dashboard config context.
 */
export function DashboardContent({ data, initialConfig, dict }: DashboardContentProps) {
  return (
    <DashboardConfigProvider initialConfig={initialConfig}>
      <DashboardContentInner data={data} dict={dict} />
    </DashboardConfigProvider>
  );
}
