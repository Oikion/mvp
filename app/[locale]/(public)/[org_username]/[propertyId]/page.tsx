import {
  getPublicPropertyByOrg,
  getOrganizationsWithPublicProperties,
  getPublicPropertiesByOrg,
} from "@/actions/mls/get-public-property-by-org";
import { notFound } from "next/navigation";
import { PublicPropertyView } from "../../property/[propertyId]/components/PublicPropertyView";
import { Metadata } from "next";
import { PropertyJsonLd } from "./components/PropertyJsonLd";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com/app";

// Force dynamic rendering to prevent window access during static generation
export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface OrgPropertyPageProps {
  params: Promise<{ org_username: string; propertyId: string; locale: string }>;
}

// Generate static params for ISR optimization
export async function generateStaticParams() {
  // Skip DB queries during build when using direct connection (--no-engine build).
  // The no-engine Prisma client requires prisma:// or prisma+postgres:// protocol.
  // On Vercel, DATABASE_URL will be the Accelerate URL so this will run normally.
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.startsWith("prisma://") && !dbUrl.startsWith("prisma+postgres://")) {
    return [];
  }

  try {
    const organizations = await getOrganizationsWithPublicProperties();
    const params: { org_username: string; propertyId: string; locale: string }[] = [];

    for (const org of organizations) {
      const { properties } = await getPublicPropertiesByOrg(org.slug, { limit: 50 });

      for (const property of properties) {
        params.push({ org_username: org.slug, propertyId: property.id, locale: "en" });
        params.push({ org_username: org.slug, propertyId: property.id, locale: "el" });
      }
    }

    return params;
  } catch (error) {
    // Return empty array if database is not accessible during build
    // Pages will be generated on-demand at runtime
    console.warn(
      "generateStaticParams: Could not fetch properties, will use dynamic rendering"
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: OrgPropertyPageProps): Promise<Metadata> {
  const { org_username, propertyId, locale } = await params;
  const property = await getPublicPropertyByOrg(org_username, propertyId);

  if (!property) {
    return {
      title: "Property Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const canonicalUrl = `${baseUrl}/${locale}/${org_username}/${propertyId}`;

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

  const orgName = property.organization?.name || org_username;

  return {
    title: `${property.property_name} | ${orgName} | Oikion`,
    description: property.description || description,
    keywords: [
      "real estate",
      "ακίνητα",
      "μεσιτικό γραφείο",
      property.property_type || "",
      property.address_city || "",
      property.municipality || "",
      orgName,
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/${org_username}/${propertyId}`,
        el: `${baseUrl}/el/${org_username}/${propertyId}`,
      },
    },
    openGraph: {
      type: "website",
      title: `${property.property_name} | ${orgName}`,
      description: property.description || description,
      url: canonicalUrl,
      siteName: "Oikion",
      images: property.linkedDocuments?.[0]?.document_file_url
        ? [
            {
              url: property.linkedDocuments[0].document_file_url,
              width: 1200,
              height: 630,
              alt: property.property_name,
            },
          ]
        : [],
      locale: locale === "el" ? "el_GR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.property_name} | ${orgName}`,
      description: property.description || description,
      images: property.linkedDocuments?.[0]?.document_file_url
        ? [property.linkedDocuments[0].document_file_url]
        : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

export default async function OrgPropertyPage({ params }: OrgPropertyPageProps) {
  const { org_username, propertyId, locale } = await params;
  const property = await getPublicPropertyByOrg(org_username, propertyId);

  if (!property) {
    notFound();
  }

  return (
    <>
      <PropertyJsonLd property={property} orgSlug={org_username} locale={locale} />
      <PublicPropertyView property={property} />
    </>
  );
}
