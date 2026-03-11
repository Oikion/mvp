import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getMatchAnalytics } from "@/actions/matchmaking/get-match-analytics";
import { getMandateMatchAnalytics } from "@/actions/matchmaking/get-mandate-matches";
import { getCrossOrgMatches } from "@/actions/network/get-cross-org-matches";
import { getNetworkSettings, getNetworkPartners } from "@/actions/network/manage-network-settings";
import { MatchmakingDashboard } from "./components/MatchmakingDashboard";

const MatchmakingPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch all analytics and network settings in parallel
  const [analytics, mandateAnalytics, networkMatches, networkSettings, networkPartners] = await Promise.all([
    getMatchAnalytics(),
    getMandateMatchAnalytics(),
    getCrossOrgMatches(),
    getNetworkSettings(),
    getNetworkPartners(),
  ]);

  return (
    <Container
      title={dict.matchmaking?.title || "Matchmaking"}
      description={dict.matchmaking?.description || "Client-Property matching analytics"}
    >
      <MatchmakingDashboard
        locale={locale}
        dict={dict}
        analytics={analytics}
        mandateAnalytics={mandateAnalytics}
        networkMatches={networkMatches}
        networkSettings={networkSettings}
        networkPartners={networkPartners}
      />
    </Container>
  );
};

export default MatchmakingPage;
