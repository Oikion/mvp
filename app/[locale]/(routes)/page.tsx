import { Suspense } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  DollarSignIcon,
  Building2,
  Users,
  Activity,
  CreditCard
} from "lucide-react";

import { getDictionary } from "@/dictionaries";

import Container from "./components/ui/Container";
import LoadingBox from "./components/dasboard/loading-box";
import { QuickViewList } from "./components/dashboard/QuickViewList";
import { MetricCard } from "./components/dashboard/MetricCard";
import { VisitorsChart } from "./components/dashboard/VisitorsChart";
import { StatsChart } from "./components/dashboard/StatsChart";

import { getModules } from "@/actions/get-modules";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getRecentProperties } from "@/actions/dashboard/get-recent-properties";
import { getRecentClients } from "@/actions/dashboard/get-recent-clients";
import { getClientsByStatus, getClientsCount, getClientsByMonth } from "@/actions/reports/get-clients-stats";
import { getPropertiesByStatus, getPropertiesCount, getPropertiesByMonth } from "@/actions/reports/get-properties-stats";
import { getTotalRevenue, getRevenueTrend } from "@/actions/dashboard/get-total-revenue";
import { getContactsTrend } from "@/actions/dashboard/get-contacts-trend";
import { getAccountsTrend } from "@/actions/dashboard/get-accounts-trend";
import { getActiveUsersTrend } from "@/actions/dashboard/get-active-users-trend";

const DashboardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  try {
    const user = await getCurrentUser();
    
    const { locale } = await params;
    const dict = await getDictionary(locale);

    const [
      modules,
      contacts,
      users,
      accounts,
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
      contactsTrend,
      accountsTrend,
      usersTrend,
    ] = await Promise.all([
      getModules(),
      getContactCount(),
      getActiveUsersCount(),
      getAccountsCount(),
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
      getContactsTrend(),
      getAccountsTrend(),
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
              <MetricCard
                title={dict.dashboard.totalRevenue}
                value={`€${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<DollarSignIcon className="h-4 w-4 text-muted-foreground" />}
                trend={{
                  value: revenueTrend.value,
                  label: dict.dashboard.fromLastMonth,
                  direction: revenueTrend.direction,
                }}
                description={
                  revenueTrend.direction === "up"
                    ? `+${revenueTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                    : revenueTrend.direction === "down"
                    ? `-${revenueTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                    : dict.dashboard.noChangeFromLastMonth
                }
              />
            </Suspense>
            
            {crmModule?.enabled && (
              <>
                <Suspense fallback={<LoadingBox />}>
                  <MetricCard
                    title={dict.dashboard.contacts}
                    value={contacts.toString()}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    trend={{
                      value: contactsTrend.value,
                      label: dict.dashboard.fromLastMonth,
                      direction: contactsTrend.direction,
                    }}
                    description={
                      contactsTrend.direction === "up"
                        ? `+${contactsTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                        : contactsTrend.direction === "down"
                        ? `-${contactsTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                        : dict.dashboard.noChangeFromLastMonth
                    }
                  />
                </Suspense>
                <Suspense fallback={<LoadingBox />}>
                  <MetricCard
                    title={dict.dashboard.accounts}
                    value={accounts.toString()}
                    icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                    trend={{
                      value: accountsTrend.value,
                      label: dict.dashboard.fromLastMonth,
                      direction: accountsTrend.direction,
                    }}
                    description={
                      accountsTrend.direction === "up"
                        ? `+${accountsTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                        : accountsTrend.direction === "down"
                        ? `-${accountsTrend.value.toFixed(1)}% ${dict.dashboard.fromLastMonth}`
                        : dict.dashboard.noChangeFromLastMonth
                    }
                  />
                </Suspense>
              </>
            )}

            <Suspense fallback={<LoadingBox />}>
              <MetricCard
                title={dict.dashboard.activeUsers}
                value={users.toString()}
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                trend={{
                  value: usersTrend.value,
                  label: usersTrend.direction === "neutral" ? dict.dashboard.currentlyActive : dict.dashboard.fromLastPeriod,
                  direction: usersTrend.direction,
                }}
                description={
                  usersTrend.direction === "neutral"
                    ? dict.dashboard.currentlyActiveUsers
                    : usersTrend.direction === "up"
                    ? `+${usersTrend.value.toFixed(1)}% ${dict.dashboard.fromLastPeriod}`
                    : `-${usersTrend.value.toFixed(1)}% ${dict.dashboard.fromLastPeriod}`
                }
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

