import Container from "../../../components/ui/Container";
import { getProperty } from "@/actions/mls/get-property";
import PropertyView from "./components/PropertyView";

export default async function PropertyDetailPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) return null;
  return (
    <Container title={property.property_name} description={`Property ID: ${property.id}`}>
      <div className="max-w-5xl">
        <PropertyView data={property} />
      </div>
    </Container>
  );
}


