import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })
  return {
    title: `${t('legal.terms.title')} | Oikion`,
    description: t('legal.terms.subtitle'),
  }
}

export default async function TermsOfServicePage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t('legal.terms.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('legal.terms.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {t('legal.common.lastUpdated')}: {t('legal.common.lastUpdatedDate')}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the Oikion platform, you agree to comply with and be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Oikion provides a comprehensive real estate management platform that includes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Property management and listing tools</li>
            <li>Client relationship management (CRM) system</li>
            <li>Analytics and reporting capabilities</li>
            <li>Document management and storage</li>
            <li>Integration with MLS and other real estate services</li>
            <li>Mobile applications and web access</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">User Eligibility</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            To use Oikion, you must:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Be at least 18 years of age</li>
            <li>Be a licensed real estate professional (where applicable)</li>
            <li>Provide accurate and complete information</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not be prohibited from using our services under applicable law</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">User Responsibilities</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            As a user of Oikion, you agree to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Maintain accurate and up-to-date account information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Use the platform only for lawful business purposes</li>
            <li>Comply with all applicable real estate laws and regulations</li>
            <li>Respect intellectual property rights of others</li>
            <li>Not attempt to gain unauthorized access to our systems</li>
            <li>Report any security vulnerabilities or breaches</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Prohibited Uses</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You may not use Oikion to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Violate laws, regulations, or third-party rights</li>
            <li>Transmit harmful, offensive, or inappropriate content</li>
            <li>Interfere with or disrupt our services or servers</li>
            <li>Attempt to reverse-engineer or copy our software</li>
            <li>Use automated systems to access our platform without permission</li>
            <li>Impersonate others or provide false information</li>
            <li>Engage in fraudulent or deceptive practices</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of the content you upload. Oikion and its licensors own all intellectual property 
            rights in the platform. You are responsible for data accuracy and compliance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Subscription and Billing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We offer various subscription plans with different pricing. Charges are billed in advance and generally 
            non-refundable. You must maintain valid payment information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            Either party may terminate these Terms. Upon termination, access ceases and data retention follows 
            the guidelines in our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimers and Limitations</h2>
          <p className="text-muted-foreground leading-relaxed">
            We strive to provide reliable service but cannot guarantee 100% uptime. While we make reasonable efforts 
            to ensure data accuracy, we cannot guarantee the accuracy of MLS data, market information, or other 
            third-party data. To the maximum extent permitted by law, Oikion will not be liable for any indirect, 
            incidental, special, or consequential damages arising from your use of our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these terms, please contact us:
          </p>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Email:</strong> {t('legal.common.email')}
          </p>
        </section>
      </div>
    </div>
  )
}



