import { getAgentProfileBySlug } from "@/actions/social/profile";
import { notFound } from "next/navigation";
import { AgentProfileViewClient } from "./components/AgentProfileViewClient";
import { Metadata } from "next";
import { prismadb } from "@/lib/prisma";
import Script from "next/script";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com/app";

// Force dynamic rendering to prevent window access during static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface AgentPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

// Generate static params for ISR optimization
// Note: [slug] route parameter now represents the username
export async function generateStaticParams() {
  try {
    const profiles = await prismadb.agentProfile.findMany({
      where: {
        visibility: "PUBLIC",
        Users: {
          username: { not: null },
        },
      },
      select: {
        Users: {
          select: {
            username: true,
          },
        },
      },
    });

    // Generate for both locales using username as the slug param
    const params: { slug: string; locale: string }[] = [];
    for (const profile of profiles) {
      if (profile.Users?.username) {
        params.push({ slug: profile.Users.username, locale: "en" });
        params.push({ slug: profile.Users.username, locale: "el" });
      }
    }

    return params;
  } catch (error) {
    // Return empty array if database is not accessible during build
    // Pages will be generated on-demand at runtime
    console.warn("generateStaticParams: Could not fetch agent profiles, will use dynamic rendering");
    return [];
  }
}

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  // slug is now the username
  const profile = await getAgentProfileBySlug(slug);

  if (!profile) {
    return {
      title: "Agent Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Use username for canonical URL
  const username = profile.user?.username || slug;
  const canonicalUrl = `${baseUrl}/${locale}/agent/${username}`;
  const description =
    profile.bio?.slice(0, 160) ||
    `View ${profile.user?.name}'s real estate listings and contact information. ${
      profile.specializations?.length
        ? `Specializing in ${profile.specializations.slice(0, 3).join(", ")}.`
        : ""
    }`;

  return {
    title: `${profile.user?.name} | Real Estate Agent | Oikion`,
    description,
    keywords: [
      "real estate agent",
      "μεσιτικό γραφείο",
      "κτηματομεσίτης",
      profile.user?.name || "",
      profile.user?.username || "",
      ...(profile.serviceAreas || []),
      ...(profile.specializations || []),
    ].filter(Boolean),
    authors: [{ name: profile.user?.name || "Agent" }],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/agent/${username}`,
        el: `${baseUrl}/el/agent/${username}`,
      },
    },
    openGraph: {
      type: "profile",
      title: `${profile.user?.name} | Real Estate Agent`,
      description,
      url: canonicalUrl,
      siteName: "Oikion",
      images: profile.user?.avatar
        ? [
            {
              url: profile.user.avatar,
              width: 400,
              height: 400,
              alt: `${profile.user?.name} - Real Estate Agent`,
            },
          ]
        : [],
      locale: locale === "el" ? "el_GR" : "en_US",
    },
    twitter: {
      card: "summary",
      title: `${profile.user?.name} | Real Estate Agent`,
      description,
      images: profile.user?.avatar ? [profile.user.avatar] : [],
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

// Generate JSON-LD structured data for real estate agent
function generateJsonLd(profile: any, locale: string) {
  const username = profile.user?.username || profile.slug;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: profile.user?.name,
    description: profile.bio || `Real estate professional`,
    url: `${baseUrl}/${locale}/agent/${username}`,
    image: profile.user?.avatar || undefined,
    email: profile.publicEmail || undefined,
    telephone: profile.publicPhone || undefined,
    areaServed: profile.serviceAreas?.map((area: string) => ({
      "@type": "Place",
      name: area,
    })),
    knowsLanguage: profile.languages?.map((lang: string) => lang) || [],
    ...(profile.yearsExperience && {
      experienceInPlaceOfWork: `${profile.yearsExperience} years`,
    }),
    ...(profile.socialLinks && {
      sameAs: Object.values(profile.socialLinks as Record<string, string>).filter(
        Boolean
      ),
    }),
  };

  return JSON.stringify(jsonLd);
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { slug, locale } = await params;
  // slug is now the username
  const profile = await getAgentProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  return (
    <>
      <Script
        id="json-ld-agent"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: generateJsonLd(profile, locale) }}
      />
      <AgentProfileViewClient profile={profile} locale={locale} />
    </>
  );
}
