import { notFound } from "next/navigation";
import Container from "../../../components/ui/Container";
import { getProperty } from "@/actions/mls/get-property";
import { getSharedProperty } from "@/actions/mls/get-shared-property";
import { getCurrentUser } from "@/lib/get-current-user";
import PropertyView from "./components/PropertyView";
import { SharedAccessBanner } from "./components/SharedAccessBanner";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const { locale, propertyId } = await params;
  const resolvedSearchParams: { action?: string } = searchParams ? await searchParams : {};
  const currentUser = await getCurrentUser();

  // Try org-level access first
  let property = await getProperty(propertyId);
  let isSharedView = false;
  let shareInfo: any = null;

  // If not found in org, check for share access
  if (!property) {
    const sharedProperty = await getSharedProperty(propertyId);
    if (sharedProperty) {
      property = sharedProperty;
      isSharedView = true;
      shareInfo = sharedProperty._shareInfo;
    }
  }

  // If still not found, show 404
  if (!property) {
    notFound();
  }

  // Don't allow edit action for shared views
  const defaultEditOpen = isSharedView ? false : resolvedSearchParams?.action === "edit";
  
  // Determine share permission for comments
  const sharePermission = shareInfo?.permissions as "VIEW_ONLY" | "VIEW_COMMENT" | null;

  return (
    <Container title={property.property_name} description={`Property ID: ${property.id}`}>
      <div className="max-w-5xl space-y-4">
        {isSharedView && shareInfo && (
          <SharedAccessBanner shareInfo={shareInfo} entityType="property" />
        )}
        <PropertyView 
          data={property} 
          defaultEditOpen={defaultEditOpen} 
          isReadOnly={isSharedView}
          sharePermission={sharePermission}
          currentUserId={currentUser.id}
          locale={locale}
        />
      </div>
    </Container>
  );
}
