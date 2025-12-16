import { Suspense } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  DollarSignIcon,
  Building2,
  Users,
  Activity,
  Home
} from "lucide-react";

import { getDictionary } from "@/dictionaries";

import Container from "./components/ui/Container";
import LoadingBox from "./components/dasboard/loading-box";
import { QuickViewList } from "./components/dashboard/QuickViewList";
import { StatsCard } from "@/components/ui/stats-card";
import { VisitorsChart } from "./components/dashboard/VisitorsChart";
import { StatsChart } from "./components/dashboard/StatsChart";

import { getModules } from "@/actions/get-modules";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getRecentProperties } from "@/actions/dashboard/get-recent-properties";
import { getRecentClients } from "@/actions/dashboard/get-recent-clients";
import { getClientsByStatus, getClientsCount, getClientsByMonth } from "@/actions/reports/get-clients-stats";
import { getPropertiesByStatus, getPropertiesCount, getPropertiesByMonth } from "@/actions/reports/get-properties-stats";
import { getTotalRevenue, getRevenueTrend } from "@/actions/dashboard/get-total-revenue";
import { getAccountsTrend } from "@/actions/dashboard/get-accounts-trend";
import { getActiveUsersTrend } from "@/actions/dashboard/get-active-users-trend";
import { getPropertiesTrend } from "@/actions/dashboard/get-properties-trend";

const DashboardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  try {
    const user = await getCurrentUser();
    
    const { locale } = await params;
    const dict = await getDictionary(locale);

    const [
      modules,
      users,
      recentClients,
      recentProperties,
      clientsByStatus,
      propertiesByStatus,
      propertiesCount,
      clientsCount,
      clientsMonthly,
      propertiesMonthly,
      totalRevenue,
      revenueTrend,
      clientsTrend,
      propertiesTrend,
      usersTrend,
    ] = await Promise.all([
      getModules(),
      getActiveUsersCount(),
      getRecentClients(5),
      getRecentProperties(5),
      getClientsByStatus(),
      getPropertiesByStatus(),
      getPropertiesCount(),
      getClientsCount(),
      getClientsByMonth(),
      getPropertiesByMonth(),
      getTotalRevenue(),
      getRevenueTrend(),
      getAccountsTrend(), // This actually counts clients trend
      getPropertiesTrend(),
      getActiveUsersTrend(),
    ]);

    const crmModule = modules.find((module) => module.name === "crm");
    const activityTimeline = buildActivityTimeline(clientsMonthly, propertiesMonthly);

    return (
      <Container
        title={dict.dashboard.containerTitle}
        description={dict.dashboard.containerDescription}
      >
        <div className="space-y-8">
          {/* Section 1: Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Suspense fallback={<LoadingBox />}>
              <StatsCard
                title={dict.dashboard.totalRevenue}
                value={`€${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<DollarSignIcon className="h-4 w-4" />}
                trend={revenueTrend.value > 0 ? `${revenueTrend.direction === "up" ? "+" : "-"}${revenueTrend.value.toFixed(1)}%` : undefined}
                trendUp={revenueTrend.direction === "up"}
                description={dict.dashboard.fromLastMonth}
                emptyMessage={dict.dashboard.noRevenueYet}
                actionHref="/mls/properties"
                actionLabel={dict.dashboard.addFirstProperty}
                viewLabel={dict.dashboard.viewProperties}
              />
            </Suspense>
            
            {crmModule?.enabled && (
              <Suspense fallback={<LoadingBox />}>
                <StatsCard
                  title={dict.dashboard.clients}
                  value={clientsCount.toString()}
                  icon={<Users className="h-4 w-4" />}
                  trend={clientsTrend.value > 0 ? `${clientsTrend.direction === "up" ? "+" : "-"}${clientsTrend.value.toFixed(1)}%` : undefined}
                  trendUp={clientsTrend.direction === "up"}
                  description={dict.dashboard.fromLastMonth}
                  emptyMessage={dict.dashboard.noClientsYet}
                  actionHref="/crm/clients"
                  actionLabel={dict.dashboard.addFirstClient}
                  viewLabel={dict.dashboard.viewClients}
                />
              </Suspense>
            )}

            <Suspense fallback={<LoadingBox />}>
              <StatsCard
                title={dict.dashboard.properties}
                value={propertiesCount.toString()}
                icon={<Home className="h-4 w-4" />}
                trend={propertiesTrend.value > 0 ? `${propertiesTrend.direction === "up" ? "+" : "-"}${propertiesTrend.value.toFixed(1)}%` : undefined}
                trendUp={propertiesTrend.direction === "up"}
                description={dict.dashboard.fromLastMonth}
                emptyMessage={dict.dashboard.noPropertiesYet}
                actionHref="/mls/properties"
                actionLabel={dict.dashboard.addFirstProperty}
                viewLabel={dict.dashboard.viewProperties}
              />
            </Suspense>

            <Suspense fallback={<LoadingBox />}>
              <StatsCard
                title={dict.dashboard.activeUsers}
                value={users.toString()}
                icon={<Activity className="h-4 w-4" />}
                trend={usersTrend.value > 0 && usersTrend.direction !== "neutral" ? `${usersTrend.direction === "up" ? "+" : "-"}${usersTrend.value.toFixed(1)}%` : undefined}
                trendUp={usersTrend.direction === "up"}
                description={usersTrend.direction === "neutral" ? dict.dashboard.currentlyActiveUsers : dict.dashboard.fromLastPeriod}
                emptyMessage={dict.dashboard.noTeamMembersYet}
                actionHref="/employees"
                actionLabel={dict.dashboard.inviteTeamMember}
                viewLabel={dict.dashboard.viewTeam}
              />
            </Suspense>
          </div>
          
          {/* Section 2: Main Chart + Recent Clients */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
               <VisitorsChart
                 title={dict.dashboard.activityTimeline}
                 description={dict.dashboard.activityTimelineDescription}
                 emptyMessage={dict.dashboard.noActivityData}
                 propertiesLabel={dict.dashboard.propertiesLabel}
                 clientsLabel={dict.dashboard.clientsLabel}
                 data={activityTimeline}
               />
            </div>
            <div className="col-span-3">
               {crmModule?.enabled && (
                <QuickViewList
                  title={dict.dashboard.recentClients}
                  items={recentClients}
                  viewAllHref="/crm/clients"
                  icon={<Users className="h-5 w-5 text-muted-foreground" />}
                />
              )}
            </div>
          </div>

          {/* Section 3: Stats Charts + Recent Properties */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 grid gap-4 md:grid-cols-2">
                 {crmModule?.enabled && clientsByStatus.length > 0 && (
                    <StatsChart
                      title={dict.dashboard.clientsByStatus}
                      description={dict.dashboard.clientsDistribution.replace("{count}", clientsCount.toString())}
                      data={clientsByStatus}
                      color="hsl(var(--chart-2))"
                    />
                 )}
                 {propertiesByStatus.length > 0 && (
                    <StatsChart
                      title={dict.dashboard.propertiesByStatus}
                      description={dict.dashboard.propertiesDistribution.replace("{count}", propertiesCount.toString())}
                      data={propertiesByStatus}
                      color="hsl(var(--chart-1))"
                    />
                 )}
            </div>
             <div className="col-span-3">
              <QuickViewList
                title={dict.dashboard.recentProperties}
                items={recentProperties}
                viewAllHref="/mls/properties"
                icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
              />
            </div>
          </div>
        </div>
      </Container>
    );
  } catch (error) {
    return null;
  }
};

export default DashboardPage;

type MonthlyStat = {
  year?: number
  month?: number
  name?: string
  Number?: number
}

function buildActivityTimeline(
  clientsData: MonthlyStat[],
  propertiesData: MonthlyStat[]
) {
  const timelineMap = new Map<
    string,
    { timestamp: number; label: string; clients: number; properties: number }
  >()

  const parseYearMonth = (item: MonthlyStat) => {
    let { year, month } = item
    if (!year || !month) {
      if (item.name) {
        const [maybeMonth, maybeYear] = item.name.split("/")
        const parsedMonth = parseInt(maybeMonth, 10)
        const parsedYear = parseInt(maybeYear, 10)
        month = Number.isNaN(parsedMonth) ? undefined : parsedMonth
        year = Number.isNaN(parsedYear) ? undefined : parsedYear
      }
    }
    if (!year || !month) return null
    return { year, month }
  }

  const ensureEntry = (year: number, month: number) => {
    const key = `${year}-${month}`
    if (!timelineMap.has(key)) {
      const date = new Date(year, month - 1)
      timelineMap.set(key, {
        timestamp: date.getTime(),
        label: date.toLocaleString("default", { month: "short", year: "numeric" }),
        clients: 0,
        properties: 0,
      })
    }
    return timelineMap.get(key)!
  }

  clientsData.forEach((item) => {
    const parsed = parseYearMonth(item)
    if (!parsed) return
    const entry = ensureEntry(parsed.year, parsed.month)
    entry.clients = item.Number ?? 0
  })

  propertiesData.forEach((item) => {
    const parsed = parseYearMonth(item)
    if (!parsed) return
    const entry = ensureEntry(parsed.year, parsed.month)
    entry.properties = item.Number ?? 0
  })

  return Array.from(timelineMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-6)
    .map(({ label, clients, properties }) => ({
      date: label,
      clients,
      properties,
    }))
}

