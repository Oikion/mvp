import { getMyDeals } from "@/actions/deals";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import Container from "../components/ui/Container";
import DealsPageView from "./components/DealsPageView";
import { getTranslations } from "next-intl/server";

interface DealsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DealsPage({ params }: DealsPageProps) {
  await params;
  const t = await getTranslations("deals");

  const [initialDeals, crmData] = await Promise.all([
    getMyDeals(),
    getAllCrmData(),
  ]);

  return (
    <Container title={t("title")} description={t("description")}>
      <DealsPageView initialDeals={initialDeals} crmData={crmData} />
    </Container>
  );
}
