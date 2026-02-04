import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })
  return {
    title: `${t('legal.gdpr.title')} | Oikion`,
    description: t('legal.gdpr.subtitle'),
  }
}

export default async function GDPRPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t('legal.gdpr.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('legal.gdpr.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {t('legal.common.lastUpdated')}: {t('legal.common.lastUpdatedDate')}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Commitment to GDPR</h2>
          <p className="text-muted-foreground leading-relaxed">
            As a company operating in the European Union, Oikion is committed to complying with the General Data 
            Protection Regulation (GDPR). This page outlines how we protect your personal data and your rights under GDPR.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Legal Basis for Processing</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We process your personal data based on the following legal grounds:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Contract:</strong> To provide our real estate platform services</li>
            <li><strong className="text-foreground">Legitimate Interest:</strong> To improve our services and prevent fraud</li>
            <li><strong className="text-foreground">Consent:</strong> For marketing communications and optional features</li>
            <li><strong className="text-foreground">Legal Obligation:</strong> To comply with applicable laws and regulations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights Under GDPR</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Under GDPR, you have the following rights regarding your personal data:
          </p>
          
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right of Access</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to know what personal data we hold about you and to request a copy of that data.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Rectification</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to correct any inaccurate or incomplete personal data we hold about you.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Erasure</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to request deletion of your personal data in certain circumstances.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Restrict Processing</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to request that we restrict how we use your personal data in certain situations.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Data Portability</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to receive your personal data in a structured, commonly used format and transfer it to another service provider.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Object</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to object to the processing of your personal data in certain circumstances.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Right to Withdraw Consent</h3>
              <p className="text-muted-foreground text-sm">
                Where processing is based on consent, you have the right to withdraw your consent at any time.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">How to Exercise Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            To exercise any of your rights under GDPR, you can:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Email us at: {t('legal.common.email')}</li>
            <li>Use the data protection tools in your account settings</li>
            <li>Submit a request through our support system</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Data Security Measures</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and assessments</li>
            <li>Access controls and authentication</li>
            <li>Staff training on data protection</li>
            <li>Incident response procedures</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We retain personal data only for as long as necessary:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Account data:</strong> As long as your account is active plus 3 years</li>
            <li><strong className="text-foreground">Transaction data:</strong> 7 years for tax and regulatory purposes</li>
            <li><strong className="text-foreground">Marketing data:</strong> Until you opt out or 2 years of inactivity</li>
            <li><strong className="text-foreground">Analytics data:</strong> Aggregated data retained for up to 5 years</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Data Breach Notification</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            In case of a data breach that risks your rights and freedoms, we will:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Notify the relevant supervisory authority within 72 hours</li>
            <li>Inform affected individuals without undue delay</li>
            <li>Provide clear information about the breach and our response</li>
            <li>Take immediate steps to contain and remediate the breach</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For all data protection questions and to exercise your rights under GDPR:
          </p>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Email:</strong> {t('legal.common.email')}
          </p>
        </section>
      </div>
    </div>
  )
}



