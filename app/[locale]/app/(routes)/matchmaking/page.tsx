import Container from "../components/ui/Container";
import { getTranslations } from "next-intl/server";
import { getDictionary } from "@/dictionaries";
import { getRequestMatchAnalytics } from "@/actions/matchmaking/get-request-matches";
import { getPersistedMatches } from "@/actions/matchmaking/get-persisted-matches";
import { getCrossOrgMatches } from "@/actions/network/get-cross-org-matches";
import { getNetworkSettings, getNetworkPartners } from "@/actions/network/manage-network-settings";
import { MatchmakingDashboard } from "./components/MatchmakingDashboard";

const MatchmakingPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = await getTranslations("matchmaking");

  const [requestAnalytics, persistedMatches, networkMatches, networkSettings, networkPartners] = await Promise.all([
    getRequestMatchAnalytics(),
    getPersistedMatches(),
    getCrossOrgMatches(),
    getNetworkSettings(),
    getNetworkPartners(),
  ]);

  return (
    <Container
      title={dict.matchmaking?.title || t("title")}
      description={dict.matchmaking?.description || t("description")}
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
