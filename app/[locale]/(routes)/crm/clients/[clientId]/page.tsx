import { notFound } from "next/navigation";
import Container from "../../../components/ui/Container";
import { getClient } from "@/actions/crm/get-client";
import { getSharedClient } from "@/actions/crm/get-shared-client";
import { getCurrentUser } from "@/lib/get-current-user";
import ClientView from "./components/ClientView";
import { SharedAccessBanner } from "../../../mls/properties/[propertyId]/components/SharedAccessBanner";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const { clientId } = await params;
  const resolvedSearchParams: { action?: string } = searchParams ? await searchParams : {};
  const currentUser = await getCurrentUser();

  // Try org-level access first
  let client = await getClient(clientId);
  let isSharedView = false;
  let shareInfo: any = null;

  // If not found in org, check for share access
  if (!client) {
    const sharedClient = await getSharedClient(clientId);
    if (sharedClient) {
      client = sharedClient;
      isSharedView = true;
      shareInfo = sharedClient._shareInfo;
    }
  }

  // If still not found, show 404
  if (!client) {
    notFound();
  }

  // Don't allow edit action for shared views
  const defaultEditOpen = isSharedView ? false : resolvedSearchParams?.action === "edit";
  
  // Determine share permission for comments
  const sharePermission = shareInfo?.permissions as "VIEW_ONLY" | "VIEW_COMMENT" | null;

  return (
    <Container title={client.client_name} description={`Client ID: ${client.id}`}>
      <div className="max-w-5xl space-y-4">
        {isSharedView && shareInfo && (
          <SharedAccessBanner shareInfo={shareInfo} entityType="client" />
        )}
        <ClientView 
          data={client} 
          defaultEditOpen={defaultEditOpen} 
          isReadOnly={isSharedView}
          sharePermission={sharePermission}
          currentUserId={currentUser.id}
        />
      </div>
    </Container>
  );
}
