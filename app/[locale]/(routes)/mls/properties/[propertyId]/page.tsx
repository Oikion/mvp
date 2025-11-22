import Container from "../../../components/ui/Container";
import { getProperty } from "@/actions/mls/get-property";
import PropertyView from "./components/PropertyView";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const { propertyId } = await params;
  const resolvedSearchParams: { action?: string } = searchParams ? await searchParams : {};
  const property = await getProperty(propertyId);
  if (!property) return null;

  const defaultEditOpen = resolvedSearchParams?.action === "edit";

  return (
    <Container title={property.property_name} description={`Property ID: ${property.id}`}>
      <div className="max-w-5xl">
        <PropertyView data={property} defaultEditOpen={defaultEditOpen} />
      </div>
    </Container>
  );
}


