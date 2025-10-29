import Container from "../../../components/ui/Container";
import { getClient } from "@/actions/crm/get-client";
import ClientView from "./components/ClientView";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) return null;

  return (
    <Container title={client.client_name} description={`Client ID: ${client.id}`}>
      <div className="max-w-5xl">
        <ClientView data={client} />
      </div>
    </Container>
  );
}


