import { getPublicProperty } from "@/actions/mls/get-public-property";
import { notFound } from "next/navigation";
import { PublicPropertyView } from "../../property/[propertyId]/components/PublicPropertyView";
import { Metadata } from "next";

interface PropertyPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { id: propertyId } = await params;
  const property = await getPublicProperty(propertyId);

  if (!property) {
    return {
      title: "Property Not Found",
    };
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const description = [
    property.property_type,
    property.bedrooms ? `${property.bedrooms} υπνοδωμάτια` : null,
    property.size_net_sqm || property.square_feet
      ? `${property.size_net_sqm || property.square_feet} τ.μ.`
      : null,
    property.address_city,
    property.price ? formatPrice(property.price) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    title: `${property.property_name} | Oikion`,
    description: property.description || description,
    openGraph: {
      title: property.property_name,
      description: property.description || description,
      images: property.linkedDocuments?.[0]?.document_file_url
        ? [property.linkedDocuments[0].document_file_url]
        : [],
    },
  };
}

export default async function PublicPropertiesPage({ params }: PropertyPageProps) {
  const { id: propertyId } = await params;
  const property = await getPublicProperty(propertyId);

  if (!property) {
    notFound();
  }

  return <PublicPropertyView property={property} />;
}
