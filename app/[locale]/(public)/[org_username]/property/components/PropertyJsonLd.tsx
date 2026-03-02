import Script from "next/script";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com/app";

interface PropertyData {
  id: string;
  property_name: string;
  description?: string | null;
  price?: number | null;
  createdAt?: string | Date | null;
  address_city?: string | null;
  municipality?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_net_sqm?: number | null;
  year_built?: number | null;
  linkedDocuments?: Array<{ document_file_url?: string | null }> | null;
  organization?: { name?: string | null } | null;
  assigned_to_user?: {
    name?: string | null;
    username?: string | null;
    agentProfile?: {
      publicEmail?: string | null;
      publicPhone?: string | null;
    } | null;
  } | null;
}

interface PropertyJsonLdProps {
  property: PropertyData;
  orgSlug: string;
  locale: string;
}

/**
 * Generate JSON-LD structured data for real estate listing
 * This component renders schema.org RealEstateListing markup for SEO
 */
export function PropertyJsonLd({ property, orgSlug, locale }: PropertyJsonLdProps) {
  const canonicalUrl = `${baseUrl}/${locale}/${orgSlug}/${property.id}`;
  const orgName = property.organization?.name || orgSlug;

  // Build the JSON-LD object with only defined values
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressCountry: "GR",
  };
  if (property.address_city) {
    address.addressLocality = property.address_city;
  }
  if (property.municipality) {
    address.addressRegion = property.municipality;
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.property_name,
    description: property.description || `Property listing by ${orgName}`,
    url: canonicalUrl,
    datePosted: property.createdAt,
    address,
  };

  // Add price if available
  if (property.price) {
    jsonLd.price = property.price;
    jsonLd.priceCurrency = "EUR";
  }

  // Add image
  if (property.linkedDocuments?.[0]?.document_file_url) {
    jsonLd.image = property.linkedDocuments[0].document_file_url;
  }

  // Add property details
  if (property.bedrooms) {
    jsonLd.numberOfBedrooms = property.bedrooms;
  }
  if (property.bathrooms) {
    jsonLd.numberOfBathroomsTotal = property.bathrooms;
  }
  if (property.size_net_sqm) {
    jsonLd.floorSize = {
      "@type": "QuantitativeValue",
      value: property.size_net_sqm,
      unitCode: "MTK", // Square meters
    };
  }
  if (property.year_built) {
    jsonLd.yearBuilt = property.year_built;
  }

  // Add listing agent/broker
  if (property.assigned_to_user) {
    const broker: Record<string, unknown> = {
      "@type": "RealEstateAgent",
      name: property.assigned_to_user.name,
    };
    if (property.assigned_to_user.username) {
      broker.url = `${baseUrl}/${locale}/agent/${property.assigned_to_user.username}`;
    }
    if (property.assigned_to_user.agentProfile?.publicEmail) {
      broker.email = property.assigned_to_user.agentProfile.publicEmail;
    }
    if (property.assigned_to_user.agentProfile?.publicPhone) {
      broker.telephone = property.assigned_to_user.agentProfile.publicPhone;
    }
    jsonLd.broker = broker;
  }

  // Add seller organization
  jsonLd.seller = {
    "@type": "RealEstateAgent",
    name: orgName,
    url: `${baseUrl}/${locale}/${orgSlug}`,
  };

  // Sanitize the JSON by ensuring all values are safe primitives
  const sanitizedJson = JSON.stringify(jsonLd);

  return (
    <Script
      id="json-ld-property"
      type="application/ld+json"
      strategy="afterInteractive"
    >
      {sanitizedJson}
    </Script>
  );
}
