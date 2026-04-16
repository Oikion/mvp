import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getRequestMatchAnalytics } from "@/actions/matchmaking/get-request-matches";
import { getPersistedMatches } from "@/actions/matchmaking/get-persisted-matches";
import { getCrossOrgMatches } from "@/actions/network/get-cross-org-matches";
import { getNetworkSettings, getNetworkPartners } from "@/actions/network/manage-network-settings";
import { MatchmakingDashboard } from "./components/MatchmakingDashboard";

const MatchmakingPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const [requestAnalytics, persistedMatches, networkMatches, networkSettings, networkPartners] = await Promise.all([
    getRequestMatchAnalytics(),
    getPersistedMatches(),
    getCrossOrgMatches(),
    getNetworkSettings(),
    getNetworkPartners(),
  ]);

  return (
    <Container
      title={dict.matchmaking?.title || "Matchmaking"}
      description={dict.matchmaking?.description || "Request-Property matching analytics"}
    >
      <MatchmakingDashboard
        locale={locale}
        dict={dict}
        requestAnalytics={requestAnalytics}
        persistedMatches={persistedMatches}
        networkMatches={networkMatches}
        networkSettings={networkSettings}
        networkPartners={networkPartners}
      />
    </Container>
  );
};

export default MatchmakingPage;
