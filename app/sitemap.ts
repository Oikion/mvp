import { MetadataRoute } from 'next';
import { prismadb } from '@/lib/prisma';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oikion.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all public agent profiles with their user's username
  const publicProfiles = await prismadb.agentProfile.findMany({
    where: {
      visibility: 'PUBLIC',
      // Only include profiles where user has a username
      user: {
        username: { not: null },
      },
    },
    select: {
      updatedAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  // Fetch all public properties
  const publicProperties = await prismadb.properties.findMany({
    where: {
      portal_visibility: 'PUBLIC',
      property_status: 'ACTIVE',
    },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  // Generate agent profile URLs using username
  const agentUrls: MetadataRoute.Sitemap = publicProfiles
    .filter((profile) => profile.user.username)
    .map((profile) => ({
      url: `${baseUrl}/en/agent/${profile.user.username}`,
      lastModified: profile.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  // Generate Greek locale agent profile URLs
  const agentUrlsGreek: MetadataRoute.Sitemap = publicProfiles
    .filter((profile) => profile.user.username)
    .map((profile) => ({
      url: `${baseUrl}/el/agent/${profile.user.username}`,
      lastModified: profile.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  // Generate property URLs
  const propertyUrls: MetadataRoute.Sitemap = publicProperties.map((property) => ({
    url: `${baseUrl}/en/property/${property.id}`,
    lastModified: property.updatedAt || new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Generate Greek locale property URLs
  const propertyUrlsGreek: MetadataRoute.Sitemap = publicProperties.map((property) => ({
    url: `${baseUrl}/el/property/${property.id}`,
    lastModified: property.updatedAt || new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  return [
    ...staticPages,
    ...agentUrls,
    ...agentUrlsGreek,
    ...propertyUrls,
    ...propertyUrlsGreek,
  ];
}
