// app/[locale]/(platform-admin)/platform-admin/referrals/page.tsx
// Platform Admin Referrals Management Page

import { getTranslations } from "next-intl/server";
import { Gift } from "lucide-react";

import { adminGetAllReferrals, adminGetAllReferralCodes } from "@/actions/referrals/admin-get-all-referrals";
import { ReferralStats } from "./components/ReferralStats";
import { CreateReferralCodeDialog } from "./components/CreateReferralCodeDialog";
import { ReferralTabs } from "./components/ReferralTabs";

interface ReferralsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    codesPage?: string;
    codesSearch?: string;
  }>;
}

export default async function PlatformAdminReferralsPage({
  params,
  searchParams,
}: ReferralsPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");

  // Current tab
  const currentTab = search.tab || "codes";

  // Parse search params for referrals
  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const status = search.status as "PENDING" | "CONVERTED" | "CANCELLED" | "ALL" | undefined;
  const sortBy = search.sortBy as "createdAt" | "totalEarnings" | "referrerEmail" | undefined;
  const sortOrder = search.sortOrder as "asc" | "desc" | undefined;

  // Parse search params for referral codes
  const codesPage = parseInt(search.codesPage || "1", 10);
  const codesSearch = search.codesSearch || "";

  // Fetch data based on current tab (fetch both for stats)
  const [referralsData, codesData] = await Promise.all([
    adminGetAllReferrals({
      page,
      search: searchQuery,
      status: status || "ALL",
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      limit: 20,
    }),
    adminGetAllReferralCodes({
      page: codesPage,
      search: codesSearch,
      limit: 20,
    }),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("referrals.title")}
              </h1>
              <p className="text-muted-foreground">{t("referrals.description")}</p>
            </div>
          </div>
          <CreateReferralCodeDialog locale={locale} />
        </div>

        {/* Stats Cards */}
        <ReferralStats stats={referralsData.stats} />

        {/* Tabs for Referral Codes and Referrals */}
        <div className="mt-8">
          <ReferralTabs
            locale={locale}
            currentTab={currentTab}
            referrals={referralsData.referrals}
            referralsTotalCount={referralsData.totalCount}
            referralsPage={referralsData.page}
            referralsTotalPages={referralsData.totalPages}
            currentSearch={searchQuery}
            currentStatus={status || "ALL"}
            codes={codesData.codes}
            codesTotalCount={codesData.totalCount}
            codesPage={codesData.page}
            codesTotalPages={codesData.totalPages}
            codesCurrentSearch={codesSearch}
          />
        </div>
      </div>
    </div>
  );
}
