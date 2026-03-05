import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { getMatchAnalytics } from "@/actions/matchmaking/get-match-analytics";
import { getMandateMatchAnalytics } from "@/actions/matchmaking/get-mandate-matches";
import { MatchmakingDashboard } from "./components/MatchmakingDashboard";

const MatchmakingPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch client and mandate match analytics in parallel
  const [analytics, mandateAnalytics] = await Promise.all([
    getMatchAnalytics(),
    getMandateMatchAnalytics(),
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
      />
    </Container>
  );
};

export default MatchmakingPage;
