import { MetadataRoute } from 'next';
import { prismadb } from '@/lib/prisma';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oikion.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages - always include
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  try {
    // Fetch all public agent profiles with their user's username
    const publicProfiles = await prismadb.agentProfile.findMany({
      where: {
        visibility: 'PUBLIC',
        // Only include profiles where user has a username
        Users: {
          username: { not: null },
        },
      },
      select: {
        updatedAt: true,
        Users: {
          select: {
            username: true,
          },
        },
      },
    });

    // Fetch all public agency profiles
    const publicAgencies = await prismadb.agencyProfile.findMany({
      where: {
        visibility: 'PUBLIC',
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    // Fetch all public properties
    const publicProperties = await prismadb.properties.findMany({
      where: {
        visibility: 'PUBLIC',
        property_status: 'ACTIVE',
      },
      select: {
        id: true,
        friendlyId: true,
        updatedAt: true,
      },
    });

    // Generate agent profile URLs using username
    const agentUrls: MetadataRoute.Sitemap = publicProfiles
      .filter((profile) => profile.Users?.username)
      .map((profile) => ({
        url: `${baseUrl}/en/agent/${profile.Users?.username}`,
        lastModified: profile.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      }));

    // Generate Greek locale agent profile URLs
    const agentUrlsGreek: MetadataRoute.Sitemap = publicProfiles
      .filter((profile) => profile.Users?.username)
      .map((profile) => ({
        url: `${baseUrl}/el/agent/${profile.Users?.username}`,
        lastModified: profile.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      }));

    // Generate agency profile URLs
    const agencyUrls: MetadataRoute.Sitemap = publicAgencies.map((agency) => ({
      url: `${baseUrl}/en/agency/${agency.slug}`,
      lastModified: agency.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Generate Greek locale agency profile URLs
    const agencyUrlsGreek: MetadataRoute.Sitemap = publicAgencies.map((agency) => ({
      url: `${baseUrl}/el/agency/${agency.slug}`,
      lastModified: agency.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Generate property URLs
    const propertyUrls: MetadataRoute.Sitemap = publicProperties.map((property) => ({
      url: `${baseUrl}/en/property/${property.friendlyId}`,
      lastModified: property.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // Generate Greek locale property URLs
    const propertyUrlsGreek: MetadataRoute.Sitemap = publicProperties.map((property) => ({
      url: `${baseUrl}/el/property/${property.friendlyId}`,
      lastModified: property.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [
      ...staticPages,
      ...agentUrls,
      ...agentUrlsGreek,
      ...agencyUrls,
      ...agencyUrlsGreek,
      ...propertyUrls,
      ...propertyUrlsGreek,
    ];
  } catch (error) {
    // If database is not accessible, return only static pages
    console.warn('sitemap: Could not fetch dynamic content, returning static pages only');
    return staticPages;
  }
}
