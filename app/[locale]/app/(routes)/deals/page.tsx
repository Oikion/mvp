import React, { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getDeals } from "@/actions/deals";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import DealsPageView from "./components/DealsPageView";
import type { DealRow } from "./components/DealsList";

// Deals list is force-dynamic because:
// 1. Stage transitions and price changes need to be reflected immediately for agents
// 2. Multiple agents may be updating the same pipeline concurrently
// 3. Soft-deletes (deletedAt) are filtered at runtime via the Prisma extension
export const dynamic = "force-dynamic";

interface DealsPageProps {
  params: Promise<{ locale: string }>;
}

const DealsPage = async ({ params }: DealsPageProps) => {
  await params; // Next.js 16 — params must be awaited even when unused
  const t = await getTranslations("deals");

  // Parallel fetch — never let the page wait sequentially for independent data
  const [dealsResponse, crmData] = await Promise.all([
    getDeals(),
    getAllCrmData(),
  ]);

  // Server actions return ActionResponse: { success, data?, error? }
  // Permission denials return an error object — fall back to an empty list
  // so the page still renders (the UI tabs and EmptyState handle empty data).
  // getDeals() returns the full Prisma Deal shape with all relations; the
  // DealsPageView list UI uses the narrower DealRow projection. Runtime
  // fields are compatible — the cast bridges the rich server shape to the
  // trimmed client shape without dropping any data.
  const initialDeals: DealRow[] =
    dealsResponse && "success" in dealsResponse && dealsResponse.success
      ? ((dealsResponse.data ?? []) as unknown as DealRow[])
      : [];

  return (
    <Container title={t("title")} description={t("description")}>
      <Suspense fallback={<SuspenseLoading />}>
        <DealsPageView initialDeals={initialDeals} crmData={crmData} />
      </Suspense>
    </Container>
  );
};

export default DealsPage;
