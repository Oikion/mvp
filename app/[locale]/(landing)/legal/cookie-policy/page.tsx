import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })
  return {
    title: `${t('legal.cookies.title')} | Oikion`,
    description: t('legal.cookies.subtitle'),
  }
}

export default async function CookiePolicyPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t('legal.cookies.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('legal.cookies.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {t('legal.common.lastUpdated')}: {t('legal.common.lastUpdatedDate')}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">What Are Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files that are placed on your device when you visit our website. They help us 
            provide you with a better experience by remembering your preferences and understanding how you use our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We use cookies for various purposes:
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">Essential Cookies</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Required for the platform to function properly:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Authentication cookies to keep you logged in</li>
            <li>Security cookies for fraud protection</li>
            <li>Load balancing cookies for optimal performance</li>
            <li>Cookie consent preferences</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Functional Cookies</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Enhance your experience by remembering your preferences:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Language and region preferences</li>
            <li>Theme and display settings</li>
            <li>Dashboard layout customizations</li>
            <li>Recently viewed properties</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Analytics Cookies</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Help us understand how you use our platform:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Google Analytics for usage statistics</li>
            <li>Performance tracking and error detection</li>
            <li>Feature usage analytics</li>
            <li>A/B testing and optimization</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Marketing Cookies</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Used to deliver relevant advertisements:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Social media integration cookies</li>
            <li>Advertising network cookies</li>
            <li>Conversion tracking pixels</li>
            <li>Remarketing and retargeting cookies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our platform may use third-party services that set their own cookies:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Google Services:</strong> Maps, Analytics, and advertising</li>
            <li><strong className="text-foreground">MLS Providers:</strong> Property data and listing services</li>
            <li><strong className="text-foreground">Payment Processors:</strong> Stripe, PayPal for billing</li>
            <li><strong className="text-foreground">Support Tools:</strong> Customer service and chat features</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Managing Your Cookie Preferences</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">Browser Settings</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You can control cookies through your browser settings:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Block all cookies (may affect website functionality)</li>
            <li>Delete existing cookies</li>
            <li>Set preferences for specific websites</li>
            <li>Receive notifications when cookies are set</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Browser-Specific Instructions</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Chrome:</strong> Settings → Privacy and Security → Cookies</li>
            <li><strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security → Cookies</li>
            <li><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong className="text-foreground">Edge:</strong> Settings → Cookies and site permissions</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Impact of Disabling Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Disabling certain cookies may affect your experience:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>You may need to log in more frequently</li>
            <li>Your preferences may not be saved</li>
            <li>Some features may not work correctly</li>
            <li>You may see less relevant content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about our cookie policy, please contact us:
          </p>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Email:</strong> {t('legal.common.email')}
          </p>
        </section>
      </div>
    </div>
  )
}



