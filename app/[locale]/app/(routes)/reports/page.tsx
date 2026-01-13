import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getAllLeadMetrics } from "@/actions/reports/get-lead-metrics";
import { getAllSalesMetrics } from "@/actions/reports/get-sales-metrics";
import { getAllClientMetrics } from "@/actions/reports/get-client-metrics";
import { getAllListingMetrics } from "@/actions/reports/get-listing-metrics";
import { getAllProductivityMetrics } from "@/actions/reports/get-productivity-metrics";
import { getAllMarketMetrics } from "@/actions/reports/get-market-metrics";
import { ReportsPageView } from "./components/ReportsPageView";

const ReportsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch all metrics data in parallel for better performance
  const [
    leadMetrics,
    salesMetrics,
    clientMetrics,
    listingMetrics,
    productivityMetrics,
    marketMetrics,
  ] = await Promise.all([
    getAllLeadMetrics(),
    getAllSalesMetrics(),
    getAllClientMetrics(),
    getAllListingMetrics(),
    getAllProductivityMetrics(),
    getAllMarketMetrics(),
  ]);

  return (
    <Container
      title={dict.navigation.ModuleMenu.reports}
      description={dict.reports.description}
    >
      <ReportsPageView
        locale={locale}
        dict={dict}
        leadMetrics={leadMetrics}
        salesMetrics={salesMetrics}
        clientMetrics={clientMetrics}
        listingMetrics={listingMetrics}
        productivityMetrics={productivityMetrics}
        marketMetrics={marketMetrics}
      />
    </Container>
  );
};

export default ReportsPage;
