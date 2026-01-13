import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

interface DealProposedEmailProps {
  recipientName: string;
  proposerName: string;
  dealId: string;
  dealTitle?: string;
  propertyName: string;
  clientName: string;
  userLanguage: string;
}

const translations = {
  en: {
    preview: (proposer: string) => `${proposer} proposed a new deal`,
    badge: "New Deal Proposal",
    title: "New Deal Proposal",
    subtitle: "Review and respond to this opportunity",
    greeting: (name: string) => `Hello ${name},`,
    intro: (proposer: string) => `${proposer} has proposed a new deal on Oikion that requires your attention.`,
    dealDetails: "Deal Details",
    propertyLabel: "Property",
    clientLabel: "Client",
    ctaButton: "View Deal",
    altLink: "Or view at:",
    footer: "You're receiving this because a deal was proposed to you.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (proposer: string) => `Ο/Η ${proposer} πρότεινε μια νέα συμφωνία`,
    badge: "Νέα Πρόταση Συμφωνίας",
    title: "Νέα Πρόταση Συμφωνίας",
    subtitle: "Εξετάστε και απαντήστε σε αυτή την ευκαιρία",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (proposer: string) => `Ο/Η ${proposer} πρότεινε μια νέα συμφωνία στο Oikion που απαιτεί την προσοχή σας.`,
    dealDetails: "Λεπτομέρειες Συμφωνίας",
    propertyLabel: "Ακίνητο",
    clientLabel: "Πελάτης",
    ctaButton: "Προβολή Συμφωνίας",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή σας προτάθηκε μια συμφωνία.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (proposer: string) => `${proposer} navrhl nový obchod`,
    badge: "Nový Návrh Obchodu",
    title: "Nový Návrh Obchodu",
    subtitle: "Zkontrolujte a reagujte na tuto příležitost",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (proposer: string) => `${proposer} navrhl nový obchod na Oikionu, který vyžaduje vaši pozornost.`,
    dealDetails: "Detaily Obchodu",
    propertyLabel: "Nemovitost",
    clientLabel: "Klient",
    ctaButton: "Zobrazit Obchod",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože vám byl navržen obchod.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const DealProposedEmail = ({
  recipientName,
  proposerName,
  dealId,
  dealTitle,
  propertyName,
  clientName,
  userLanguage,
}: DealProposedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const dealUrl = `${baseUrl}/app/deals/${dealId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(proposerName)}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                  🤝 {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(proposerName)}
              </Text>

              {/* Deal Details */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.dealDetails}
                </Text>

                {dealTitle && (
                  <Section className="mb-4">
                    <Text className="text-zinc-900 text-lg font-semibold m-0">
                      {dealTitle}
                    </Text>
                  </Section>
                )}

                <Section className="mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.propertyLabel}
                  </Text>
                  <Text className="text-zinc-900 text-sm font-medium m-0">
                    🏠 {propertyName}
                  </Text>
                </Section>

                <Section>
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.clientLabel}
                  </Text>
                  <Text className="text-zinc-900 text-sm font-medium m-0">
                    👤 {clientName}
                  </Text>
                </Section>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={dealUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={dealUrl} className="text-blue-600 text-xs underline break-all">
                  {dealUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer} {t.footerNote}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default DealProposedEmail;
