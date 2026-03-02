import { getDictionary } from "@/dictionaries";
import {
  getAcceptedConnections,
  getPendingRequests,
  getSentRequests,
} from "@/actions/social/connections";
import Container from "../components/ui/Container";
import { NetworkPageClient } from "./components/NetworkPageClient";

interface NetworkPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NetworkPage({ params }: NetworkPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.network as Record<string, unknown>;

  const [connections, pendingReceived, sentRequests] = await Promise.all([
    getAcceptedConnections(),
    getPendingRequests(),
    getSentRequests(),
  ]);

  const pendingSent = sentRequests.map((r) => ({
    ...r,
    status: "PENDING" as const,
    isIncoming: false,
  }));

  return (
    <Container
      title={t.title as string}
      description={t.explore as string}
    >
      <NetworkPageClient
        translations={t}
        connections={connections}
        pendingReceived={pendingReceived}
        pendingSent={pendingSent}
        pendingCount={pendingReceived.length}
      />
    </Container>
  );
}
