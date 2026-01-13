import Container from "../components/ui/Container";
import { getAudiences, getPersonalAudiences, getOrgAudiences } from "@/actions/audiences";
import { AudiencesPageView } from "./components/AudiencesPageView";
import { getCachedDictionary } from "@/lib/cached";

// force-dynamic is required because:
// 1. Audiences include auto-synced organization data
// 2. Audience membership can change when connections are added/removed
// 3. Users expect to see current audience data when managing shares
export const dynamic = "force-dynamic";

interface AudiencesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AudiencesPage({ params }: AudiencesPageProps) {
  const { locale } = await params;
  const dict = await getCachedDictionary(locale);
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


