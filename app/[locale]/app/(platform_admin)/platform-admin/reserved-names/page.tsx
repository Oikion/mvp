import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getReservedNames } from "@/actions/platform-admin/reserved-names";
import { ReservedNamesDataTable } from "./components/ReservedNamesDataTable";

interface ReservedNamesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    status?: string;
  }>;
}

export default async function PlatformAdminReservedNamesPage({
  params,
  searchParams,
}: ReservedNamesPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");

  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const type = search.type || "ALL";
  const status = search.status || "ALL";

  const reservedNames = await getReservedNames({
    page,
    search: searchQuery,
    limit: 20,
    type: type as never,
    status: status as never,
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("reservedNames.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("reservedNames.description")}
            </p>
          </div>
        </div>

        <ReservedNamesDataTable
          items={reservedNames.items}
          totalCount={reservedNames.totalCount}
          page={reservedNames.page}
          totalPages={reservedNames.totalPages}
          currentSearch={searchQuery}
          currentType={type}
          currentStatus={status}
          locale={locale}
        />
      </div>
    </div>
  );
}
