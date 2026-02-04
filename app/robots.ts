import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oikion.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/agent/', // Allow all public agent profile pages
          '/property/', // Allow all public property pages
        ],
        disallow: [
          '/api/', // Block API routes
          '/admin/', // Block admin routes
          '/mls/', // Block internal MLS routes
          '/crm/', // Block internal CRM routes
          '/profile/', // Block internal profile management
          '/settings/', // Block settings
          '/calendar/', // Block calendar
          '/documents/', // Block documents
          '/connections/', // Block connections
          '/shared-with-me/', // Block shared items
          '/deals/', // Block deals
          '/social-feed/', // Block social feed
          '/feed/', // Block feed
          '/employees/', // Block employees
          '/reports/', // Block reports
          '/book/', // Block booking (unless made public)
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}












