import { getDictionary } from "@/dictionaries";
import Container from "../components/ui/Container";
import { NetworkPageClient } from "./components/NetworkPageClient";

interface NetworkPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NetworkPage({ params }: NetworkPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.network as Record<string, unknown>;

  return (
    <Container
      title={t.title as string}
      description={t.explore as string}
    >
      <NetworkPageClient
        translations={t}
        connections={[]}
        pendingReceived={[]}
        pendingSent={[]}
        pendingCount={0}
      />
    </Container>
  );
}
