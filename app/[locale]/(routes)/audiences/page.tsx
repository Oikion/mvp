import Container from "../components/ui/Container";
import { getAudiences, getPersonalAudiences, getOrgAudiences } from "@/actions/audiences";
import { AudiencesPageView } from "./components/AudiencesPageView";
import { getDictionary } from "@/dictionaries";

export const dynamic = "force-dynamic";

interface AudiencesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AudiencesPage({ params }: AudiencesPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.audiences;

  const [allAudiences, personalAudiences, orgAudiences] = await Promise.all([
    getAudiences(),
    getPersonalAudiences(),
    getOrgAudiences(),
  ]);

  return (
    <Container
      title={t.title}
      description={t.description}
    >
      <AudiencesPageView
        allAudiences={allAudiences}
        personalAudiences={personalAudiences}
        orgAudiences={orgAudiences}
        translations={t}
      />
    </Container>
  );
}


