// app/[locale]/(platform-admin)/platform-admin/organizations/page.tsx
// Platform Admin Organizations List Page

import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";

import { getPlatformOrganizations } from "@/actions/platform-admin/get-organizations";
import { OrganizationsDataTable } from "./components/OrganizationsDataTable";

interface OrganizationsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function PlatformAdminOrganizationsPage({
  params,
  searchParams,
}: OrganizationsPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");
  
  // Parse search params
  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";

  // Get organizations
  const orgsData = await getPlatformOrganizations({
    page,
    search: searchQuery,
    limit: 20,
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("organizations.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("organizations.description")}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <OrganizationsDataTable 
          organizations={orgsData.organizations}
          totalCount={orgsData.totalCount}
          page={orgsData.page}
          totalPages={orgsData.totalPages}
          currentSearch={searchQuery}
          locale={locale}
        />
      </div>
    </div>
  );
}
