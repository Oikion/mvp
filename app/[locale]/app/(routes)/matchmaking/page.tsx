import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getMatchAnalytics } from "@/actions/matchmaking/get-match-analytics";
import { MatchmakingDashboard } from "./components/MatchmakingDashboard";

const MatchmakingPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch match analytics data
  const analytics = await getMatchAnalytics();

  return (
    <Container
      title={dict.matchmaking?.title || "Matchmaking"}
      description={dict.matchmaking?.description || "Client-Property matching analytics"}
    >
      <MatchmakingDashboard
        locale={locale}
        dict={dict}
        analytics={analytics}
      />
    </Container>
  );
};

export default MatchmakingPage;
