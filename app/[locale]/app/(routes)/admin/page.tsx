import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { Link } from "@/navigation";
import { Users, Building2, Settings, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Container from "../components/ui/Container";
import { isOrgAdmin } from "@/lib/org-admin";
import { getOrgMembersFromDb } from "@/lib/org-members";

const AdminPage = async () => {
  const t = await getTranslations();
  const isAdmin = await isOrgAdmin();
  const { orgId, orgSlug } = await auth();

  if (!isAdmin) {
    return (
      <Container
        title={t("admin.title")}
        description={t("admin.accessDenied")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("admin.accessNotAllowed")}
        </div>
      </Container>
    );
  }

  // Get organization info from Clerk
  let orgInfo = null;
  let memberCount = 0;
  
  if (orgId) {
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      orgInfo = await clerk.organizations.getOrganization({
        organizationId: orgId,
      });
      
      // Get org members count
      const membersResult = await getOrgMembersFromDb();
      memberCount = membersResult.users.length;
    } catch (error) {
      console.error("Error fetching organization info:", error);
    }
  }

  return (
    <Container
      title={t("admin.title")}
      description={t("admin.setupDescription")}
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button asChild>
          <Link href="/app/admin/users">
            <Users className="h-4 w-4 mr-2" />
            {t("admin.usersAdministration")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/admin/modules">
            <Settings className="h-4 w-4 mr-2" />
            {t("admin.modulesAdministration")}
          </Link>
        </Button>
      </div>

      {/* Organization Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Organization Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.organization")}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orgInfo?.name ?? t("admin.noOrganization")}
            </div>
            {orgSlug && (
              <p className="text-xs text-muted-foreground mt-1">
                @{orgSlug}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {orgInfo?.createdAt && (
                <>
                  {t("admin.createdOn")}: {new Date(orgInfo.createdAt).toLocaleDateString()}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Members Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.teamMembers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.activeMembers")}
            </p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/app/admin/users">
                {t("admin.manageMembers")} →
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Admin Role Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.yourRole")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {t("admin.organizationAdmin")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("admin.fullAccessDescription")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Settings Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">{t("admin.quickLinks")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <Link href="/app/organization" className="block">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("admin.organizationSettings")}
                </CardTitle>
                <CardDescription>
                  {t("admin.organizationSettingsDescription")}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <Link href="/app/admin/users" className="block">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("admin.teamManagement")}
                </CardTitle>
                <CardDescription>
                  {t("admin.teamManagementDescription")}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default AdminPage;
