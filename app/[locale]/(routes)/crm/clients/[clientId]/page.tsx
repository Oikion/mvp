import Container from "../../../components/ui/Container";
import { getClient } from "@/actions/crm/get-client";
import ClientView from "./components/ClientView";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const { clientId } = await params;
  const resolvedSearchParams: { action?: string } = searchParams ? await searchParams : {};
  const client = await getClient(clientId);
  if (!client) return null;

  const defaultEditOpen = resolvedSearchParams?.action === "edit";

  return (
    <Container title={client.client_name} description={`Client ID: ${client.id}`}>
      <div className="max-w-5xl">
        <ClientView data={client} defaultEditOpen={defaultEditOpen} />
      </div>
    </Container>
  );
}


