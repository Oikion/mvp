import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "../../../components/ui/Container";
import { getMatchById } from "@/actions/matchmaking/get-match-by-id";
import { MatchDetailView } from "./MatchDetailView";

interface Props {
  params: Promise<{ locale: string; matchId: string }>;
}

const MatchDetailPage = async ({ params }: Props) => {
  const { locale, matchId } = await params;
  const [t, match] = await Promise.all([
    getTranslations("matchmaking"),
    getMatchById(matchId),
  ]);

  if (!match) notFound();

  return (
    <Container
      title={t("matchDetail.scoreBreakdownTitle")}
      description={match.request.name ?? match.requestId}
    >
      <MatchDetailView match={match} locale={locale} />
    </Container>
  );
};

export default MatchDetailPage;
