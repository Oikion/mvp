// app/[locale]/(platform-admin)/platform-admin/users/page.tsx
// Platform Admin Users Management Page

import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

import { getPlatformUsers } from "@/actions/platform-admin/get-users";
import { UsersDataTable } from "./components/UsersDataTable";

interface UsersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function PlatformAdminUsersPage({
  params,
  searchParams,
}: UsersPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");
  
  // Parse search params
  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const status = search.status as "ACTIVE" | "INACTIVE" | "PENDING" | "ALL" | undefined;
  const sortBy = search.sortBy as "created_on" | "lastLoginAt" | "name" | undefined;
  const sortOrder = search.sortOrder as "asc" | "desc" | undefined;

  // Get users
  const usersData = await getPlatformUsers({
    page,
    search: searchQuery,
    status: status || "ALL",
    sortBy: sortBy || "created_on",
    sortOrder: sortOrder || "desc",
    limit: 20,
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("users.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("users.description")}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <UsersDataTable 
          users={usersData.users}
          totalCount={usersData.totalCount}
          page={usersData.page}
          totalPages={usersData.totalPages}
          currentSearch={searchQuery}
          currentStatus={status || "ALL"}
          locale={locale}
        />
      </div>
    </div>
  );
}
