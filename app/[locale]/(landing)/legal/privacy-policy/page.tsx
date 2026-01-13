import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })
  return {
    title: `${t('legal.privacy.title')} | Oikion`,
    description: t('legal.privacy.subtitle'),
  }
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t('legal.privacy.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('legal.privacy.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {t('legal.common.lastUpdated')}: {t('legal.common.lastUpdatedDate')}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            At Oikion, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            real estate management platform and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">Personal Information</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Name, email address, and contact information</li>
            <li>Professional license numbers and certifications</li>
            <li>Business information and brokerage details</li>
            <li>Payment and billing information</li>
            <li>Property listings and client data you enter into our system</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Automatically Collected Information</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We automatically collect certain information when you use our services:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Device information and IP addresses</li>
            <li>Usage patterns and feature interactions</li>
            <li>Browser type and operating system</li>
            <li>Log files and performance metrics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We use the collected information to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Provide and maintain our real estate management services</li>
            <li>Process transactions and manage your account</li>
            <li>Communicate with you about updates and support</li>
            <li>Improve our platform and develop new features</li>
            <li>Comply with legal obligations and prevent fraud</li>
            <li>Send marketing communications (with your consent)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Data Security</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We implement industry-standard security measures to protect your information:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and penetration testing</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure data centers with physical and digital protections</li>
            <li>Employee training on data protection practices</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Depending on your location, you may have the following rights:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your personal information</li>
            <li>Restrict processing activities</li>
            <li>Data portability</li>
            <li>Object to certain processing activities</li>
            <li>Withdraw consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about this privacy policy, please contact us:
          </p>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Email:</strong> {t('legal.common.email')}
          </p>
        </section>
      </div>
    </div>
  )
}



