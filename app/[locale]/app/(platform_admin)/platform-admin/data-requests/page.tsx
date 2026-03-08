import { getTranslations } from "next-intl/server";
import { Database } from "lucide-react";

import { getPlatformDataRequests } from "@/actions/platform-admin/manage-data-requests";
import { getPlatformAdminUser } from "@/lib/platform-admin";
import { DataRequestsMetrics } from "./components/DataRequestsMetrics";
import { DataRequestsDataTable } from "./components/DataRequestsDataTable";

interface DataRequestsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    status?: string;
  }>;
}

export default async function PlatformAdminDataRequestsPage({
  params,
  searchParams,
}: DataRequestsPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");

  await getPlatformAdminUser();

  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const typeFilter = (search.type as "ALL" | "EXPORT" | "DELETION") || "ALL";
  const statusFilter = search.status || "ALL";

  const data = await getPlatformDataRequests({
    page,
    search: searchQuery,
    type: typeFilter,
    status: statusFilter,
    limit: 20,
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dataRequests.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("dataRequests.description")}
            </p>
          </div>
        </div>

        {/* Metrics Cards */}
        <DataRequestsMetrics counts={data.counts} />

        {/* Data Table */}
        <DataRequestsDataTable
          requests={data.requests}
          totalCount={data.totalCount}
          page={data.page}
          totalPages={data.totalPages}
          currentSearch={searchQuery}
          currentType={typeFilter}
          currentStatus={statusFilter}
          locale={locale}
        />
      </div>
    </div>
  );
}
