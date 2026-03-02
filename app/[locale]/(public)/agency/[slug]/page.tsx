import { auth } from "@clerk/nextjs/server";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicAgencyProfile } from "@/actions/organization/agency-profile";
import { AgencyProfileView } from "./components/AgencyProfileView";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface AgencyPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: AgencyPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const profile = await getPublicAgencyProfile(slug, false);

  if (!profile) {
    return {
      title: "Agency Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${baseUrl}/${locale}/agency/${profile.slug}`;
  const description =
    profile.description?.slice(0, 160) ||
    `${profile.name} - Real estate agency`;

  return {
    title: `${profile.name} | Real Estate Agency | Oikion`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/agency/${profile.slug}`,
        el: `${baseUrl}/el/agency/${profile.slug}`,
      },
    },
    openGraph: {
      type: "website",
      title: `${profile.name} | Real Estate Agency`,
      description,
      url: canonicalUrl,
      siteName: "Oikion",
      images: profile.logo
        ? [{ url: profile.logo, width: 400, height: 400, alt: profile.name }]
        : [],
      locale: locale === "el" ? "el_GR" : "en_US",
    },
    robots: { index: true, follow: true },
  };
}

function buildJsonLd(profile: NonNullable<Awaited<ReturnType<typeof getPublicAgencyProfile>>>) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: profile.name,
    description: profile.description ?? undefined,
    url: `${baseUrl}/agency/${profile.slug}`,
    image: profile.logo ?? undefined,
    email: profile.email ?? undefined,
    telephone: profile.phone ?? undefined,
    address:
      profile.address || profile.city
        ? {
            "@type": "PostalAddress",
            streetAddress: profile.address ?? undefined,
            addressLocality: profile.city ?? undefined,
            addressRegion: profile.region ?? undefined,
            postalCode: profile.postalCode ?? undefined,
            addressCountry: profile.country ?? undefined,
          }
        : undefined,
  };
}

export default async function AgencyPage({ params }: AgencyPageProps) {
  const { slug, locale } = await params;
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  const profile = await getPublicAgencyProfile(slug, isAuthenticated);

  if (!profile) {
    notFound();
  }

  const jsonLdString = JSON.stringify(buildJsonLd(profile));

  return (
    <>
      <Script
        id="json-ld-agency"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />
      <AgencyProfileView profile={profile} locale={locale} />
    </>
  );
}
