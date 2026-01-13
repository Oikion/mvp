"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, UserPlus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferralsDataTable } from "./ReferralsDataTable";
import { ReferralCodesTable } from "./ReferralCodesTable";
import type { AdminReferralData, AdminReferralCodeData } from "@/actions/referrals/admin-get-all-referrals";

interface ReferralTabsProps {
  locale: string;
  currentTab: string;
  // Referrals data
  referrals: AdminReferralData[];
  referralsTotalCount: number;
  referralsPage: number;
  referralsTotalPages: number;
  currentSearch: string;
  currentStatus: string;
  // Codes data
  codes: AdminReferralCodeData[];
  codesTotalCount: number;
  codesPage: number;
  codesTotalPages: number;
  codesCurrentSearch: string;
}

export function ReferralTabs({
  locale,
  currentTab,
  referrals,
  referralsTotalCount,
  referralsPage,
  referralsTotalPages,
  currentSearch,
  currentStatus,
  codes,
  codesTotalCount,
  codesPage,
  codesTotalPages,
  codesCurrentSearch,
}: ReferralTabsProps) {
  const t = useTranslations("platformAdmin.referrals");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    // Reset page when switching tabs
    newParams.delete("page");
    newParams.delete("codesPage");
    router.push(`/${locale}/app/platform-admin/referrals?${newParams.toString()}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="codes" className="gap-2">
          <Users className="h-4 w-4" />
          {t("tabs.programme")}
        </TabsTrigger>
        <TabsTrigger value="referrals" className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t("tabs.referrals")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="codes" className="mt-6">
        <ReferralCodesTable
          codes={codes}
          totalCount={codesTotalCount}
          page={codesPage}
          totalPages={codesTotalPages}
          currentSearch={codesCurrentSearch}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="referrals" className="mt-6">
        <ReferralsDataTable
          referrals={referrals}
          totalCount={referralsTotalCount}
          page={referralsPage}
          totalPages={referralsTotalPages}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
