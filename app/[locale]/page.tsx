import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { LandingPageClient } from '@/components/website/landing/landing-page-client'

// JSON-LD schemas — static, hardcoded strings (no user input), safe for inline script
const ORG_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Oikion',
  url: 'https://oikion.com',
  logo: 'https://oikion.com/assets/logos/logo-dark.svg',
  description: 'The unified platform for Greek real estate professionals. CRM, MLS, and intelligent agent matchmaking.',
  foundingDate: '2025',
  founders: [
    { '@type': 'Person', name: 'Stavros' },
    { '@type': 'Person', name: 'Alex' },
    { '@type': 'Person', name: 'Nikos' },
  ],
  areaServed: { '@type': 'Country', name: 'Greece' },
})

const PAGE_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Oikion — The platform for Greek real estate agents',
  description: 'One platform for your clients, your listings, and the agent network you never had.',
  url: 'https://oikion.com',
  inLanguage: ['el', 'en'],
  isPartOf: { '@type': 'WebSite', name: 'Oikion', url: 'https://oikion.com' },
})

const APP_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Oikion',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Open Beta — Free during beta period',
  },
  featureList: [
    'CRM for real estate agents',
    'MLS property management',
    'Agent network and matchmaking',
    'Bilateral listing sharing',
    'Market alerts and notifications',
  ],
})

/**
 * Root landing page for the website.
 * Accessible at /:locale/ (e.g., /en/, /el/)
 * The app is served at /:locale/app/
 *
 * Architecture: Server-rendered shell with dynamically imported client sections.
 * Hero + Nav + Cursor load statically; everything below the fold is code-split.
 */
export default function HomePage() {
  return (
    <>
      <LandingPageClient />

      {/* Structured data for SEO/AEO — all static, no user input */}
      <script type="application/ld+json" suppressHydrationWarning>{ORG_SCHEMA}</script>
      <script type="application/ld+json" suppressHydrationWarning>{PAGE_SCHEMA}</script>
      <script type="application/ld+json" suppressHydrationWarning>{APP_SCHEMA}</script>
    </>
  )
}

/**
 * SEO metadata — async, uses translations for locale-aware meta tags.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oikion.com'

  return {
    title: t('seo.title'),
    description: t('seo.description'),
    keywords: [
      'Greek real estate',
      'real estate CRM',
      'MLS Greece',
      'agent matchmaking',
      'property management',
      'Oikion',
      'κτηματομεσίτες',
      'ακίνητα Ελλάδα',
      'μεσιτικό λογισμικό',
    ],
    authors: [{ name: 'Oikion' }],
    creator: 'Oikion',
    publisher: 'Oikion',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'el' ? 'el_GR' : 'en_US',
      alternateLocale: locale === 'el' ? 'en_US' : 'el_GR',
      url: `${baseUrl}/${locale}`,
      siteName: 'Oikion',
      title: t('seo.ogTitle'),
      description: t('seo.ogDescription'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('seo.ogTitle'),
      description: t('seo.ogDescription'),
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'el': `${baseUrl}/el`,
        'en': `${baseUrl}/en`,
        'x-default': `${baseUrl}/el`,
      },
    },
    metadataBase: new URL(baseUrl),
  }
}
