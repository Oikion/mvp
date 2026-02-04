import { getCurrentUser } from "@/lib/get-current-user";
import { getDictionary } from "@/dictionaries";
import { prismadb } from "@/lib/prisma";
import { redirect } from "next/navigation";

import Container from "./components/ui/Container";
import { DashboardContent } from "./components/dashboard/DashboardContent";
import { normalizeDashboardConfig } from "@/lib/dashboard/widget-registry";
import type { DashboardConfig } from "@/lib/dashboard/types";

import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getRecentProperties } from "@/actions/dashboard/get-recent-properties";
import { getRecentClients } from "@/actions/dashboard/get-recent-clients";
import { getClientsByStatus, getClientsCount, getClientsByMonth } from "@/actions/reports/get-clients-stats";
import { getPropertiesByStatus, getPropertiesCount, getPropertiesByMonth } from "@/actions/reports/get-properties-stats";
import { getTotalRevenue, getRevenueTrend } from "@/actions/dashboard/get-total-revenue";
import { getAccountsTrend } from "@/actions/dashboard/get-accounts-trend";
import { getActiveUsersTrend } from "@/actions/dashboard/get-active-users-trend";
import { getPropertiesTrend } from "@/actions/dashboard/get-properties-trend";
import { getUpcomingEvents } from "@/actions/dashboard/get-upcoming-events";
import { getRecentDocuments } from "@/actions/dashboard/get-recent-documents";
import { getRecentActivities } from "@/actions/feed/get-recent-activities";
import { getUserConversations } from "@/actions/messaging";

/**
 * Safe wrapper to handle errors in dashboard data fetching.
 * Returns default value if promise fails instead of crashing the entire page.
 */
async function safeAwait<T>(promise: Promise<T>, defaultValue: T, label?: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[DASHBOARD_DATA_ERROR]${label ? ` ${label}:` : ''}`, error);
    return defaultValue;
  }
}

const DashboardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  // Get user - redirect to sign in if not authenticated
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[DASHBOARD] User not authenticated:", error);
    redirect("/sign-in");
  }

  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch user's dashboard config and all dashboard data in parallel
  // Each promise is wrapped in safeAwait to prevent single failures from crashing the page
  const [
    userPreferences,
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
    upcomingEvents,
    recentDocuments,
    recentActivities,
    conversationsResult,
  ] = await Promise.all([
    safeAwait(
      prismadb.users.findUnique({
        where: { id: user.id },
        select: { dashboardConfig: true },
      }),
      null,
      "userPreferences"
    ),
    safeAwait(getActiveUsersCount(), 0, "activeUsersCount"),
    safeAwait(getRecentClients(8), [], "recentClients"),
    safeAwait(getRecentProperties(8), [], "recentProperties"),
    safeAwait(getClientsByStatus(), [], "clientsByStatus"),
    safeAwait(getPropertiesByStatus(), [], "propertiesByStatus"),
    safeAwait(getPropertiesCount(), 0, "propertiesCount"),
    safeAwait(getClientsCount(), 0, "clientsCount"),
    safeAwait(getClientsByMonth(), [], "clientsMonthly"),
    safeAwait(getPropertiesByMonth(), [], "propertiesMonthly"),
    safeAwait(getTotalRevenue(), 0, "totalRevenue"),
    safeAwait(getRevenueTrend(), { value: 0, direction: "neutral" as const }, "revenueTrend"),
    safeAwait(getAccountsTrend(), { value: 0, direction: "neutral" as const }, "clientsTrend"),
    safeAwait(getPropertiesTrend(), { value: 0, direction: "neutral" as const }, "propertiesTrend"),
    safeAwait(getActiveUsersTrend(), { value: 0, direction: "neutral" as const }, "usersTrend"),
    safeAwait(getUpcomingEvents(5), [], "upcomingEvents"),
    safeAwait(getRecentDocuments(15), [], "recentDocuments"),
    safeAwait(getRecentActivities(15), [], "recentActivities"),
    safeAwait(getUserConversations(), { success: false, conversations: [] }, "conversations"),
  ]);

  const activityTimeline = buildActivityTimeline(clientsMonthly, propertiesMonthly);
  const conversations = conversationsResult.success ? conversationsResult.conversations || [] : [];
  
  // Normalize the dashboard config (handles null/undefined and adds missing widgets)
  const dashboardConfig = normalizeDashboardConfig(
    userPreferences?.dashboardConfig as DashboardConfig | null
  );

  // Prepare dashboard data for the client component
  const dashboardData = {
    user: {
      id: user.id,
      name: user.name,
    },
    users,
    recentClients,
    recentProperties,
    clientsByStatus,
    propertiesByStatus,
    propertiesCount,
    clientsCount,
    activityTimeline,
    totalRevenue,
    revenueTrend,
    clientsTrend,
    propertiesTrend,
    usersTrend,
    upcomingEvents,
    recentDocuments,
    recentActivities,
    conversations,
  };

  return (
    <Container
      title={dict.dashboard.containerTitle}
      description={dict.dashboard.containerDescription}
    >
      <DashboardContent
        data={dashboardData}
        initialConfig={dashboardConfig}
        dict={dict}
      />
    </Container>
  );
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
        const parsedMonth = Number.parseInt(maybeMonth, 10)
        const parsedYear = Number.parseInt(maybeYear, 10)
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
