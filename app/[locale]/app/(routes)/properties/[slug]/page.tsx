import { notFound } from "next/navigation";
import Container from "../../components/ui/Container";
import { getProperty } from "@/actions/mls/get-property";
import { getSharedProperty } from "@/actions/mls/get-shared-property";

type ShareInfo = NonNullable<Awaited<ReturnType<typeof getSharedProperty>>>["_shareInfo"] | null;
import { getCurrentUser } from "@/lib/get-current-user";
import { PropertyViewEditable } from "./components/PropertyViewEditable";
import { SharedAccessBanner } from "../../mls/properties/[slug]/components/SharedAccessBanner";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ edit?: string }>;
}) {
  const { slug: propertyId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentUser = await getCurrentUser();

  // Try org-level access first
  let property = await getProperty(propertyId);
  let isSharedView = false;
  let shareInfo: ShareInfo = null;

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

  // Check if edit mode requested via URL
  const startInEditMode = resolvedSearchParams?.edit === "true" && !isSharedView;
  
  // Determine share permission for comments
  const sharePermission = shareInfo?.permissions as "VIEW_ONLY" | "VIEW_COMMENT" | null;

  return (
    <Container title={property.property_name} description={`Property ID: ${property.id}`}>
      <div className="max-w-6xl space-y-4">
        {isSharedView && shareInfo && (
          <SharedAccessBanner shareInfo={shareInfo} entityType="property" />
        )}
        <PropertyViewEditable 
          data={property} 
          isReadOnly={isSharedView}
          sharePermission={sharePermission}
          currentUserId={currentUser.id}
          defaultEditMode={startInEditMode}
        />
      </div>
    </Container>
  );
}
