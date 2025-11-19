import { Suspense } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  CoinsIcon,
  Contact,
  DollarSignIcon,
  LandmarkIcon,
  UserIcon,
  Users2Icon,
  Building2,
  Users,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/navigation";

import { getDictionary } from "@/dictionaries";

import Container from "./components/ui/Container";
import LoadingBox from "./components/dasboard/loading-box";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuickViewList } from "./components/dashboard/QuickViewList";
import { BarChartDemo } from "@/components/tremor/BarChart";

import { getModules } from "@/actions/get-modules";
import { getEmployees } from "@/actions/get-empoloyees";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getRecentProperties } from "@/actions/dashboard/get-recent-properties";
import { getRecentClients } from "@/actions/dashboard/get-recent-clients";
import { getClientsByStatus } from "@/actions/reports/get-clients-stats";
import { getPropertiesByStatus } from "@/actions/reports/get-properties-stats";
import { getPropertiesCount } from "@/actions/reports/get-properties-stats";
import { getClientsCount } from "@/actions/reports/get-clients-stats";


const DashboardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const { locale } = await params;
    // Fetch translations based on current locale
    const dict = await getDictionary(locale); //Fetch data for dashboard

    // Parallelize all dashboard queries for significantly better performance
    const [
      modules,
      employees,
      contacts,
      users,
      accounts,
      recentClients,
      recentProperties,
      clientsByStatus,
      propertiesByStatus,
      propertiesCount,
      clientsCount,
    ] = await Promise.all([
      getModules(),
      getEmployees(),
      getContactCount(),
      getActiveUsersCount(),
      getAccountsCount(),
      getRecentClients(5),
      getRecentProperties(5),
      getClientsByStatus(),
      getPropertiesByStatus(),
      getPropertiesCount(),
      getClientsCount(),
    ]);

    //Find which modules are enabled
    const crmModule = modules.find((module) => module.name === "crm");
    const employeesModule = modules.find((module) => module.name === "employees");
    

    return (
      <Container
        title={dict.dashboard.containerTitle}
        description={dict.dashboard.containerDescription}
      >
        <div className="space-y-8">
          {/* Section 1: At a Glance */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-4">
              {dict.dashboard.atAGlance}
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Suspense fallback={<LoadingBox />}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dict.dashboard.totalRevenue}
                </CardTitle>
                <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">{"0"}</div>
                    <CardDescription className="text-xs mt-1">
                      {dict.dashboard.totalRevenueDescription}
                    </CardDescription>
              </CardContent>
            </Card>
          </Suspense>
          <Suspense fallback={<LoadingBox />}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dict.dashboard.expectedRevenue}
                </CardTitle>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">{"0"}</div>
                    <CardDescription className="text-xs mt-1">
                      {dict.dashboard.expectedRevenueDescription}
                    </CardDescription>
              </CardContent>
            </Card>
          </Suspense>

          <DashboardCard
            href="/admin/users"
            title={dict.dashboard.activeUsers}
            IconComponent={UserIcon}
            content={users}
          />
              {crmModule?.enabled && (
              <>
                <DashboardCard
                  href="/crm/clients"
                  title={dict.dashboard.accounts}
                  IconComponent={LandmarkIcon}
                  content={accounts}
                />
                <DashboardCard
                  href="/crm/client-contacts"
                  title={dict.dashboard.contacts}
                  IconComponent={Contact}
                  content={contacts}
                />
              </>
              )}
              {employeesModule?.enabled && (
                <DashboardCard
                  href="/employees"
                  title={dict.dashboard.employees}
                  IconComponent={Users2Icon}
                  content={employees.length}
                />
              )}
            </div>
          </div>
          
          {/* Section 2: Recent Activity */}
          <div>
             <h2 className="text-xl font-semibold tracking-tight mb-4">
              {dict.dashboard.recentActivity}
            </h2>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {crmModule?.enabled && (
                <QuickViewList
                  title={dict.dashboard.recentClients}
                  items={recentClients}
                  viewAllHref="/crm/clients"
                  icon={<Users className="h-5 w-5 text-muted-foreground" />}
                />
              )}
              <QuickViewList
                title={dict.dashboard.recentProperties}
                items={recentProperties}
                viewAllHref="/mls/properties"
                icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
              />
            </div>
          </div>

          {/* Section 3: Analytics Overview */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-4">
              {dict.dashboard.analyticsOverview}
            </h2>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {crmModule?.enabled && clientsByStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.dashboard.clientsByStatus}</CardTitle>
                    <CardDescription>
                      {dict.dashboard.clientsDistribution.replace("{count}", clientsCount.toString())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChartDemo
                      chartData={clientsByStatus}
                      title={dict.dashboard.clientsByStatus}
                    />
                  </CardContent>
                </Card>
              )}
              {propertiesByStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.dashboard.propertiesByStatus}</CardTitle>
                    <CardDescription>
                      {dict.dashboard.propertiesDistribution.replace("{count}", propertiesCount.toString())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChartDemo
                      chartData={propertiesByStatus}
                      title={dict.dashboard.propertiesByStatus}
                    />
                  </CardContent>
                </Card>
              )}
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

const DashboardCard = ({
  href,
  title,
  IconComponent,
  content,
}: {
  href?: string;
  title: string;
  IconComponent: any;
  content: number;
}) => (
  <Link href={href || "#"} className="h-full">
    <Suspense fallback={<LoadingBox />}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <IconComponent className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{content}</div>
        </CardContent>
      </Card>
    </Suspense>
  </Link>
);
