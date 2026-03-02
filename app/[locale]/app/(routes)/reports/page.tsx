import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getAllKPIMetrics } from "@/actions/reports/get-kpi-metrics";
import { ReportsPageView } from "./components/ReportsPageView";

const ReportsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const kpiMetrics = await getAllKPIMetrics();

  return (
    <Container
      title={dict.navigation.ModuleMenu.reports}
      description={dict.reports.description}
    >
      <ReportsPageView kpiMetrics={kpiMetrics} />
    </Container>
  );
};

export default ReportsPage;
