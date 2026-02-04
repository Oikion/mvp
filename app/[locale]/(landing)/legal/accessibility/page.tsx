import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })
  return {
    title: `${t('legal.accessibility.title')} | Oikion`,
    description: t('legal.accessibility.subtitle'),
  }
}

export default async function AccessibilityPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'website' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t('legal.accessibility.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('legal.accessibility.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {t('legal.common.lastUpdated')}: {t('legal.common.lastUpdatedDate')}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Commitment</h2>
          <p className="text-muted-foreground leading-relaxed">
            Oikion is committed to ensuring digital accessibility for people with disabilities. We are continually 
            improving the user experience for everyone and applying the relevant accessibility standards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Conformance Status</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to 
            improve accessibility for people with disabilities. We aim to conform to WCAG 2.1 Level AA standards.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We are currently working towards achieving full WCAG 2.1 Level AA conformance. As we continue to develop 
            and enhance our platform, accessibility remains a core consideration in our design and development processes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Accessibility Features</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our platform includes the following accessibility features:
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">Navigation & Structure</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Consistent navigation throughout the site</li>
            <li>Skip navigation links to bypass repetitive content</li>
            <li>Logical heading structure for screen readers</li>
            <li>Keyboard navigation support for all interactive elements</li>
            <li>Focus indicators visible when navigating with keyboard</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Visual Design</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Color contrast ratios meeting WCAG AA standards</li>
            <li>Text resizing support without loss of functionality</li>
            <li>Dark mode support for reduced eye strain</li>
            <li>No content that flashes more than three times per second</li>
            <li>Alternative text for meaningful images</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Forms & Interactions</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>Clearly labeled form fields</li>
            <li>Error messages associated with relevant form inputs</li>
            <li>Success and error states clearly communicated</li>
            <li>Sufficient time to complete tasks</li>
            <li>No automatic time-outs without warning</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">Screen Reader Support</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>ARIA labels and landmarks for improved navigation</li>
            <li>Dynamic content updates announced to screen readers</li>
            <li>Tables with proper headers and relationships</li>
            <li>Links and buttons with descriptive text</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Technologies Used</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Accessibility of Oikion relies on the following technologies:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>HTML5</li>
            <li>CSS3</li>
            <li>JavaScript</li>
            <li>WAI-ARIA (Web Accessibility Initiative - Accessible Rich Internet Applications)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            These technologies are relied upon for conformance with the accessibility standards used.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Compatibility</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Oikion is designed to be compatible with:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Latest versions of major browsers (Chrome, Firefox, Safari, Edge)</li>
            <li>Screen readers including JAWS, NVDA, and VoiceOver</li>
            <li>Voice recognition software</li>
            <li>Screen magnification software</li>
            <li>Mobile assistive technologies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Known Limitations</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Despite our best efforts, some content may have limitations:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Some third-party content or integrations may not be fully accessible</li>
            <li>PDF documents uploaded by users may not be accessible</li>
            <li>Some complex data visualizations may have limited alternative text</li>
            <li>Legacy content may not meet current standards</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We are actively working to address these limitations and improve accessibility across all areas of our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Assessment Methods</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We assess accessibility through:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Automated testing tools</li>
            <li>Manual testing with assistive technologies</li>
            <li>User feedback and testing</li>
            <li>Periodic third-party audits</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Feedback & Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            We welcome your feedback on the accessibility of Oikion. If you encounter any accessibility barriers 
            or have suggestions for improvement, please contact us:
          </p>
          <div className="mt-4 bg-muted/30 rounded-lg p-4">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Email:</strong> {t('legal.common.generalEmail')}
            </p>
            <p className="text-muted-foreground mt-2">
              <strong className="text-foreground">Response time:</strong> We aim to respond within 5 business days
            </p>
          </div>
          <p className="text-muted-foreground leading-relaxed mt-4">
            When reporting accessibility issues, please include:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
            <li>The page URL where you encountered the issue</li>
            <li>A description of the accessibility problem</li>
            <li>The assistive technology and browser you were using</li>
            <li>Any suggestions for improvement</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Continuous Improvement</h2>
          <p className="text-muted-foreground leading-relaxed">
            Accessibility is an ongoing effort at Oikion. We regularly review and update our accessibility practices 
            to ensure we meet or exceed standards and provide an inclusive experience for all users. This statement 
            will be updated as we make improvements and changes to our platform.
          </p>
        </section>
      </div>
    </div>
  )
}



