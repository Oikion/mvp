import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import {
  CoinsIcon,
  Contact,
  DollarSignIcon,
  FactoryIcon,
  FilePenLine,
  HeartHandshakeIcon,
  LandmarkIcon,
  UserIcon,
  Users2Icon,
} from "lucide-react";
import Link from "next/link";

import { getDictionary } from "@/dictionaries";

import Container from "./components/ui/Container";
import LoadingBox from "./components/dasboard/loading-box";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  getTasksCount,
  getUsersTasksCount,
} from "@/actions/dashboard/get-tasks-count";
import { getModules } from "@/actions/get-modules";
import { getEmployees } from "@/actions/get-empoloyees";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";

import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session) return null;

  const userId = session?.user?.id;

  //Fetch translations from dictionary (English only for now)
  const dict = await getDictionary(); //Fetch data for dashboard

  // Parallelize all dashboard queries for significantly better performance
  const [
    modules,
    tasks,
    employees,
    projects,
    contacts,
    users,
    accounts,
    usersTasks,
  ] = await Promise.all([
    getModules(),
    getTasksCount(),
    getEmployees(),
    getBoardsCount(),
    getContactCount(),
    getActiveUsersCount(),
    getAccountsCount(),
    getUsersTasksCount(userId),
  ]);

  //Find which modules are enabled
  const crmModule = modules.find((module) => module.name === "crm");
  const projectsModule = modules.find((module) => module.name === "projects");
  const employeesModule = modules.find((module) => module.name === "employees");
  

  return (
    <Container
      title={dict.DashboardPage.containerTitle}
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<LoadingBox />}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.DashboardPage.totalRevenue}
              </CardTitle>
              <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">{"0"}</div>
            </CardContent>
          </Card>
        </Suspense>
        <Suspense fallback={<LoadingBox />}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.DashboardPage.expectedRevenue}
              </CardTitle>
              <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">{"0"}</div>
            </CardContent>
          </Card>
        </Suspense>

        <DashboardCard
          href="/admin/users"
          title={dict.DashboardPage.activeUsers}
          IconComponent={UserIcon}
          content={users}
        />
        {
          //show crm module only if enabled is true
          employeesModule?.enabled && (
            <DashboardCard
              href="/employees"
              title="Employees"
              IconComponent={Users2Icon}
              content={employees.length}
            />
          )
        }
        {
          //show crm module only if enabled is true
          crmModule?.enabled && (
            <>
              <DashboardCard
                href="/crm/clients"
                title={dict.DashboardPage.accounts}
                IconComponent={LandmarkIcon}
                content={accounts}
              />
              <DashboardCard
                href="/crm/client-contacts"
                title={dict.DashboardPage.contacts}
                IconComponent={Contact}
                content={contacts}
              />
            </>
          )
        }
        {projectsModule?.enabled && (
          <>
            <DashboardCard
              href="/projects"
              title={dict.DashboardPage.projects}
              IconComponent={CoinsIcon}
              content={projects}
            />
            <DashboardCard
              href="/projects/tasks"
              title={dict.DashboardPage.tasks}
              IconComponent={CoinsIcon}
              content={tasks}
            />
            <DashboardCard
              href={`/projects/tasks/${userId}`}
              title={dict.DashboardPage.myTasks}
              IconComponent={CoinsIcon}
              content={usersTasks}
            />
          </>
        )}

        
      </div>
    </Container>
  );
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
  <Link href={href || "#"}>
    <Suspense fallback={<LoadingBox />}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <IconComponent className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-medium">{content}</div>
        </CardContent>
      </Card>
    </Suspense>
  </Link>
);
